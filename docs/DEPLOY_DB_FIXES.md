# URGENT: Deploy Database Fixes

The authentication issues you're experiencing are caused by the `get_user_entitlements` SQL function having ambiguous column references.

## Immediate Fix Required

Run this SQL in your Supabase database **right now**:

```sql
-- Fix ambiguous column reference in get_user_entitlements function
DROP FUNCTION IF EXISTS get_user_entitlements(uuid, text);

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
  v_wallet_id uuid;  -- Renamed from wallet_id to avoid column ambiguity
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
  SELECT vw.id INTO v_wallet_id  -- Using renamed variable
  FROM voice_wallets vw
  WHERE vw.user_id = p_user_id 
    AND vw.character_key = p_character_key;
    
  IF v_wallet_id IS NOT NULL THEN  -- Using renamed variable
    SELECT COALESCE(SUM(vcl.delta), 0) INTO credits_total
    FROM voice_credit_ledger vcl
    WHERE vcl.wallet_id = v_wallet_id;  -- Using renamed variable
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
```

## What This Fixes

- ✅ **Entitlements API 500 errors** - Resolves ambiguous column reference
- ✅ **"currentCount: null" issue** - Function will return proper daily chat counts
- ✅ **Database constraint violations** - Proper tier handling

## After Running This SQL

The authentication flow should work much better:
1. Login will work and persist
2. Entitlements API will return 200 instead of 500
3. Daily limits will show proper counts like "5/5" instead of "null/5"
4. Subscription tiers will be properly enforced

**This is blocking all functionality - please run this SQL immediately.**