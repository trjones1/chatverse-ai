-- Fix ambiguous column reference errors in streak calculation function
-- Error: column reference "current_streak" is ambiguous

CREATE OR REPLACE FUNCTION get_user_streak_status(
  p_user_id UUID,
  p_character_key VARCHAR(50)
) RETURNS TABLE(
  current_streak INTEGER,
  longest_streak INTEGER,
  total_active_days INTEGER,
  last_chat_date DATE,
  streak_start_date DATE,
  days_since_last_chat INTEGER,
  is_streak_broken BOOLEAN,
  next_milestone INTEGER,
  progress_to_next_milestone FLOAT
) AS $$
DECLARE
  v_streak_data RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_next_milestone INTEGER;
  v_calculated_streak INTEGER := 0;
  v_current_streak INTEGER := 0;
  v_days_since_last_chat INTEGER;
  v_is_streak_broken BOOLEAN;
  v_next_milestone_val INTEGER;
  v_progress_to_next_milestone FLOAT;
BEGIN
  -- Get current streak data
  SELECT
    COALESCE(ucs.current_streak, 0) as current_streak,
    COALESCE(ucs.longest_streak, 0) as longest_streak,
    COALESCE(ucs.total_active_days, 0) as total_active_days,
    ucs.last_chat_date,
    ucs.streak_start_date
  INTO v_streak_data
  FROM user_chat_streaks ucs
  WHERE ucs.user_id = p_user_id AND ucs.character_key = p_character_key;

  -- Calculate days since last chat
  v_days_since_last_chat := COALESCE(v_today - v_streak_data.last_chat_date, 999);

  -- Determine if streak is broken (more than 1 day gap)
  v_is_streak_broken := v_days_since_last_chat > 1;

  -- If streak is broken or no data exists, recalculate from daily activity
  IF v_is_streak_broken OR v_streak_data.current_streak IS NULL THEN
    -- Fallback: Calculate current streak from daily_chat_activity table
    WITH RECURSIVE streak_calc AS (
      -- Start with today if user has activity today
      SELECT dca.activity_date, 1 as streak_length
      FROM daily_chat_activity dca
      WHERE dca.user_id = p_user_id
        AND dca.character_key = p_character_key
        AND dca.activity_date = v_today

      UNION ALL

      -- Recursively add previous consecutive days
      SELECT dca2.activity_date, sc.streak_length + 1
      FROM daily_chat_activity dca2
      JOIN streak_calc sc ON dca2.activity_date = sc.activity_date - INTERVAL '1 day'
      WHERE dca2.user_id = p_user_id
        AND dca2.character_key = p_character_key
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO v_calculated_streak
    FROM streak_calc;

    -- If no activity today, try from yesterday
    IF v_calculated_streak = 0 THEN
      WITH RECURSIVE streak_calc_yesterday AS (
        -- Start with yesterday if user has activity yesterday
        SELECT dca.activity_date, 1 as streak_length
        FROM daily_chat_activity dca
        WHERE dca.user_id = p_user_id
          AND dca.character_key = p_character_key
          AND dca.activity_date = v_yesterday

        UNION ALL

        -- Recursively add previous consecutive days
        SELECT dca2.activity_date, sc.streak_length + 1
        FROM daily_chat_activity dca2
        JOIN streak_calc_yesterday sc ON dca2.activity_date = sc.activity_date - INTERVAL '1 day'
        WHERE dca2.user_id = p_user_id
          AND dca2.character_key = p_character_key
      )
      SELECT COALESCE(MAX(streak_length), 0) INTO v_calculated_streak
      FROM streak_calc_yesterday;

      -- If we have a streak from yesterday, it's only valid if it's today or yesterday
      IF v_calculated_streak > 0 AND v_days_since_last_chat <= 1 THEN
        v_current_streak := v_calculated_streak;
        v_is_streak_broken := FALSE;
      ELSE
        v_current_streak := 0;
        v_is_streak_broken := TRUE;
      END IF;
    ELSE
      v_current_streak := v_calculated_streak;
      v_is_streak_broken := FALSE;
    END IF;
  ELSE
    v_current_streak := COALESCE(v_streak_data.current_streak, 0);
  END IF;

  -- Calculate next milestone
  CASE
    WHEN v_current_streak < 3 THEN v_next_milestone_val := 3;
    WHEN v_current_streak < 7 THEN v_next_milestone_val := 7;
    WHEN v_current_streak < 14 THEN v_next_milestone_val := 14;
    WHEN v_current_streak < 30 THEN v_next_milestone_val := 30;
    WHEN v_current_streak < 50 THEN v_next_milestone_val := 50;
    WHEN v_current_streak < 75 THEN v_next_milestone_val := 75;
    WHEN v_current_streak < 100 THEN v_next_milestone_val := 100;
    WHEN v_current_streak < 365 THEN v_next_milestone_val := 365;
    ELSE v_next_milestone_val := 500; -- Beyond yearly
  END CASE;

  v_progress_to_next_milestone := CASE
    WHEN v_next_milestone_val > 0 THEN (v_current_streak::FLOAT / v_next_milestone_val::FLOAT) * 100
    ELSE 0
  END;

  -- Return all data using explicit values to avoid ambiguity
  RETURN QUERY SELECT
    v_current_streak,
    COALESCE(v_streak_data.longest_streak, 0),
    COALESCE(v_streak_data.total_active_days, 0),
    v_streak_data.last_chat_date,
    v_streak_data.streak_start_date,
    v_days_since_last_chat,
    v_is_streak_broken,
    v_next_milestone_val,
    v_progress_to_next_milestone;
END;
$$ LANGUAGE plpgsql;