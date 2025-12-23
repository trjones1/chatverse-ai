#!/usr/bin/env node

/**
 * Apply VerseCoins Promotional Discounts Migration
 * Run with: node scripts/apply-promotional-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Applying VerseCoins Promotional Discounts Migration...\n');

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250919000000_create_promotional_discounts.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log(`📁 Path: ${migrationPath}`);
    console.log(`📊 Size: ${(migrationSQL.length / 1024).toFixed(1)}KB\n`);

    // Execute migration
    console.log('⚙️  Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying table creation...');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['promotional_discounts', 'promotional_discount_usage']);

    if (tablesError) {
      console.warn('⚠️  Could not verify table creation:', tablesError);
    } else {
      console.log('✅ Tables verified:', tables.map(t => t.table_name).join(', '));
    }

    // Check sample data
    console.log('\n📊 Checking sample promotional data...');
    const { data: promotions, error: promoError } = await supabase
      .from('promotional_discounts')
      .select('name, badge, type, bonus_credits, active')
      .eq('active', true);

    if (promoError) {
      console.warn('⚠️  Could not fetch promotions:', promoError);
    } else {
      console.log(`✅ Found ${promotions.length} active promotions:`);
      promotions.forEach(promo => {
        console.log(`   ${promo.badge} ${promo.name} (+${promo.bonus_credits} credits)`);
      });
    }

    console.log('\n🎉 VerseCoins promotional system is ready!');
    console.log('🎛️  Access admin interface at /admin to manage promotions');
    console.log('💡 Next steps:');
    console.log('   1. Update promotion engine to use database');
    console.log('   2. Add CRUD operations to admin interface');
    console.log('   3. Test promotional pricing in VerseCoinsModal');

  } catch (err) {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  }
}

// Handle direct execution vs require
if (require.main === module) {
  applyMigration();
} else {
  module.exports = { applyMigration };
}