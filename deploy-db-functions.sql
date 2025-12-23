-- Deploy missing database functions to fix 500 errors
-- This will be run manually on the Supabase dashboard

-- 1. get_user_entitlements function
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
  subscription_tier text := 'free';
  subscription_status text := 'active';
  subscription_features jsonb := NULL;
  chat_usage integer := 0;
  credits_total integer := 0;
  v_wallet_id uuid;
  is_authenticated boolean := false;
BEGIN
  -- Check if user exists in auth.users (authenticated) or is anonymous
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO is_authenticated;
  
  -- Get user's subscription (only for authenticated users)
  IF is_authenticated THEN
    SELECT 
      COALESCE(us.tier, 'free'),
      COALESCE(us.status, 'active'),
      us.features
    INTO 
      subscription_tier,
      subscription_status,
      subscription_features
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id 
      AND us.character_key = p_character_key
      AND us.status IN ('active', 'trialing')
    ORDER BY us.updated_at DESC
    LIMIT 1;
    
    -- Ensure we have fallback values if no subscription found
    subscription_tier := COALESCE(subscription_tier, 'free');
    subscription_status := COALESCE(subscription_status, 'active');
  END IF;
  
  -- Get daily chat usage for free users (both authenticated and anonymous)
  IF subscription_tier = 'free' THEN
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
  
  -- Return entitlements based on tier using individual variables instead of RECORD
  RETURN QUERY SELECT
    subscription_tier,
    subscription_status,
    -- Chat permissions - explicitly handle the boolean logic
    CASE 
      WHEN subscription_tier = 'free' THEN (COALESCE(chat_usage, 0) < 5)
      ELSE true
    END as can_chat,
    -- NSFW permissions (only for authenticated users with nsfw subscription)
    CASE
      WHEN is_authenticated AND subscription_tier = 'nsfw' THEN true
      ELSE false
    END as can_use_nsfw,
    -- Voice permissions (only for authenticated users with paid subscriptions)
    CASE
      WHEN is_authenticated AND subscription_tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_use_voice,
    -- Credit purchase permissions (only for authenticated users with paid subscriptions)
    CASE
      WHEN is_authenticated AND subscription_tier IN ('sfw', 'nsfw') THEN true
      ELSE false
    END as can_buy_credits,
    -- Usage stats - ensure never null
    COALESCE(chat_usage, 0) as daily_chat_count,
    CASE
      WHEN subscription_tier = 'free' THEN 5
      ELSE 0  -- unlimited
    END as daily_chat_limit,
    COALESCE(credits_total, 0) as voice_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. consume_voice_credits function
CREATE OR REPLACE FUNCTION consume_voice_credits(
  p_user_id uuid,
  p_character_key text,
  p_credits_needed integer,
  p_reason text DEFAULT 'voice_generation'
)
RETURNS TABLE (
  success boolean,
  wallet_id uuid,
  remaining_credits integer
) AS $$
DECLARE
  v_wallet_id uuid;
  v_current_credits integer;
BEGIN
  -- Get or create wallet for this user/character combination
  SELECT id INTO v_wallet_id 
  FROM voice_wallets 
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO voice_wallets (user_id, p_character_key) 
    VALUES (p_user_id, p_character_key) 
    RETURNING id INTO v_wallet_id;
  END IF;
  
  -- Calculate current credits
  SELECT COALESCE(SUM(delta), 0) INTO v_current_credits
  FROM voice_credit_ledger 
  WHERE wallet_id = v_wallet_id;
  
  -- Check if user has sufficient credits
  IF v_current_credits < p_credits_needed THEN
    RETURN QUERY SELECT false, v_wallet_id, v_current_credits;
    RETURN;
  END IF;
  
  -- Consume credits by adding negative entry
  INSERT INTO voice_credit_ledger (wallet_id, delta, reason, created_at)
  VALUES (v_wallet_id, -p_credits_needed, p_reason, NOW());
  
  -- Calculate new balance
  v_current_credits := v_current_credits - p_credits_needed;
  
  RETURN QUERY SELECT true, v_wallet_id, v_current_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. consume_one_voice_credit_v2 function (simplified for single credit consumption)
CREATE OR REPLACE FUNCTION consume_one_voice_credit_v2(
  p_user_id uuid,
  p_stripe_customer_id text,  -- kept for compatibility but ignored
  p_character_key text
)
RETURNS boolean AS $$
DECLARE
  v_wallet_id uuid;
  v_current_credits integer;
BEGIN
  -- Get or create wallet for this user/character combination
  SELECT id INTO v_wallet_id 
  FROM voice_wallets 
  WHERE user_id = p_user_id AND character_key = p_character_key;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO voice_wallets (user_id, character_key) 
    VALUES (p_user_id, p_character_key) 
    RETURNING id INTO v_wallet_id;
  END IF;
  
  -- Calculate current credits
  SELECT COALESCE(SUM(delta), 0) INTO v_current_credits
  FROM voice_credit_ledger 
  WHERE wallet_id = v_wallet_id;
  
  -- Check if user has at least 1 credit
  IF v_current_credits < 1 THEN
    RETURN false;
  END IF;
  
  -- Consume 1 credit by adding negative entry
  INSERT INTO voice_credit_ledger (wallet_id, delta, reason, created_at)
  VALUES (v_wallet_id, -1, 'voice_message', NOW());
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;