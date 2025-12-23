#!/usr/bin/env node

// Recreate the orders table properly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function recreateOrdersTable() {
  console.log('🔧 Recreating orders table properly...\n');
  
  try {
    // First, drop the existing table if it exists
    console.log('🗑️ Dropping existing orders table...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS orders CASCADE;'
    });

    if (dropError) {
      console.warn('⚠️ Drop table warning:', dropError.message);
    } else {
      console.log('✅ Old table dropped successfully');
    }

    // Create the table with all columns
    console.log('📝 Creating new orders table...');
    const createTableSQL = `
      CREATE TABLE orders (
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
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (createError) {
      throw new Error(`Table creation failed: ${createError.message}`);
    }

    console.log('✅ Orders table created successfully');

    // Create indexes
    console.log('🔗 Creating indexes...');
    const indexes = [
      'CREATE INDEX idx_orders_user_id ON orders(user_id);',
      'CREATE INDEX idx_orders_character_key ON orders(character_key);',
      'CREATE INDEX idx_orders_order_type ON orders(order_type);',
      'CREATE INDEX idx_orders_status ON orders(status);',
      'CREATE INDEX idx_orders_created_at ON orders(created_at);',
      'CREATE INDEX idx_orders_completed_at ON orders(completed_at);',
      'CREATE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id);',
      'CREATE INDEX idx_orders_webhook_event_id ON orders(webhook_event_id);'
    ];

    for (const indexSQL of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSQL });
      if (indexError) {
        console.warn(`⚠️ Index warning: ${indexError.message}`);
      }
    }

    console.log('✅ Indexes created');

    // Create trigger function and trigger
    console.log('⚙️ Creating trigger function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_orders_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (functionError) {
      console.warn('⚠️ Function warning:', functionError.message);
    }

    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TRIGGER trigger_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_orders_updated_at();
      `
    });

    if (triggerError) {
      console.warn('⚠️ Trigger warning:', triggerError.message);
    }

    console.log('✅ Trigger created');

    // Test the table with a simple insert
    console.log('🧪 Testing table with sample insert...');
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
      character_key: 'test',
      order_type: 'tip',
      status: 'completed',
      product_type: 'test',
      product_name: 'Test Product',
      amount_cents: 100
    };

    const { data: insertData, error: insertError } = await supabase
      .from('orders')
      .insert(testData)
      .select();

    if (insertError) {
      throw new Error(`Test insert failed: ${insertError.message}`);
    }

    console.log('✅ Test insert successful!');

    // Clean up test record
    await supabase
      .from('orders')
      .delete()
      .eq('email', 'test@example.com');

    console.log('🧹 Test record cleaned up');
    console.log('🎯 Orders table is ready for seeding!');

  } catch (error) {
    console.error('❌ Recreation failed:', error.message);
    throw error;
  }
}

recreateOrdersTable().catch(console.error);