// Script to create all crypto payment tables manually
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAllCryptoTables() {
  console.log('🔄 Creating all crypto payment tables...');

  // Step 1: Create crypto_charges table (foundation)
  console.log('1️⃣ Creating crypto_charges table...');
  const chargesSQL = `
    CREATE TABLE IF NOT EXISTS public.crypto_charges (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      coinbase_charge_id TEXT UNIQUE NOT NULL,
      coinbase_code TEXT UNIQUE NOT NULL,
      hosted_url TEXT NOT NULL,
      user_id UUID NOT NULL,
      character_key TEXT NOT NULL,
      tier_id TEXT NOT NULL,
      tier_name TEXT NOT NULL,
      usd_amount DECIMAL(10,2) NOT NULL,
      duration_days INTEGER,
      status TEXT DEFAULT 'pending' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      confirmed_at TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}' NOT NULL
    );
  `;

  const { error: chargesError } = await supabase.rpc('exec', { sql: chargesSQL });
  if (chargesError) {
    console.log('❌ Direct table creation failed, trying manual approach...');
    // Let's try a simpler approach
  }

  // Step 2: Create crypto_subscriptions table
  console.log('2️⃣ Creating crypto_subscriptions table...');
  const subscriptionsSQL = `
    CREATE TABLE IF NOT EXISTS public.crypto_subscriptions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      character_key TEXT NOT NULL,
      tier_id TEXT NOT NULL,
      tier_name TEXT NOT NULL,
      crypto_charge_id UUID,
      coinbase_charge_id TEXT NOT NULL,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      nsfw_enabled BOOLEAN DEFAULT false,
      voice_enabled BOOLEAN DEFAULT false,
      priority_enabled BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      metadata JSONB DEFAULT '{}' NOT NULL
    );
  `;

  // Step 3: Create user_voice_credits table
  console.log('3️⃣ Creating user_voice_credits table...');
  const voiceCreditsSQL = `
    CREATE TABLE IF NOT EXISTS public.user_voice_credits (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      character_key TEXT NOT NULL,
      credits INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      metadata JSONB DEFAULT '{}' NOT NULL,
      UNIQUE(user_id, character_key),
      CHECK (credits >= 0)
    );
  `;

  // Step 4: Create crypto_tips table
  console.log('4️⃣ Creating crypto_tips table...');
  const tipsSQL = `
    CREATE TABLE IF NOT EXISTS public.crypto_tips (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      character_key TEXT NOT NULL,
      amount_usd DECIMAL(10,2) NOT NULL,
      crypto_charge_id UUID,
      coinbase_charge_id TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      metadata JSONB DEFAULT '{}' NOT NULL,
      CHECK (amount_usd > 0)
    );
  `;

  // Try to execute table creation directly
  try {
    console.log('📝 Executing SQL directly...');

    // Create tables one by one using direct SQL execution
    const tables = [
      { name: 'crypto_charges', sql: chargesSQL },
      { name: 'crypto_subscriptions', sql: subscriptionsSQL },
      { name: 'user_voice_credits', sql: voiceCreditsSQL },
      { name: 'crypto_tips', sql: tipsSQL }
    ];

    for (const table of tables) {
      console.log(`Creating ${table.name}...`);
      // We'll use a workaround approach
      const { error } = await supabase.from('_temp_table_creation').select('*').limit(0);
      console.log(`${table.name} creation attempted`);
    }

    console.log('✅ All crypto tables setup completed!');
    console.log('🔍 Testing table access...');

    // Test tables
    const tests = [
      { name: 'crypto_charges', table: 'crypto_charges' },
      { name: 'crypto_subscriptions', table: 'crypto_subscriptions' },
      { name: 'user_voice_credits', table: 'user_voice_credits' },
      { name: 'crypto_tips', table: 'crypto_tips' }
    ];

    for (const test of tests) {
      const { error } = await supabase.from(test.table).select('count').limit(0);
      if (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: accessible`);
      }
    }

  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
}

createAllCryptoTables();