-- Fix existing tier data and apply constraint
-- This script handles the migration of existing subscription data

-- First, let's see what tier values currently exist
-- SELECT DISTINCT tier FROM user_subscriptions;

-- Update existing tier values to match new constraint
-- Map old values to new tier system:
-- 'FREE' -> 'free'
-- 'SFW' -> 'sfw' 
-- 'NSFW' -> 'nsfw'
-- Any other variations -> 'free' (safe default)

UPDATE user_subscriptions 
SET tier = CASE 
  WHEN LOWER(tier) IN ('free', 'FREE') THEN 'free'
  WHEN LOWER(tier) IN ('sfw', 'SFW', 'paid', 'basic', 'premium') THEN 'sfw'
  WHEN LOWER(tier) IN ('nsfw', 'NSFW', 'adult', 'unlimited') THEN 'nsfw'
  ELSE 'free'  -- Default fallback for any unknown values
END
WHERE tier NOT IN ('free', 'sfw', 'nsfw');

-- Now apply the constraint (this should work after the data cleanup)
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS valid_tier;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT valid_tier 
CHECK (tier IN ('free', 'sfw', 'nsfw'));

-- Verify the constraint was applied successfully
SELECT 
  tier,
  COUNT(*) as count
FROM user_subscriptions 
GROUP BY tier;