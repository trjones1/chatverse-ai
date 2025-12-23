-- Rate Limiting Database Setup SQL
-- Run this in Supabase SQL Editor to create the rate limiting infrastructure

-- 1. Create the rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  character TEXT,
  count INTEGER NOT NULL DEFAULT 0,
  violations INTEGER NOT NULL DEFAULT 0,
  reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint
ON rate_limits (user_id, endpoint, character);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time
ON rate_limits (reset_time);

-- 3. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_rate_limits_updated_at ON rate_limits;
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Create the stored procedure for atomic increment operations
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_id TEXT,
  p_user_id TEXT,
  p_endpoint TEXT,
  p_character TEXT,
  p_limit INTEGER,
  p_reset_time TIMESTAMP WITH TIME ZONE
) RETURNS TABLE(count INTEGER, violations INTEGER, blocked_until TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  current_count INTEGER := 0;
  current_violations INTEGER := 0;
  current_blocked TIMESTAMP WITH TIME ZONE := NULL;
BEGIN
  -- Try to increment existing record
  UPDATE rate_limits
  SET count = rate_limits.count + 1, updated_at = NOW()
  WHERE id = p_id AND reset_time > NOW()
  RETURNING rate_limits.count, rate_limits.violations, rate_limits.blocked_until
  INTO current_count, current_violations, current_blocked;

  -- If no existing record, create new one
  IF NOT FOUND THEN
    INSERT INTO rate_limits (id, user_id, endpoint, character, count, violations, reset_time)
    VALUES (p_id, p_user_id, p_endpoint, p_character, 1, 0, p_reset_time)
    ON CONFLICT (id) DO UPDATE SET
      count = 1,
      violations = 0,
      reset_time = p_reset_time,
      updated_at = NOW()
    RETURNING rate_limits.count, rate_limits.violations, rate_limits.blocked_until
    INTO current_count, current_violations, current_blocked;
  END IF;

  -- Return current values
  RETURN QUERY SELECT current_count, current_violations, current_blocked;
END;
$$ LANGUAGE plpgsql;

-- 6. Test the setup
SELECT increment_rate_limit(
  'test_setup',
  'test_user',
  'test',
  'lexi',
  5,
  NOW() + INTERVAL '1 day'
);

-- 7. Clean up test data
DELETE FROM rate_limits WHERE id = 'test_setup';

-- 8. Verify table structure
\d rate_limits;

-- Success message
SELECT 'Rate limiting database infrastructure created successfully!' as status;