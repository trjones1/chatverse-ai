-- Restore missing update_user_chat_streak function
-- This function was missing from the later migrations and needs to be restored

CREATE OR REPLACE FUNCTION update_user_chat_streak(
  p_user_id UUID,
  p_character_key VARCHAR(50)
) RETURNS TABLE(
  current_streak INTEGER,
  longest_streak INTEGER,
  is_new_milestone BOOLEAN,
  milestone_type VARCHAR(20),
  total_active_days INTEGER
) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_total_active_days INTEGER := 0;
  v_streak_start_date DATE;
  v_last_milestone INTEGER := 0;
  v_is_new_milestone BOOLEAN := FALSE;
  v_milestone_type VARCHAR(20) := '';
BEGIN
  -- First, record today's activity
  INSERT INTO daily_chat_activity (user_id, character_key, activity_date)
  VALUES (p_user_id, p_character_key, v_today)
  ON CONFLICT (user_id, character_key, activity_date)
  DO UPDATE SET
    message_count = daily_chat_activity.message_count + 1,
    last_message_at = now(),
    updated_at = now();

  -- Calculate total active days
  SELECT COUNT(DISTINCT activity_date) INTO v_total_active_days
  FROM daily_chat_activity
  WHERE user_id = p_user_id AND character_key = p_character_key;

  -- Calculate current streak by looking backward from today
  WITH RECURSIVE streak_calc AS (
    -- Start with today
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
  SELECT COALESCE(MAX(streak_length), 0) INTO v_current_streak
  FROM streak_calc;

  -- Calculate streak start date
  v_streak_start_date := v_today - INTERVAL '1 day' * (v_current_streak - 1);

  -- Get existing streak data
  SELECT
    COALESCE(longest_streak, 0),
    COALESCE(last_milestone_celebrated, 0)
  INTO v_longest_streak, v_last_milestone
  FROM user_chat_streaks
  WHERE user_id = p_user_id AND character_key = p_character_key;

  -- Update longest streak if current is higher
  v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

  -- Check for milestone achievements
  -- Celebrate at: 3, 7, 14, 30, 50, 75, 100, 150, 200, 365+ days
  IF v_current_streak >= 3 AND v_last_milestone < 3 THEN
    v_is_new_milestone := TRUE;
    v_milestone_type := 'starter';
    v_last_milestone := 3;
  ELSIF v_current_streak >= 7 AND v_last_milestone < 7 THEN
    v_is_new_milestone := TRUE;
    v_milestone_type := 'week';
    v_last_milestone := 7;
  ELSIF v_current_streak >= 14 AND v_last_milestone < 14 THEN
    v_is_new_milestone := TRUE;
    v_milestone_type := 'dedicated';
    v_last_milestone := 14;
  ELSIF v_current_streak >= 30 AND v_last_milestone < 30 THEN
    v_is_new_milestone := TRUE;
    v_milestone_type := 'committed';
    v_last_milestone := 30;
  ELSIF v_current_streak >= 50 AND v_last_milestone < 50 THEN
    v_is_new_milestone := TRUE;
    v_milestone_type := 'devoted';
    v_last_milestone := 50;
  ELSIF v_current_streak >= 75 AND v_last_milestone < 75 THEN
    v_is_new_milestone := TRUE;
    v_milestone_type := 'legendary';
    v_last_milestone := 75;
  ELSIF v_current_streak >= 100 AND v_last_milestone < 100 THEN
    v_is_new_milestone := TRUE;
    v_milestone_type := 'elite';
    v_last_milestone := 100;
  ELSIF v_current_streak >= 365 AND v_last_milestone < 365 THEN
    v_is_new_milestone := TRUE;
    v_milestone_type := 'eternal';
    v_last_milestone := 365;
  END IF;

  -- Upsert streak record
  INSERT INTO user_chat_streaks (
    user_id,
    character_key,
    current_streak,
    longest_streak,
    last_chat_date,
    streak_start_date,
    total_active_days,
    last_milestone_celebrated
  )
  VALUES (
    p_user_id,
    p_character_key,
    v_current_streak,
    v_longest_streak,
    v_today,
    v_streak_start_date,
    v_total_active_days,
    v_last_milestone
  )
  ON CONFLICT (user_id, character_key)
  DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    last_chat_date = EXCLUDED.last_chat_date,
    streak_start_date = EXCLUDED.streak_start_date,
    total_active_days = EXCLUDED.total_active_days,
    last_milestone_celebrated = EXCLUDED.last_milestone_celebrated,
    updated_at = now();

  -- Return results
  RETURN QUERY SELECT
    v_current_streak,
    v_longest_streak,
    v_is_new_milestone,
    v_milestone_type,
    v_total_active_days;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_chat_streak TO service_role;
GRANT EXECUTE ON FUNCTION update_user_chat_streak TO authenticated;