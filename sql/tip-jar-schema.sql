-- Tip jar system schema
-- Users can tip characters and appear on monthly leaderboards

-- Tips table to track all tip transactions
CREATE TABLE IF NOT EXISTS tips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key text NOT NULL, -- 'lexi', 'nyx', 'chloe', etc.
  amount_cents integer NOT NULL, -- tip amount in cents
  display_name text, -- User's chosen display name for leaderboard
  message text, -- Optional tip message to the character
  stripe_payment_intent_id text UNIQUE, -- Stripe payment reference
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User display names for leaderboards (separate from auth profile)
CREATE TABLE IF NOT EXISTS user_display_names (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS tips_user_id_idx ON tips(user_id);
CREATE INDEX IF NOT EXISTS tips_character_key_idx ON tips(character_key);
CREATE INDEX IF NOT EXISTS tips_created_at_idx ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS tips_status_idx ON tips(status);
CREATE INDEX IF NOT EXISTS tips_monthly_leaderboard_idx ON tips(character_key, created_at DESC, status) WHERE status = 'completed';

-- RLS policies
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_display_names ENABLE ROW LEVEL SECURITY;

-- Users can see their own tips
CREATE POLICY "Users can view own tips" ON tips
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tips (for creating payment intents)
CREATE POLICY "Users can create own tips" ON tips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update tip status (for webhook processing)
CREATE POLICY "Service can update tip status" ON tips
  FOR UPDATE USING (true);

-- Anyone can view completed tips for leaderboards (with display names only)
CREATE POLICY "Anyone can view completed tips for leaderboard" ON tips
  FOR SELECT USING (status = 'completed');

-- Users can manage their own display names
CREATE POLICY "Users can manage own display name" ON user_display_names
  FOR ALL USING (auth.uid() = user_id);

-- RPC function to get monthly leaderboard
CREATE OR REPLACE FUNCTION get_monthly_leaderboard(
  p_character_key text,
  p_year integer DEFAULT EXTRACT(year FROM NOW()),
  p_month integer DEFAULT EXTRACT(month FROM NOW()),
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  display_name text,
  total_amount_cents integer,
  tip_count integer,
  rank integer
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_tips AS (
    SELECT 
      COALESCE(
        t.display_name, 
        udn.display_name, 
        'Anonymous'
      ) as display_name,
      SUM(t.amount_cents) as total_amount_cents,
      COUNT(*) as tip_count
    FROM tips t
    LEFT JOIN user_display_names udn ON t.user_id = udn.user_id
    WHERE 
      t.character_key = p_character_key
      AND t.status = 'completed'
      AND EXTRACT(year FROM t.created_at) = p_year
      AND EXTRACT(month FROM t.created_at) = p_month
    GROUP BY t.user_id, COALESCE(t.display_name, udn.display_name, 'Anonymous')
  )
  SELECT 
    mt.display_name,
    mt.total_amount_cents::integer,
    mt.tip_count::integer,
    ROW_NUMBER() OVER (ORDER BY mt.total_amount_cents DESC, mt.tip_count DESC)::integer as rank
  FROM monthly_tips mt
  ORDER BY mt.total_amount_cents DESC, mt.tip_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get user's leaderboard position
CREATE OR REPLACE FUNCTION get_user_leaderboard_position(
  p_user_id uuid,
  p_character_key text,
  p_year integer DEFAULT EXTRACT(year FROM NOW()),
  p_month integer DEFAULT EXTRACT(month FROM NOW())
)
RETURNS TABLE (
  rank integer,
  total_amount_cents integer,
  tip_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_tips AS (
    SELECT 
      t.user_id,
      SUM(t.amount_cents) as total_amount_cents,
      COUNT(*) as tip_count
    FROM tips t
    WHERE 
      t.character_key = p_character_key
      AND t.status = 'completed'
      AND EXTRACT(year FROM t.created_at) = p_year
      AND EXTRACT(month FROM t.created_at) = p_month
    GROUP BY t.user_id
  ),
  ranked_tips AS (
    SELECT 
      mt.*,
      ROW_NUMBER() OVER (ORDER BY mt.total_amount_cents DESC, mt.tip_count DESC) as rank
    FROM monthly_tips mt
  )
  SELECT 
    rt.rank::integer,
    rt.total_amount_cents::integer,
    rt.tip_count::integer
  FROM ranked_tips rt
  WHERE rt.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update display name
CREATE OR REPLACE FUNCTION update_display_name(p_display_name text)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Validate display name (basic checks)
  IF LENGTH(TRIM(p_display_name)) = 0 OR LENGTH(p_display_name) > 50 THEN
    RETURN false;
  END IF;

  INSERT INTO user_display_names (user_id, display_name, updated_at)
  VALUES (current_user_id, TRIM(p_display_name), NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    display_name = TRIM(p_display_name),
    updated_at = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;