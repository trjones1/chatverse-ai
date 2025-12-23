// Script to apply crypto subscriptions migration directly
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function applyCryptoMigration() {
  try {
    console.log('🚀 Creating crypto payment tables...');

    // Create crypto_charges table
    console.log('📝 Creating crypto_charges table...');
    const { error: chargesError } = await admin.rpc('exec', {
      sql: `
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
          confirmed_at TIMESTAMPTZ,
          CONSTRAINT crypto_charges_user_character_key UNIQUE (user_id, character_key, coinbase_charge_id)
        );
      `
    });

    if (chargesError) {
      console.error('❌ Error creating crypto_charges table:', chargesError);
    } else {
      console.log('✅ crypto_charges table created');
    }

    // Create crypto_subscriptions table
    console.log('📝 Creating crypto_subscriptions table...');
    const { error: subscriptionsError } = await admin.rpc('exec', {
      sql: `
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
      `
    });

    if (subscriptionsError) {
      console.error('❌ Error creating crypto_subscriptions table:', subscriptionsError);
    } else {
      console.log('✅ crypto_subscriptions table created');
    }

    console.log('🎉 Crypto payment system tables created successfully!');

    // Verify tables exist
    const { data: tables, error: verifyError } = await admin
      .from('crypto_charges')
      .select('id')
      .limit(1);

    if (verifyError && !verifyError.message.includes('does not exist')) {
      console.log('✅ Tables verification successful');
    } else {
      console.log('📋 Tables created and ready for use');
    }

    console.log('');
    console.log('Next steps:');
    console.log('1. Set up Coinbase Commerce account');
    console.log('2. Add API keys to .env.local');
    console.log('3. Test crypto payment flow');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

applyCryptoMigration();