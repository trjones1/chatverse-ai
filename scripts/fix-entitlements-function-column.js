#!/usr/bin/env node

// Fix the get_user_entitlements function column reference
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function fixEntitlementsFunction() {
  console.log('🔧 Fixing get_user_entitlements function column reference...\n');

  const fixedFunction = `
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
BEGIN
  -- Get user's subscription with correct column names
  SELECT 
    us.tier,
    us.status,  -- FIXED: was us.subscription_status, now us.status
    us.features
  INTO user_sub
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id 
    AND us.character_key = p_character_key
    AND us.status IN ('active', 'trialing')  -- FIXED: was us.subscription_status, now us.status
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
  
  -- Get voice credits - use global wallet approach
  SELECT COALESCE(
    (SELECT SUM(vcl.delta) 
     FROM voice_wallets vw 
     JOIN voice_credit_ledger vcl ON vcl.wallet_id = vw.id
     WHERE vw.user_id = p_user_id AND vw.is_global = TRUE), 0
  )::integer INTO credits_total;
  
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
  `.trim();

  console.log('📋 MANUAL STEP REQUIRED:');
  console.log('Go to Supabase Dashboard → SQL Editor and run this SQL:');
  console.log('\n' + '='.repeat(80));
  console.log(fixedFunction);
  console.log('='.repeat(80));

  console.log('\n✅ This will fix the column reference issues:');
  console.log('   • Changes us.subscription_status to us.status');
  console.log('   • Uses proper global voice credit calculation');
  console.log('   • Maintains all existing logic');
  console.log('   • Should make entitlements work for your premium subscription');

  console.log('\n🎯 After running this SQL:');
  console.log('   1. The entitlements API should recognize your premium subscription');
  console.log('   2. You should stop seeing premium CTAs');
  console.log('   3. Voice and other premium features should be enabled');

  return fixedFunction;
}

async function main() {
  console.log('🚨 FINAL FIX: Correct Column References in Entitlements Function');
  console.log('The function was looking for subscription_status but the column is named status.\n');

  const sqlToRun = await fixEntitlementsFunction();

  console.log('\n📝 Copy and paste the SQL above into Supabase Dashboard SQL Editor');
  console.log('Then refresh your browser - the premium features should work immediately!');
}

main().catch(console.error);