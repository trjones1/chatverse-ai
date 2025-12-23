-- Subscription Tiers Schema
-- New tiered subscription system with daily chat limits

-- Daily chat usage tracking for free users
CREATE TABLE IF NOT EXISTS daily_chat_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  chat_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure one record per user per character per day
  UNIQUE(user_id, character_key, date)
);

-- Update user_subscriptions table to include new tier structure
-- First, migrate existing data to new tier values
UPDATE user_subscriptions 
SET tier = CASE 
  WHEN LOWER(tier) IN ('free', 'FREE') THEN 'free'
  WHEN LOWER(tier) IN ('sfw', 'SFW', 'paid', 'basic', 'premium') THEN 'sfw'
  WHEN LOWER(tier) IN ('nsfw', 'NSFW', 'adult', 'unlimited') THEN 'nsfw'
  ELSE 'free'  -- Default fallback for any unknown values
END
WHERE tier NOT IN ('free', 'sfw', 'nsfw');

-- Now apply the constraint
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS valid_tier;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT valid_tier 
CHECK (tier IN ('free', 'sfw', 'nsfw'));

-- Add session management for JWT tokens
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS daily_chat_usage_user_date_idx ON daily_chat_usage(user_id, date DESC);
CREATE INDEX IF NOT EXISTS daily_chat_usage_character_date_idx ON daily_chat_usage(character_key, date DESC);
CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_idx ON user_sessions(expires_at);

-- RLS policies
ALTER TABLE daily_chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat usage
CREATE POLICY "Users can view own chat usage" ON daily_chat_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own chat usage" ON daily_chat_usage
  FOR ALL USING (auth.uid() = user_id);

-- Service role can manage sessions (for token cleanup)
CREATE POLICY "Service can manage sessions" ON user_sessions
  FOR ALL USING (true);

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Function to check daily chat limit for free users
CREATE OR REPLACE FUNCTION check_daily_chat_limit(
  p_user_id uuid,
  p_character_key text,
  p_daily_limit integer DEFAULT 5
)
RETURNS TABLE (
  can_chat boolean,
  current_count integer,
  limit_reached boolean
) AS $$
DECLARE
  current_usage integer := 0;
  user_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT tier INTO user_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id 
    AND character_key = p_character_key
    AND status IN ('active', 'trialing')
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- If user has paid tier, they can always chat
  IF user_tier IN ('sfw', 'nsfw') THEN
    RETURN QUERY SELECT true, 0, false;
    RETURN;
  END IF;
  
  -- For free users, check daily limit
  SELECT COALESCE(chat_count, 0) INTO current_usage
  FROM daily_chat_usage
  WHERE user_id = p_user_id 
    AND character_key = p_character_key
    AND date = CURRENT_DATE;
  
  RETURN QUERY SELECT 
    current_usage < p_daily_limit,
    current_usage,
    current_usage >= p_daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment daily chat count
CREATE OR REPLACE FUNCTION increment_daily_chat_count(
  p_user_id uuid,
  p_character_key text
)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO daily_chat_usage (user_id, character_key, date, chat_count, updated_at)
  VALUES (p_user_id, p_character_key, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, character_key, date)
  DO UPDATE SET 
    chat_count = daily_chat_usage.chat_count + 1,
    updated_at = NOW()
  RETURNING chat_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create/refresh JWT session
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id uuid,
  p_session_token text,
  p_expires_hours integer DEFAULT 24
)
RETURNS boolean AS $$
BEGIN
  -- Clean up expired sessions for this user
  DELETE FROM user_sessions 
  WHERE user_id = p_user_id 
    AND expires_at < NOW();
  
  -- Create new session
  INSERT INTO user_sessions (user_id, session_token, expires_at)
  VALUES (
    p_user_id, 
    p_session_token, 
    NOW() + INTERVAL '1 hour' * p_expires_hours
  )
  ON CONFLICT (session_token)
  DO UPDATE SET
    expires_at = NOW() + INTERVAL '1 hour' * p_expires_hours,
    last_used_at = NOW();
    
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session token
CREATE OR REPLACE FUNCTION validate_session_token(p_session_token text)
RETURNS TABLE (
  user_id uuid,
  is_valid boolean
) AS $$
BEGIN
  -- Update last_used_at and return user info if valid
  RETURN QUERY
  UPDATE user_sessions 
  SET last_used_at = NOW()
  WHERE session_token = p_session_token 
    AND expires_at > NOW()
  RETURNING user_sessions.user_id, true;
  
  -- If no rows updated, session is invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comprehensive subscription entitlements
CREATE OR REPLACE FUNCTION get_user_entitlements(
  p_user_id uuid,
  p_character_key text
)
RETURNS TABLE (
  tier text,
  status text,
  can_chat boolean,
  can_use_nsfw boolean,
  can_use_voice boolean,
  can_buy_credits boolean,
  daily_chat_count integer,
  daily_chat_limit integer,
  voice_credits integer
) AS $$
DECLARE
  user_sub RECORD;
  chat_usage integer := 0;
  credits_total integer := 0;
  wallet_id uuid;
BEGIN
  -- Get user's subscription with explicit table alias
  SELECT 
    us.tier,
    us.status,
    us.features
  INTO user_sub
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id 
    AND us.character_key = p_character_key
    AND us.status IN ('active', 'trialing')  -- Now unambiguous with table alias
  ORDER BY us.updated_at DESC
  LIMIT 1;
  
  -- Default to free tier if no subscription
  IF user_sub IS NULL THEN
    user_sub.tier := 'free';
    user_sub.status := 'active';
  END IF;
  
  -- Get daily chat usage for free users
  IF user_sub.tier = 'free' THEN
    SELECT COALESCE(dcu.chat_count, 0) INTO chat_usage
    FROM daily_chat_usage dcu
    WHERE dcu.user_id = p_user_id 
      AND dcu.character_key = p_character_key
      AND dcu.date = CURRENT_DATE;
  END IF;
  
  -- Get voice credits with explicit table aliases
  SELECT vw.id INTO wallet_id
  FROM voice_wallets vw
  WHERE vw.user_id = p_user_id 
    AND vw.character_key = p_character_key;
    
  IF wallet_id IS NOT NULL THEN
    SELECT COALESCE(SUM(vcl.delta), 0) INTO credits_total
    FROM voice_credit_ledger vcl
    WHERE vcl.wallet_id = wallet_id;
  END IF;
  
  -- Return entitlements based on tier
  RETURN QUERY SELECT
    user_sub.tier,
    user_sub.status,
    -- Chat permissions
    CASE 
      WHEN user_sub.tier = 'free' THEN chat_usage < 5
      ELSE true
    END as can_chat,
    -- NSFW permissions  
    CASE
      WHEN user_sub.tier = 'nsfw' THEN true
      ELSE false
    END as can_use_nsfw,
    -- Voice permissions
    CASE
      WHEN user_sub.tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_use_voice,
    -- Credit purchase permissions
    CASE
      WHEN user_sub.tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_buy_credits,
    -- Usage stats
    chat_usage as daily_chat_count,
    CASE
      WHEN user_sub.tier = 'free' THEN 5
      ELSE 0  -- unlimited
    END as daily_chat_limit,
    credits_total as voice_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;