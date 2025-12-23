-- Add COMEBACK 2-for-1 Promo Code for Retargeting Campaign
-- Run this in Supabase SQL Editor

-- Insert the COMEBACK promo code
INSERT INTO promotional_discounts (
    name,
    description,
    badge,
    type,
    bonus_credits,
    condition_type,
    condition_value,
    start_date,
    end_date,
    max_uses_per_user,
    priority,
    stackable,
    active
) VALUES (
    'Comeback 2-for-1',
    'Get 1000 VerseCoins for the price of 500! Perfect for users who abandoned checkout - 50% off their first purchase',
    '🔥 50% OFF',
    'flat_bonus',
    500, -- Doubles the 500 VC pack to 1000 VC total
    'promo_code',
    '{"promo_code": "COMEBACK"}', -- Case-insensitive code
    NOW(), -- Start immediately
    NOW() + INTERVAL '30 days', -- Valid for 30 days
    1, -- One use per user only
    11, -- HIGHEST priority - overrides Welcome Bonus (10) and all other discounts
    false, -- NOT stackable - this is already a huge discount
    true -- Active immediately
)
ON CONFLICT DO NOTHING;

-- Verify the promo code was added
SELECT
    name,
    badge,
    bonus_credits,
    condition_value->>'promo_code' as promo_code,
    start_date,
    end_date,
    max_uses_per_user,
    active,
    CASE
        WHEN end_date < NOW() THEN '❌ Expired'
        WHEN start_date > NOW() THEN '⏰ Scheduled'
        WHEN active = false THEN '🚫 Inactive'
        ELSE '✅ Active'
    END as status
FROM promotional_discounts
WHERE condition_value->>'promo_code' = 'COMEBACK';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 COMEBACK promo code created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Promo Details:';
    RAISE NOTICE '  Code: COMEBACK';
    RAISE NOTICE '  Offer: Buy 500 VC → Get 1000 VC (2-for-1)';
    RAISE NOTICE '  Value: 50%% off ($4.99 for 2 weeks premium)';
    RAISE NOTICE '  Limit: One per user';
    RAISE NOTICE '  Expires: 30 days from now';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Usage in Ads:';
    RAISE NOTICE '  "Use code COMEBACK for 50%% OFF!"';
    RAISE NOTICE '  "Get 2 weeks with Lexi for $4.99 🔥"';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Target Audience: InitiateCheckout abandoners (282 users)';
END $$;
