-- Complete Orders Table Setup
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop existing table if it has issues
DROP TABLE IF EXISTS orders CASCADE;

-- Step 2: Create the complete orders table
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

-- Step 3: Create indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_character_key ON orders(character_key);
CREATE INDEX idx_orders_order_type ON orders(order_type);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_completed_at ON orders(completed_at);
CREATE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX idx_orders_webhook_event_id ON orders(webhook_event_id);
CREATE INDEX idx_orders_analytics ON orders(order_type, status, completed_at DESC);

-- Step 4: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Step 6: Test insert (will be cleaned up)
INSERT INTO orders (
  user_id,
  email,
  character_key,
  order_type,
  status,
  product_type,
  product_name,
  amount_cents
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  'test',
  'tip',
  'completed',
  'test',
  'Test Product',
  100
);

-- Step 7: Verify and clean up
SELECT COUNT(*) as test_records FROM orders WHERE email = 'test@example.com';
DELETE FROM orders WHERE email = 'test@example.com';

-- Step 8: Final verification
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND table_schema = 'public'
ORDER BY ordinal_position;