#!/usr/bin/env node

const fs = require('fs');
const { Client } = require('pg');

async function applyMigration() {
  try {
    console.log('🔄 Applying orders table migration...');

    // Read environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const connectionString = process.env.SUPABASE_CONN_STRING;
    if (!connectionString) {
      throw new Error('SUPABASE_CONN_STRING not found in .env.local');
    }

    // Create client
    const client = new Client({
      connectionString: connectionString
    });

    console.log('📝 Connecting to database...');
    await client.connect();

    // Just create the table directly with IF NOT EXISTS
    console.log('🚀 Creating orders table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        stripe_payment_intent_id TEXT,
        stripe_session_id TEXT,
        stripe_subscription_id TEXT,
        stripe_invoice_id TEXT,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        character_key TEXT NOT NULL,
        order_type TEXT NOT NULL CHECK (order_type IN ('subscription', 'voice_pack', 'tip', 'one_time')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
        product_type TEXT NOT NULL,
        product_name TEXT NOT NULL,
        tier TEXT,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        stripe_price_id TEXT,
        quantity INTEGER DEFAULT 1,
        voice_credits INTEGER DEFAULT 0,
        subscription_start_date TIMESTAMPTZ,
        subscription_end_date TIMESTAMPTZ,
        subscription_status TEXT,
        tip_amount_cents INTEGER,
        tip_character TEXT,
        stripe_customer_id TEXT,
        stripe_metadata JSONB,
        webhook_event_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        refunded_at TIMESTAMPTZ
      )
    `);

    console.log('🔗 Creating indexes...');
    
    // Create indexes with IF NOT EXISTS
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_character_key ON orders(character_key)',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at)',
      'CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_stripe_subscription_id ON orders(stripe_subscription_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_webhook_event_id ON orders(webhook_event_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_analytics ON orders(order_type, status, completed_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_orders_revenue ON orders(status, completed_at DESC) WHERE status = \'completed\''
    ];

    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL);
      } catch (error) {
        if (!error.message?.includes('already exists')) {
          console.warn(`⚠️  Index creation warning: ${error.message}`);
        }
      }
    }

    console.log('⚙️  Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_orders_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    console.log('🔔 Creating trigger...');
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
      CREATE TRIGGER trigger_orders_updated_at
          BEFORE UPDATE ON orders
          FOR EACH ROW
          EXECUTE FUNCTION update_orders_updated_at()
    `);

    console.log('✅ Orders table migration applied successfully!');

    await client.end();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();