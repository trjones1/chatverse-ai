-- Migration: Global Voice Credits System
-- Converts character-specific voice wallets to shared global credits

-- Step 1: Add global wallet flag
ALTER TABLE voice_wallets ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_voice_wallets_global ON voice_wallets (user_id, is_global);

-- Step 2: Create global wallets for all existing users
-- Consolidate credits from all character wallets into one global wallet per user
INSERT INTO voice_wallets (user_id, character_key, is_global, created_at)
SELECT DISTINCT 
    user_id, 
    'global' as character_key, 
    TRUE as is_global,
    NOW()
FROM voice_wallets 
WHERE user_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM voice_wallets vw2 
    WHERE vw2.user_id = voice_wallets.user_id 
    AND vw2.is_global = TRUE
);

-- Step 3: Migrate existing credits to global wallets
-- Sum all character-specific credits per user into their global wallet
INSERT INTO voice_credit_ledger (wallet_id, delta, reason, created_at)
SELECT 
    global_wallet.id as wallet_id,
    COALESCE(SUM(vcl.delta), 0) as delta,
    'migration_to_global' as reason,
    NOW()
FROM voice_wallets global_wallet
JOIN voice_wallets character_wallet ON (
    character_wallet.user_id = global_wallet.user_id 
    AND character_wallet.is_global = FALSE
)
LEFT JOIN voice_credit_ledger vcl ON vcl.wallet_id = character_wallet.id
WHERE global_wallet.is_global = TRUE
GROUP BY global_wallet.id, global_wallet.user_id
HAVING COALESCE(SUM(vcl.delta), 0) > 0;

-- Step 4: Add migration tracking
CREATE TABLE voice_credit_migration_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    old_credits_total INTEGER NOT NULL,
    new_global_credits INTEGER NOT NULL,
    character_breakdown JSONB,
    migrated_at TIMESTAMP DEFAULT NOW()
);

-- Log the migration for each user
INSERT INTO voice_credit_migration_log (user_id, old_credits_total, new_global_credits, character_breakdown)
SELECT 
    vw.user_id,
    COALESCE(SUM(vcl.delta), 0) as old_credits_total,
    COALESCE(global_credits.total, 0) as new_global_credits,
    jsonb_object_agg(vw.character_key, COALESCE(character_total.credits, 0)) as character_breakdown
FROM voice_wallets vw
LEFT JOIN voice_credit_ledger vcl ON vcl.wallet_id = vw.id
LEFT JOIN (
    SELECT vw_char.user_id, COALESCE(SUM(vcl_char.delta), 0) as credits, vw_char.character_key
    FROM voice_wallets vw_char
    LEFT JOIN voice_credit_ledger vcl_char ON vcl_char.wallet_id = vw_char.id
    WHERE vw_char.is_global = FALSE
    GROUP BY vw_char.user_id, vw_char.character_key
) character_total ON character_total.user_id = vw.user_id AND character_total.character_key = vw.character_key
LEFT JOIN (
    SELECT vw_global.user_id, COALESCE(SUM(vcl_global.delta), 0) as total
    FROM voice_wallets vw_global
    LEFT JOIN voice_credit_ledger vcl_global ON vcl_global.wallet_id = vw_global.id
    WHERE vw_global.is_global = TRUE
    GROUP BY vw_global.user_id
) global_credits ON global_credits.user_id = vw.user_id
WHERE vw.user_id IS NOT NULL AND vw.is_global = FALSE
GROUP BY vw.user_id, global_credits.total;

-- Step 5: Update existing functions to use global wallets
CREATE OR REPLACE FUNCTION consume_one_voice_credit_global(
  p_user_id uuid,
  p_stripe_customer_id text default null
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet uuid;
  v_balance integer;
BEGIN
  -- Get global wallet for user
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_wallet FROM voice_wallets 
    WHERE user_id = p_user_id AND is_global = TRUE LIMIT 1;
  ELSIF p_stripe_customer_id IS NOT NULL THEN
    SELECT id INTO v_wallet FROM voice_wallets 
    WHERE stripe_customer_id = p_stripe_customer_id AND is_global = TRUE LIMIT 1;
  END IF;

  IF v_wallet IS NULL THEN 
    RETURN FALSE;
  END IF;

  -- Check balance
  SELECT COALESCE(SUM(delta), 0) INTO v_balance 
  FROM voice_credit_ledger WHERE wallet_id = v_wallet;
  
  IF v_balance <= 0 THEN 
    RETURN FALSE;
  END IF;

  -- Consume credit
  INSERT INTO voice_credit_ledger(wallet_id, delta, reason) 
  VALUES (v_wallet, -1, 'tts_play');
  
  RETURN TRUE;
END;
$$;

-- Create function to get/create global wallet
CREATE OR REPLACE FUNCTION get_or_create_global_voice_wallet(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  -- Try to get existing global wallet
  SELECT id INTO v_wallet_id 
  FROM voice_wallets 
  WHERE user_id = p_user_id AND is_global = TRUE 
  LIMIT 1;
  
  -- Create if doesn't exist
  IF v_wallet_id IS NULL THEN
    INSERT INTO voice_wallets (user_id, character_key, is_global)
    VALUES (p_user_id, 'global', TRUE)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$;

-- Update entitlements function to show global voice credits
CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id uuid, p_character_key text)
RETURNS TABLE (
  user_id uuid,
  character_key text,
  tier text,
  can_use_voice boolean,
  can_use_nsfw boolean,
  can_buy_credits boolean,
  voice_credits integer,
  subscription_status text,
  subscription_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    us.character_key,
    us.tier,
    CASE 
      WHEN us.tier IN ('sfw', 'nsfw') THEN true 
      ELSE false 
    END as can_use_voice,
    CASE 
      WHEN us.tier = 'nsfw' THEN true 
      ELSE false 
    END as can_use_nsfw,
    CASE 
      WHEN us.tier IN ('sfw', 'nsfw') THEN true 
      ELSE false 
    END as can_buy_credits,
    COALESCE(
      (SELECT SUM(vcl.delta) 
       FROM voice_wallets vw 
       JOIN voice_credit_ledger vcl ON vcl.wallet_id = vw.id
       WHERE vw.user_id = u.id AND vw.is_global = TRUE), 0
    )::integer as voice_credits,
    us.subscription_status,
    us.subscription_id
  FROM auth.users u
  CROSS JOIN (SELECT p_character_key::text as character_key) chars
  LEFT JOIN user_subscriptions us ON (
    u.id = us.user_id AND 
    us.character_key = chars.character_key AND 
    us.subscription_status IN ('active', 'trialing')
  )
  WHERE u.id = p_user_id;
END;
$$;

-- Grants
GRANT ALL ON voice_credit_migration_log TO authenticated;
GRANT ALL ON voice_credit_migration_log TO service_role;