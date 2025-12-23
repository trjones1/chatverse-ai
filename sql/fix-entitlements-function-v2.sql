-- Fix the get_user_entitlements function to properly handle null values
-- The issue is that chat_usage and other variables are not being handled correctly

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
  v_wallet_id uuid;
  is_authenticated boolean := false;
BEGIN
  -- Check if user exists in auth.users (authenticated) or is anonymous
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO is_authenticated;
  
  -- Initialize default user_sub record
  user_sub.tier := 'free';
  user_sub.status := 'active';
  user_sub.features := NULL;
  
  -- Get user's subscription (only for authenticated users)
  IF is_authenticated THEN
    SELECT 
      us.tier,
      us.status,
      us.features
    INTO user_sub
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id 
      AND us.character_key = p_character_key
      AND us.status IN ('active', 'trialing')
    ORDER BY us.updated_at DESC
    LIMIT 1;
    
    -- If no subscription found, reset to free tier defaults
    IF user_sub.tier IS NULL THEN
      user_sub.tier := 'free';
      user_sub.status := 'active';
      user_sub.features := NULL;
    END IF;
  END IF;
  
  -- Get daily chat usage for free users (both authenticated and anonymous)
  IF user_sub.tier = 'free' THEN
    SELECT COALESCE(dcu.chat_count, 0) INTO chat_usage
    FROM daily_chat_usage dcu
    WHERE dcu.user_id = p_user_id 
      AND dcu.character_key = p_character_key
      AND dcu.date = CURRENT_DATE;
    
    -- Ensure chat_usage is never null
    chat_usage := COALESCE(chat_usage, 0);
  END IF;
  
  -- Get voice credits (only for authenticated users with subscriptions)
  IF is_authenticated THEN
    SELECT vw.id INTO v_wallet_id
    FROM voice_wallets vw
    WHERE vw.user_id = p_user_id 
      AND vw.character_key = p_character_key;
      
    IF v_wallet_id IS NOT NULL THEN
      SELECT COALESCE(SUM(vcl.delta), 0) INTO credits_total
      FROM voice_credit_ledger vcl
      WHERE vcl.wallet_id = v_wallet_id;
    END IF;
  END IF;
  
  -- Ensure credits_total is never null
  credits_total := COALESCE(credits_total, 0);
  
  -- Return entitlements based on tier
  RETURN QUERY SELECT
    user_sub.tier,
    user_sub.status,
    -- Chat permissions - explicitly handle the boolean logic
    CASE 
      WHEN user_sub.tier = 'free' THEN (COALESCE(chat_usage, 0) < 5)
      ELSE true
    END as can_chat,
    -- NSFW permissions (only for authenticated users with nsfw subscription)
    CASE
      WHEN is_authenticated AND user_sub.tier = 'nsfw' THEN true
      ELSE false
    END as can_use_nsfw,
    -- Voice permissions (only for authenticated users with paid subscriptions)
    CASE
      WHEN is_authenticated AND user_sub.tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_use_voice,
    -- Credit purchase permissions (only for authenticated users with paid subscriptions)
    CASE
      WHEN is_authenticated AND user_sub.tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_buy_credits,
    -- Usage stats - ensure never null
    COALESCE(chat_usage, 0) as daily_chat_count,
    CASE
      WHEN user_sub.tier = 'free' THEN 5
      ELSE 0  -- unlimited
    END as daily_chat_limit,
    COALESCE(credits_total, 0) as voice_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;