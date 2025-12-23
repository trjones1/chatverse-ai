-- VerseCoins Promotional Discount System
-- Migration: 20250919000000_create_promotional_discounts.sql

-- Create promotional_discounts table
CREATE TABLE IF NOT EXISTS promotional_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    badge VARCHAR(100), -- Display badge like "🎉 NEW USER", "⚡ FLASH SALE"

    -- Discount type and calculation
    type VARCHAR(50) NOT NULL CHECK (type IN ('percentage_bonus', 'flat_bonus', 'first_purchase_bonus', 'bulk_bonus')),
    bonus_credits INTEGER NOT NULL DEFAULT 0,
    bonus_percentage DECIMAL(5,2), -- For percentage-based bonuses (e.g., 15.00 for 15%)

    -- Conditions
    condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN ('always', 'first_purchase', 'product_id', 'minimum_purchase', 'promo_code', 'date_range', 'user_tier')),
    condition_value JSONB, -- Flexible storage for condition parameters

    -- Scheduling
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,

    -- Usage limits
    max_uses INTEGER, -- Global usage limit
    max_uses_per_user INTEGER DEFAULT 1, -- Per-user usage limit
    current_uses INTEGER DEFAULT 0, -- Track global usage

    -- Priority and stacking
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    stackable BOOLEAN DEFAULT true, -- Can combine with other discounts

    -- Status
    active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create promotional_discount_usage table to track individual usage
CREATE TABLE IF NOT EXISTS promotional_discount_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    discount_id UUID NOT NULL REFERENCES promotional_discounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Usage details
    product_id VARCHAR(100), -- Which VerseCoins product was purchased
    credits_awarded INTEGER NOT NULL,
    order_reference VARCHAR(255), -- Reference to Gumroad order or redemption

    -- Context
    context JSONB, -- Store additional context like promo code used, etc.

    -- Timestamps
    used_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(discount_id, user_id, product_id) -- Prevent duplicate usage for same discount/user/product
);

-- Create indexes for performance
CREATE INDEX idx_promotional_discounts_active ON promotional_discounts(active) WHERE active = true;
CREATE INDEX idx_promotional_discounts_dates ON promotional_discounts(start_date, end_date);
CREATE INDEX idx_promotional_discounts_condition_type ON promotional_discounts(condition_type);
CREATE INDEX idx_promotional_discounts_priority ON promotional_discounts(priority DESC);

CREATE INDEX idx_promotional_discount_usage_user ON promotional_discount_usage(user_id);
CREATE INDEX idx_promotional_discount_usage_discount ON promotional_discount_usage(discount_id);
CREATE INDEX idx_promotional_discount_usage_product ON promotional_discount_usage(product_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_promotional_discounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_promotional_discounts_updated_at
    BEFORE UPDATE ON promotional_discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_promotional_discounts_updated_at();

-- Insert sample promotional rules (migrating from code)
INSERT INTO promotional_discounts (
    name, description, badge, type, bonus_credits, condition_type, condition_value, priority, stackable, active
) VALUES
(
    'Welcome Bonus',
    'Special bonus for first-time VerseCoins purchasers',
    '🎉 NEW USER',
    'first_purchase_bonus',
    100,
    'first_purchase',
    '{}',
    10,
    true,
    true
),
(
    'Flash Friday',
    '15% bonus credits on all VerseCoins purchases',
    '⚡ FLASH SALE',
    'percentage_bonus',
    0,
    'always',
    '{"percentage": 15}',
    5,
    true,
    true
),
(
    'Founder Exclusive',
    'Exclusive bonus for Founder Pack purchases',
    '👑 FOUNDER',
    'flat_bonus',
    500,
    'product_id',
    '{"product_id": "founder_pack"}',
    8,
    true,
    true
);

-- Create RLS (Row Level Security) policies
ALTER TABLE promotional_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_discount_usage ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active promotions
CREATE POLICY "Allow public read access to active promotions" ON promotional_discounts
    FOR SELECT USING (active = true);

-- Allow admin users full access (you'll need to define admin check)
CREATE POLICY "Allow admin full access to promotions" ON promotional_discounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN ('your-admin-email@example.com') -- Replace with your admin emails
        )
    );

-- Allow users to read their own usage records
CREATE POLICY "Allow users to read own usage" ON promotional_discount_usage
    FOR SELECT USING (user_id = auth.uid());

-- Allow service role to insert usage records
CREATE POLICY "Allow service role to insert usage" ON promotional_discount_usage
    FOR INSERT WITH CHECK (true);

-- Create view for admin dashboard
CREATE OR REPLACE VIEW promotional_discounts_with_stats AS
SELECT
    pd.*,
    COALESCE(usage_stats.total_uses, 0) as actual_uses,
    COALESCE(usage_stats.unique_users, 0) as unique_users_count,
    COALESCE(usage_stats.total_credits_awarded, 0) as total_credits_awarded,
    CASE
        WHEN pd.end_date IS NOT NULL AND pd.end_date < NOW() THEN 'expired'
        WHEN pd.start_date IS NOT NULL AND pd.start_date > NOW() THEN 'scheduled'
        WHEN pd.active = false THEN 'inactive'
        ELSE 'active'
    END as status
FROM promotional_discounts pd
LEFT JOIN (
    SELECT
        discount_id,
        COUNT(*) as total_uses,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(credits_awarded) as total_credits_awarded
    FROM promotional_discount_usage
    GROUP BY discount_id
) usage_stats ON pd.id = usage_stats.discount_id;

-- Grant permissions
GRANT SELECT ON promotional_discounts_with_stats TO authenticated;
GRANT SELECT ON promotional_discounts_with_stats TO anon;

-- Comment the tables
COMMENT ON TABLE promotional_discounts IS 'Stores promotional discount rules for VerseCoins system';
COMMENT ON TABLE promotional_discount_usage IS 'Tracks individual usage of promotional discounts by users';
COMMENT ON VIEW promotional_discounts_with_stats IS 'Admin view showing promotions with usage statistics';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'VerseCoins promotional discount tables created successfully!';
    RAISE NOTICE 'Tables: promotional_discounts, promotional_discount_usage';
    RAISE NOTICE 'View: promotional_discounts_with_stats';
    RAISE NOTICE 'Sample promotions inserted: Welcome Bonus, Flash Friday, Founder Exclusive';
END $$;