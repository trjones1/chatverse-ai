-- Daily Chat Streaks System
-- Track user chat activity and celebrate consistent engagement

-- Daily chat activity tracking
CREATE TABLE IF NOT EXISTS daily_chat_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key VARCHAR(50) NOT NULL,
  activity_date DATE NOT NULL,
  message_count INTEGER DEFAULT 1,
  first_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one record per user per character per day
  UNIQUE(user_id, character_key, activity_date)
);

-- User chat streaks summary
CREATE TABLE IF NOT EXISTS user_chat_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key VARCHAR(50) NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_chat_date DATE,
  streak_start_date DATE,
  total_active_days INTEGER DEFAULT 0,
  last_milestone_celebrated INTEGER DEFAULT 0, -- Last streak milestone we celebrated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One streak record per user per character
  UNIQUE(user_id, character_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_chat_activity_user_char_date ON daily_chat_activity(user_id, character_key, activity_date);
CREATE INDEX IF NOT EXISTS idx_daily_chat_activity_date ON daily_chat_activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_user_chat_streaks_user_char ON user_chat_streaks(user_id, character_key);
CREATE INDEX IF NOT EXISTS idx_user_chat_streaks_current_streak ON user_chat_streaks(current_streak);

-- Function to update user streaks
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

-- Function to get streak status for a user
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
  longest_streak := COALESCE(v_streak_data.longest_streak, 0);
  total_active_days := COALESCE(v_streak_data.total_active_days, 0);
  last_chat_date := v_streak_data.last_chat_date;
  streak_start_date := v_streak_data.streak_start_date;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE daily_chat_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chat_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own chat activity" ON daily_chat_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own streaks" ON user_chat_streaks
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all data
CREATE POLICY "Service role can manage daily_chat_activity" ON daily_chat_activity
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage user_chat_streaks" ON user_chat_streaks
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON daily_chat_activity TO authenticated;
GRANT SELECT ON user_chat_streaks TO authenticated;
GRANT ALL ON daily_chat_activity TO service_role;
GRANT ALL ON user_chat_streaks TO service_role;
GRANT EXECUTE ON FUNCTION update_user_chat_streak TO service_role;
GRANT EXECUTE ON FUNCTION get_user_streak_status TO service_role, authenticated;