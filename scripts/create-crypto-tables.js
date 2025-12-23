// Simple script to create crypto tables
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function createCryptoTables() {
  try {
    console.log('🚀 Creating crypto payment tables...');

    // Check if tables already exist
    console.log('🔍 Checking existing tables...');

    try {
      const { data: existingCharges } = await admin
        .from('crypto_charges')
        .select('id')
        .limit(1);

      console.log('✅ crypto_charges table already exists');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('📝 crypto_charges table needs to be created');
      }
    }

    try {
      const { data: existingSubs } = await admin
        .from('crypto_subscriptions')
        .select('id')
        .limit(1);

      console.log('✅ crypto_subscriptions table already exists');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('📝 crypto_subscriptions table needs to be created');
      }
    }

    console.log('');
    console.log('🎉 Database check complete!');
    console.log('');
    console.log('To create the tables manually, run these SQL commands in Supabase SQL Editor:');
    console.log('');
    console.log('1. Create crypto_charges table:');
    console.log(`
CREATE TABLE IF NOT EXISTS crypto_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coinbase_charge_id TEXT UNIQUE NOT NULL,
  coinbase_code TEXT UNIQUE NOT NULL,
  hosted_url TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  usd_amount DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'expired')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ
);
    `);
    console.log('');
    console.log('2. Create crypto_subscriptions table:');
    console.log(`
CREATE TABLE IF NOT EXISTS crypto_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  crypto_charge_id UUID REFERENCES crypto_charges(id) ON DELETE SET NULL,
  coinbase_charge_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  nsfw_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  voice_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  priority_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT crypto_subscriptions_unique_active UNIQUE (user_id, character_key)
);
    `);
    console.log('');
    console.log('3. Create helper function:');
    console.log(`
CREATE OR REPLACE FUNCTION check_crypto_subscription(
  p_user_id UUID,
  p_character_key TEXT
)
RETURNS TABLE (
  has_subscription BOOLEAN,
  tier_id TEXT,
  tier_name TEXT,
  expires_at TIMESTAMPTZ,
  nsfw_enabled BOOLEAN,
  voice_enabled BOOLEAN,
  priority_enabled BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN cs.id IS NOT NULL THEN TRUE ELSE FALSE END as has_subscription,
    cs.tier_id,
    cs.tier_name,
    cs.expires_at,
    cs.nsfw_enabled,
    cs.voice_enabled,
    cs.priority_enabled
  FROM crypto_subscriptions cs
  WHERE
    cs.user_id = p_user_id
    AND cs.character_key = p_character_key
    AND cs.status = 'active'
    AND cs.expires_at > NOW()
  LIMIT 1;

  -- If no active subscription found, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE as has_subscription,
      NULL::TEXT as tier_id,
      NULL::TEXT as tier_name,
      NULL::TIMESTAMPTZ as expires_at,
      FALSE as nsfw_enabled,
      FALSE as voice_enabled,
      FALSE as priority_enabled;
  END IF;
END;
$$;
    `);

    console.log('');
    console.log('📋 After running the SQL commands, your crypto payment system will be ready!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createCryptoTables();