-- 🗑️ ADMIN CLEANUP SQL FOR TESTING
-- Use this to reset everything for clean testing with the same email addresses

-- ⚠️  WARNING: THIS WILL DELETE ALL USER DATA - USE ONLY FOR TESTING! ⚠️

BEGIN;

-- 1. Clear all user subscriptions
DELETE FROM user_subscriptions;

-- 2. Clear all voice wallets and credits  
DELETE FROM voice_credit_ledger;
DELETE FROM voice_wallets;

-- 3. Clear all tip jar data
DELETE FROM tip_ledger;

-- 4. Clear all memories and chat data
DELETE FROM lexi_mem_interactions;
DELETE FROM lexi_mem_episodes; 
DELETE FROM lexi_mem_facts;
DELETE FROM memories;

-- 5. Clear daily chat usage tracking
DELETE FROM daily_chat_usage;

-- 6. Clear user display names
DELETE FROM user_display_names;

-- 7. OPTIONAL: Clear all users (uncomment if you want full reset)
-- DELETE FROM auth.users;

COMMIT;

-- 🎯 VERIFICATION QUERIES
-- Run these to confirm cleanup worked:

SELECT 'User Subscriptions' as table_name, COUNT(*) as count FROM user_subscriptions
UNION ALL
SELECT 'Voice Wallets', COUNT(*) FROM voice_wallets  
UNION ALL
SELECT 'Voice Credits', COUNT(*) FROM voice_credit_ledger
UNION ALL
SELECT 'Tip Ledger', COUNT(*) FROM tip_ledger
UNION ALL
SELECT 'Memories', COUNT(*) FROM memories
UNION ALL
SELECT 'Chat Usage', COUNT(*) FROM daily_chat_usage
UNION ALL
SELECT 'Display Names', COUNT(*) FROM user_display_names
UNION ALL
SELECT 'Total Users', COUNT(*) FROM auth.users;

-- 📊 QUICK TEST DATA SETUP (Optional)
-- Uncomment to create test user subscriptions:

/*
INSERT INTO user_subscriptions (user_id, character_key, tier, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'lexi', 'free', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'chase', 'sfw', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'dom', 'nsfw', 'active');
*/