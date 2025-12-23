-- Orders Table - Centralized purchase tracking for all revenue streams
-- This table consolidates all order data from Stripe webhooks for easy analytics

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
);