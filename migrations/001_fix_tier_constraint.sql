-- Migration: Fix tier constraint violation
-- Date: 2025-08-31
-- Description: Update existing tier values to match new constraint

BEGIN;

-- Check current tier values (for logging/debugging)
DO $$
DECLARE
  tier_counts RECORD;
BEGIN
  RAISE NOTICE 'Current tier distribution before migration:';
  FOR tier_counts IN 
    SELECT tier, COUNT(*) as count 
    FROM user_subscriptions 
    GROUP BY tier 
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  %: % rows', tier_counts.tier, tier_counts.count;
  END LOOP;
END $$;

-- Update existing tier values to match new constraint
UPDATE user_subscriptions 
SET tier = CASE 
  WHEN LOWER(tier) IN ('free', 'FREE') THEN 'free'
  WHEN LOWER(tier) IN ('sfw', 'SFW', 'paid', 'basic', 'premium') THEN 'sfw'
  WHEN LOWER(tier) IN ('nsfw', 'NSFW', 'adult', 'unlimited') THEN 'nsfw'
  ELSE 'free'  -- Default fallback for any unknown values
END
WHERE tier NOT IN ('free', 'sfw', 'nsfw');

-- Log the number of updated rows
DO $$
BEGIN
  RAISE NOTICE 'Updated % rows to normalize tier values', 
    (SELECT COUNT(*) FROM user_subscriptions WHERE tier IN ('free', 'sfw', 'nsfw'));
END $$;

-- Drop existing constraint if it exists
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS valid_tier;

-- Add the new constraint
ALTER TABLE user_subscriptions 
ADD CONSTRAINT valid_tier 
CHECK (tier IN ('free', 'sfw', 'nsfw'));

-- Verify final state
DO $$
DECLARE
  tier_counts RECORD;
BEGIN
  RAISE NOTICE 'Final tier distribution after migration:';
  FOR tier_counts IN 
    SELECT tier, COUNT(*) as count 
    FROM user_subscriptions 
    GROUP BY tier 
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  %: % rows', tier_counts.tier, tier_counts.count;
  END LOOP;
END $$;

COMMIT;

-- Test the constraint works
INSERT INTO user_subscriptions (user_id, character_key, tier, status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'test', 'invalid', 'active');
-- This should fail with constraint violation

-- Clean up test
DELETE FROM user_subscriptions 
WHERE user_id = '00000000-0000-0000-0000-000000000000';