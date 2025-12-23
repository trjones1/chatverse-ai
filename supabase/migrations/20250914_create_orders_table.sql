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
  product_type TEXT NOT NULL, -- sfw_premium, nsfw_premium, voice_10, voice_25, etc.
  product_name TEXT NOT NULL, -- Human readable: "SFW Premium", "Voice Pack (25 credits)", etc.
  tier TEXT, -- sfw, nsfw, voice_pack_10, etc. (for legacy compatibility)
  
  -- Financial data
  amount_cents INTEGER NOT NULL, -- Total amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_price_id TEXT,
  quantity INTEGER DEFAULT 1,
  
  -- Voice pack specific data
  voice_credits INTEGER DEFAULT 0, -- Number of voice credits granted
  
  -- Subscription specific data
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  subscription_status TEXT, -- active, cancelled, past_due, etc.
  
  -- Tip specific data
  tip_amount_cents INTEGER, -- For tips, same as amount_cents but clearer semantics
  tip_character TEXT, -- Character the tip was sent to
  
  -- Metadata and tracking
  stripe_customer_id TEXT,
  stripe_metadata JSONB, -- Store full Stripe metadata
  webhook_event_id TEXT, -- Stripe webhook event ID for deduplication
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ, -- When payment was completed
  refunded_at TIMESTAMPTZ -- When refund occurred (if applicable)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_character_key ON orders(character_key);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_subscription_id ON orders(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_orders_webhook_event_id ON orders(webhook_event_id);

-- Composite indexes for analytics
CREATE INDEX IF NOT EXISTS idx_orders_analytics ON orders(order_type, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_revenue ON orders(status, completed_at DESC) WHERE status = 'completed';

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Comments for documentation
COMMENT ON TABLE orders IS 'Centralized table for tracking all purchases from Stripe webhooks including subscriptions, voice packs, and tips';
COMMENT ON COLUMN orders.order_type IS 'Type of purchase: subscription, voice_pack, tip, one_time';
COMMENT ON COLUMN orders.product_type IS 'Specific product identifier matching payment-utils.ts types';
COMMENT ON COLUMN orders.amount_cents IS 'Total purchase amount in cents';
COMMENT ON COLUMN orders.voice_credits IS 'Number of voice credits granted (for voice packs)';
COMMENT ON COLUMN orders.stripe_metadata IS 'Full Stripe metadata for debugging and additional context';
COMMENT ON COLUMN orders.webhook_event_id IS 'Stripe webhook event ID for idempotency';