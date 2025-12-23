-- Migration: Add crypto subscription support
-- This enables cryptocurrency-based subscription payments and tracking

-- Create crypto_charges table to track Coinbase Commerce charges
CREATE TABLE IF NOT EXISTS crypto_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Coinbase Commerce data
  coinbase_charge_id TEXT UNIQUE NOT NULL,
  coinbase_code TEXT UNIQUE NOT NULL,
  hosted_url TEXT NOT NULL,

  -- User and subscription data
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,

  -- Pricing information
  usd_amount DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'expired')),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,

  -- Indexes for performance
  CONSTRAINT crypto_charges_user_character_key UNIQUE (user_id, character_key, coinbase_charge_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_crypto_charges_user_id ON crypto_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_charges_character_key ON crypto_charges(character_key);
CREATE INDEX IF NOT EXISTS idx_crypto_charges_status ON crypto_charges(status);
CREATE INDEX IF NOT EXISTS idx_crypto_charges_coinbase_charge_id ON crypto_charges(coinbase_charge_id);
CREATE INDEX IF NOT EXISTS idx_crypto_charges_created_at ON crypto_charges(created_at);

-- Create crypto_subscriptions table to track active subscriptions
CREATE TABLE IF NOT EXISTS crypto_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and character info
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,

  -- Subscription details
  tier_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,

  -- Crypto payment reference
  crypto_charge_id UUID REFERENCES crypto_charges(id) ON DELETE SET NULL,
  coinbase_charge_id TEXT,

  -- Subscription period
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),

  -- Features enabled
  nsfw_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  voice_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  priority_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one active subscription per user/character
  CONSTRAINT crypto_subscriptions_unique_active UNIQUE (user_id, character_key)
);

-- Create indexes for crypto_subscriptions
CREATE INDEX IF NOT EXISTS idx_crypto_subscriptions_user_id ON crypto_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_subscriptions_character_key ON crypto_subscriptions(character_key);
CREATE INDEX IF NOT EXISTS idx_crypto_subscriptions_status ON crypto_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_subscriptions_expires_at ON crypto_subscriptions(expires_at);

-- Create function to automatically expire subscriptions
CREATE OR REPLACE FUNCTION expire_crypto_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE crypto_subscriptions
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$;

-- Create function to check if user has active crypto subscription
CREATE OR REPLACE FUNCTION check_crypto_subscription(
  p_user_id UUID,
  p_character_key TEXT
)
RETURNS TABLE (
  has_subscription BOOLEAN,
  tier_id TEXT,
  tier_name TEXT,
  expires_at TIMESTAMPTZ,
  nsfw_enabled BOOLEAN,
  voice_enabled BOOLEAN,
  priority_enabled BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN cs.id IS NOT NULL THEN TRUE ELSE FALSE END as has_subscription,
    cs.tier_id,
    cs.tier_name,
    cs.expires_at,
    cs.nsfw_enabled,
    cs.voice_enabled,
    cs.priority_enabled
  FROM crypto_subscriptions cs
  WHERE
    cs.user_id = p_user_id
    AND cs.character_key = p_character_key
    AND cs.status = 'active'
    AND cs.expires_at > NOW()
  LIMIT 1;

  -- If no active subscription found, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE as has_subscription,
      NULL::TEXT as tier_id,
      NULL::TEXT as tier_name,
      NULL::TIMESTAMPTZ as expires_at,
      FALSE as nsfw_enabled,
      FALSE as voice_enabled,
      FALSE as priority_enabled;
  END IF;
END;
$$;

-- Update trigger for crypto_charges
CREATE OR REPLACE FUNCTION update_crypto_charges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crypto_charges_updated_at
    BEFORE UPDATE ON crypto_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_crypto_charges_updated_at();

-- Update trigger for crypto_subscriptions
CREATE OR REPLACE FUNCTION update_crypto_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crypto_subscriptions_updated_at
    BEFORE UPDATE ON crypto_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_crypto_subscriptions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE crypto_charges IS 'Tracks Coinbase Commerce charge requests and their status';
COMMENT ON TABLE crypto_subscriptions IS 'Tracks active cryptocurrency-based subscriptions';
COMMENT ON FUNCTION check_crypto_subscription IS 'Checks if user has active crypto subscription for character';
COMMENT ON FUNCTION expire_crypto_subscriptions IS 'Automatically expires subscriptions past their expiry date';