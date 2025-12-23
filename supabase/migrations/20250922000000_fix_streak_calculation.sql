-- Fix streak calculation function to better handle edge cases and add fallback logic
-- This addresses issues where streaks show 0 even when users have consecutive daily activity

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
BEGIN
  -- Get current streak data
  SELECT
    COALESCE(current_streak, 0) as current_streak,
    COALESCE(longest_streak, 0) as longest_streak,
    COALESCE(total_active_days, 0) as total_active_days,
    last_chat_date,
    streak_start_date
  INTO v_streak_data
  FROM user_chat_streaks
  WHERE user_id = p_user_id AND character_key = p_character_key;

  -- Calculate days since last chat
  days_since_last_chat := COALESCE(v_today - v_streak_data.last_chat_date, 999);

  -- Determine if streak is broken (more than 1 day gap)
  is_streak_broken := days_since_last_chat > 1;

  -- If streak is broken or no data exists, recalculate from daily activity
  IF is_streak_broken OR v_streak_data.current_streak IS NULL THEN
    -- Fallback: Calculate current streak from daily_chat_activity table
    WITH RECURSIVE streak_calc AS (
      -- Start with today if user has activity today
      SELECT activity_date, 1 as streak_length
      FROM daily_chat_activity
      WHERE user_id = p_user_id
        AND character_key = p_character_key
        AND activity_date = v_today

      UNION ALL

      -- Recursively add previous consecutive days
      SELECT dca.activity_date, sc.streak_length + 1
      FROM daily_chat_activity dca
      JOIN streak_calc sc ON dca.activity_date = sc.activity_date - INTERVAL '1 day'
      WHERE dca.user_id = p_user_id
        AND dca.character_key = p_character_key
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO v_calculated_streak
    FROM streak_calc;

    -- If no activity today, try from yesterday
    IF v_calculated_streak = 0 THEN
      WITH RECURSIVE streak_calc_yesterday AS (
        -- Start with yesterday if user has activity yesterday
        SELECT activity_date, 1 as streak_length
        FROM daily_chat_activity
        WHERE user_id = p_user_id
          AND character_key = p_character_key
          AND activity_date = v_yesterday

        UNION ALL

        -- Recursively add previous consecutive days
        SELECT dca.activity_date, sc.streak_length + 1
        FROM daily_chat_activity dca
        JOIN streak_calc_yesterday sc ON dca.activity_date = sc.activity_date - INTERVAL '1 day'
        WHERE dca.user_id = p_user_id
          AND dca.character_key = p_character_key
      )
      SELECT COALESCE(MAX(streak_length), 0) INTO v_calculated_streak
      FROM streak_calc_yesterday;

      -- If we have a streak from yesterday, it's only valid if it's today or yesterday
      IF v_calculated_streak > 0 AND days_since_last_chat <= 1 THEN
        current_streak := v_calculated_streak;
        is_streak_broken := FALSE;
      ELSE
        current_streak := 0;
        is_streak_broken := TRUE;
      END IF;
    ELSE
      current_streak := v_calculated_streak;
      is_streak_broken := FALSE;
    END IF;
  ELSE
    current_streak := COALESCE(v_streak_data.current_streak, 0);
  END IF;

  -- Calculate next milestone
  CASE
    WHEN current_streak < 3 THEN v_next_milestone := 3;
    WHEN current_streak < 7 THEN v_next_milestone := 7;
    WHEN current_streak < 14 THEN v_next_milestone := 14;
    WHEN current_streak < 30 THEN v_next_milestone := 30;
    WHEN current_streak < 50 THEN v_next_milestone := 50;
    WHEN current_streak < 75 THEN v_next_milestone := 75;
    WHEN current_streak < 100 THEN v_next_milestone := 100;
    WHEN current_streak < 365 THEN v_next_milestone := 365;
    ELSE v_next_milestone := 500; -- Beyond yearly
  END CASE;

  next_milestone := v_next_milestone;
  progress_to_next_milestone := CASE
    WHEN v_next_milestone > 0 THEN (current_streak::FLOAT / v_next_milestone::FLOAT) * 100
    ELSE 0
  END;

  -- Return all data
  RETURN QUERY SELECT
    current_streak,
    COALESCE(v_streak_data.longest_streak, 0),
    COALESCE(v_streak_data.total_active_days, 0),
    v_streak_data.last_chat_date,
    v_streak_data.streak_start_date,
    days_since_last_chat,
    is_streak_broken,
    next_milestone,
    progress_to_next_milestone;
END;
$$ LANGUAGE plpgsql;