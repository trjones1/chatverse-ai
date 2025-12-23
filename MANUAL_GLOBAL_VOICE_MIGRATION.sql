-- Manual Global Voice Credits Migration
-- Run this directly in Supabase SQL Editor or via psql
-- This is a safe, incremental migration that won't conflict with existing data

-- Step 1: Add global wallet flag (safe if column already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'voice_wallets' AND column_name = 'is_global'
    ) THEN
        ALTER TABLE voice_wallets ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
        CREATE INDEX idx_voice_wallets_global ON voice_wallets (user_id, is_global);
    END IF;
END $$;

-- Step 2: Create global wallets for all existing users
-- This is safe - only creates new records, doesn't modify existing ones
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
)
ON CONFLICT DO NOTHING;

-- Step 3: Migrate existing credits to global wallets
-- This sums all character-specific credits per user into their global wallet
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
HAVING COALESCE(SUM(vcl.delta), 0) > 0
ON CONFLICT DO NOTHING;

-- Step 4: Create global credit consumption function
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

-- Step 5: Create function to get/create global wallet
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

-- Step 6: Update entitlements function to show global voice credits
DROP FUNCTION IF EXISTS get_user_entitlements(uuid,text);
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

-- Success message
SELECT 'Global Voice Credits Migration Complete! 🎉' as status;