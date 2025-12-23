// Script to apply crypto subscriptions migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function applyCryptoMigration() {
  try {
    console.log('🚀 Applying crypto subscriptions migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250918000000_crypto_subscriptions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration file loaded, executing SQL...');

    // Execute the migration SQL
    const { data, error } = await admin.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Crypto subscriptions migration applied successfully!');

    // Test the functions
    console.log('🧪 Testing crypto subscription functions...');

    // Test the check function
    const { data: testResult, error: testError } = await admin
      .rpc('check_crypto_subscription', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_character_key: 'test'
      });

    if (testError) {
      console.error('❌ Function test failed:', testError);
    } else {
      console.log('✅ Functions working correctly');
    }

    // Check if tables were created
    const { data: tables, error: tablesError } = await admin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['crypto_charges', 'crypto_subscriptions']);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('📊 Created tables:', tables.map(t => t.table_name));
    }

    console.log('🎉 Crypto payment system database setup complete!');
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