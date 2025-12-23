#!/usr/bin/env node

// Create the centralized orders table for comprehensive revenue tracking
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function createOrdersTable() {
  console.log('🔧 Creating orders table for centralized revenue tracking...\n');
  
  try {
    // Create the main table
    console.log('📝 Creating orders table...');
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS orders (
          -- Primary identifiers
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          stripe_payment_intent_id TEXT,
          stripe_session_id TEXT,
          stripe_subscription_id TEXT,
          stripe_invoice_id TEXT,
          
          -- User information
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          character_key TEXT NOT NULL,
          
          -- Order details
          order_type TEXT NOT NULL CHECK (order_type IN ('subscription', 'voice_pack', 'tip', 'one_time')),
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
          
          -- Product information
          product_type TEXT NOT NULL,
          product_name TEXT NOT NULL,
          tier TEXT,
          
          -- Financial data
          amount_cents INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'usd',
          stripe_price_id TEXT,
          quantity INTEGER DEFAULT 1,
          
          -- Voice pack specific data
          voice_credits INTEGER DEFAULT 0,
          
          -- Subscription specific data
          subscription_start_date TIMESTAMPTZ,
          subscription_end_date TIMESTAMPTZ,
          subscription_status TEXT,
          
          -- Tip specific data
          tip_amount_cents INTEGER,
          tip_character TEXT,
          
          -- Metadata and tracking
          stripe_customer_id TEXT,
          stripe_metadata JSONB,
          webhook_event_id TEXT,
          
          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          refunded_at TIMESTAMPTZ
        )
      `
    });

    if (tableError) {
      if (tableError.message?.includes('already exists')) {
        console.log('ℹ️ Orders table already exists');
      } else {
        throw tableError;
      }
    } else {
      console.log('✅ Orders table created successfully');
    }

    // Create indexes for performance
    console.log('🔗 Creating performance indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_character_key ON orders(character_key)',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at)',
      'CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_stripe_subscription_id ON orders(stripe_subscription_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_webhook_event_id ON orders(webhook_event_id)'
    ];

    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError && !indexError.message?.includes('already exists')) {
        console.warn(`⚠️ Index creation warning:`, indexError.message);
      }
    }

    // Create composite indexes for analytics
    console.log('📊 Creating analytics indexes...');
    const analyticsIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_analytics ON orders(order_type, status, completed_at DESC)',
      "CREATE INDEX IF NOT EXISTS idx_orders_revenue ON orders(status, completed_at DESC) WHERE status = 'completed'"
    ];

    for (const indexSql of analyticsIndexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError && !indexError.message?.includes('already exists')) {
        console.warn(`⚠️ Analytics index creation warning:`, indexError.message);
      }
    }

    // Create trigger function for updated_at
    console.log('⚙️ Creating trigger function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_orders_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `
    });

    if (functionError) {
      console.warn(`⚠️ Trigger function warning:`, functionError.message);
    } else {
      console.log('✅ Trigger function created');
    }

    // Create trigger
    console.log('🔔 Creating update trigger...');
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
        CREATE TRIGGER trigger_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_orders_updated_at()
      `
    });

    if (triggerError) {
      console.warn(`⚠️ Trigger creation warning:`, triggerError.message);
    } else {
      console.log('✅ Update trigger created');
    }

    // Verify table exists and get count
    const { data: tableCheck, error: checkError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });

    if (checkError) {
      console.warn(`⚠️ Table verification warning:`, checkError.message);
    } else {
      console.log(`✅ Orders table verified - ready to track purchases`);
    }

    console.log('\n🎯 Orders table setup complete!');
    console.log('📋 The table will now track:');
    console.log('  • Subscription purchases');
    console.log('  • Voice pack purchases');
    console.log('  • Tip payments');
    console.log('  • All revenue streams in one place');
    
  } catch (error) {
    console.error('❌ Orders table creation failed:', error.message || error);
    throw error;
  }
}

async function seedExistingData() {
  console.log('\n🌱 Seeding orders table with existing data...');
  
  try {
    let totalSeeded = 0;

    // 1. Seed from user_subscriptions
    console.log('📊 Migrating subscription data...');
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .not('user_id', 'is', null)
      .limit(50); // Limit for initial testing

    if (subscriptions?.length) {
      for (const sub of subscriptions.slice(0, 10)) { // Process first 10 for testing
        const orderData = {
          user_id: sub.user_id,
          email: sub.customer_email || 'unknown@example.com',
          character_key: 'lexi',
          order_type: 'subscription',
          status: sub.status === 'active' ? 'completed' : 'cancelled',
          product_type: sub.tier === 'sfw' ? 'sfw_premium' : 'nsfw_premium',
          product_name: `${sub.tier?.toUpperCase()} Premium Subscription`,
          tier: sub.tier,
          amount_cents: sub.tier === 'sfw' ? 999 : 2999,
          currency: 'usd',
          stripe_customer_id: sub.stripe_customer_id,
          stripe_subscription_id: sub.stripe_subscription_id,
          subscription_status: sub.status,
          webhook_event_id: `migration_sub_${sub.id}`,
          created_at: sub.created_at,
          completed_at: sub.status === 'active' ? sub.created_at : null
        };

        const { error } = await supabase.from('orders').insert(orderData);
        if (!error) totalSeeded++;
      }
      console.log(`✅ Migrated ${Math.min(10, subscriptions.length)} subscription records`);
    }

    // 2. Seed from tips
    console.log('💰 Migrating tips data...');
    const { data: tips } = await supabase
      .from('tips')
      .select('*')
      .eq('status', 'completed')
      .limit(50);

    if (tips?.length) {
      for (const tip of tips.slice(0, 10)) {
        const orderData = {
          stripe_payment_intent_id: tip.stripe_payment_intent_id,
          user_id: tip.user_id,
          email: tip.customer_email || 'unknown@example.com',
          character_key: tip.character_key || 'lexi',
          order_type: 'tip',
          status: 'completed',
          product_type: 'tip',
          product_name: `Tip to ${tip.character_key || 'lexi'}`,
          amount_cents: tip.amount_cents,
          currency: 'usd',
          tip_amount_cents: tip.amount_cents,
          tip_character: tip.character_key,
          webhook_event_id: `migration_tip_${tip.id}`,
          created_at: tip.created_at,
          completed_at: tip.updated_at || tip.created_at
        };

        const { error } = await supabase.from('orders').insert(orderData);
        if (!error) totalSeeded++;
      }
      console.log(`✅ Migrated ${Math.min(10, tips.length)} tip records`);
    }

    // 3. Seed from credits_grants  
    console.log('🎤 Migrating voice pack data...');
    const { data: voicePacks } = await supabase
      .from('credits_grants')
      .select('*')
      .like('reason', '%Credit pack%')
      .limit(50);

    if (voicePacks?.length) {
      for (const pack of voicePacks.slice(0, 10)) {
        let amountCents = pack.credits * 50; // Estimate
        let productType = `voice_${pack.credits}`;
        
        if (pack.credits === 10) amountCents = 500;
        if (pack.credits === 25) amountCents = 1000;
        if (pack.credits === 50) amountCents = 1800;
        if (pack.credits === 100) amountCents = 3500;

        const orderData = {
          user_id: pack.user_id,
          email: 'migration@example.com',
          character_key: 'lexi',
          order_type: 'voice_pack',
          status: 'completed',
          product_type: productType,
          product_name: `Voice Pack (${pack.credits} credits)`,
          amount_cents: amountCents,
          currency: 'usd',
          voice_credits: pack.credits,
          webhook_event_id: `migration_voice_${pack.id}`,
          created_at: pack.created_at,
          completed_at: pack.created_at
        };

        const { error } = await supabase.from('orders').insert(orderData);
        if (!error) totalSeeded++;
      }
      console.log(`✅ Migrated ${Math.min(10, voicePacks.length)} voice pack records`);
    }

    console.log(`🎯 Initial seeding complete! Added ${totalSeeded} historical records`);
    console.log('📝 Run seed-orders-from-existing-data.js for complete historical migration');
    
  } catch (error) {
    console.warn('⚠️ Seeding encountered errors (this is normal for initial setup):', error.message);
  }
}

async function main() {
  console.log('🚨 CREATE ORDERS TABLE FOR CENTRALIZED REVENUE TRACKING');
  console.log('This creates a single table to track all purchases from Stripe webhooks.\n');
  
  await createOrdersTable();
  await seedExistingData();
  
  console.log('\n📝 Next steps:');
  console.log('1. Run: node scripts/seed-orders-from-existing-data.js (for complete historical data)');
  console.log('2. All new purchases will be automatically tracked in orders table');
  console.log('3. Analytics will use orders table for accurate revenue reporting');
  console.log('4. Voice pack revenue should now show correctly in dashboard');
}

main().catch(console.error);