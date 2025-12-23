-- PRE-LAUNCH DATA NUKE SCRIPT
-- This script safely clears all test/user-generated data while preserving system configurations
--
-- CRITICAL: Run this script with extreme caution
-- RECOMMENDED: Create a full database backup before running
--
-- Usage: Review this script carefully, then run:
-- psql -h your-host -U postgres -d postgres -f pre-launch-data-nuke.sql

-- Step 1: Create backup of essential configuration data
-- (This preserves character configs, content library, and system settings)

BEGIN;

-- Create backup tables for essential data
CREATE TABLE IF NOT EXISTS backup_character_bible AS SELECT * FROM character_bible;
CREATE TABLE IF NOT EXISTS backup_character_journal_posts AS SELECT * FROM character_journal_posts;
CREATE TABLE IF NOT EXISTS backup_character_selfie_config AS SELECT * FROM character_selfie_config;
CREATE TABLE IF NOT EXISTS backup_content_library AS SELECT * FROM content_library;
CREATE TABLE IF NOT EXISTS backup_versecoins_products AS SELECT * FROM versecoins_products;
CREATE TABLE IF NOT EXISTS backup_promotional_discounts AS SELECT * FROM promotional_discounts;
CREATE TABLE IF NOT EXISTS backup_archon_sources AS SELECT * FROM archon_sources;
CREATE TABLE IF NOT EXISTS backup_archon_projects AS SELECT * FROM archon_projects;
CREATE TABLE IF NOT EXISTS backup_archon_tasks AS SELECT * FROM archon_tasks;

-- Step 2: Clear all user-generated and transactional data
-- (In dependency order to avoid foreign key violations)

-- Clear message and conversation data
DELETE FROM archived_messages;
DELETE FROM interaction_log;
DELETE FROM conversation_sessions;

-- Clear memory and user fact data
DELETE FROM episodic_memories;
DELETE FROM memory_triggers;
DELETE FROM memories;
DELETE FROM memories_backup;
DELETE FROM summaries;
DELETE FROM user_facts;
DELETE FROM emotional_states;

-- Clear streak and activity data
DELETE FROM daily_chat_activity;
DELETE FROM daily_chat_usage;
DELETE FROM user_chat_streaks;
DELETE FROM message_performance_metrics;

-- Clear financial and transaction data
DELETE FROM tips;
DELETE FROM orders;
DELETE FROM user_versecoins;
DELETE FROM versecoins_transactions;
DELETE FROM versecoins_codes;
DELETE FROM voice_credit_ledger;
DELETE FROM voice_wallets;
DELETE FROM user_voice_credits;
DELETE FROM crypto_tips;
DELETE FROM crypto_subscriptions;
DELETE FROM crypto_charges;
DELETE FROM credits_grants;
DELETE FROM promotional_discount_usage;

-- Clear subscription and access data
DELETE FROM user_subscriptions;
DELETE FROM user_character_access;
DELETE FROM founders_circle;

-- Clear content and analytics data
DELETE FROM content_analytics;
DELETE FROM character_selfie_analytics;
DELETE FROM content_generation_queue;
DELETE FROM content_schedule;

-- Clear user preferences and sessions
DELETE FROM user_message_preferences;
DELETE FROM user_sessions;
DELETE FROM user_display_names;
DELETE FROM user_activity_logs;

-- Clear email and communication logs
DELETE FROM email_logs;
DELETE FROM email_unsubscribes;

-- Clear Stripe event tracking
DELETE FROM stripe_events;

-- Clear profiles (but keep auth.users for any beta users you want to preserve)
DELETE FROM profiles;

-- Step 3: Reset sequences and counters
-- Reset any auto-incrementing sequences to start fresh

-- Reset founders circle numbering (if you want to start from 1 again)
-- This depends on how your founder numbering works

-- Step 4: Verify critical data is preserved
-- Check that essential configuration data still exists

DO $$
DECLARE
    character_count INTEGER;
    content_count INTEGER;
    products_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO character_count FROM character_bible;
    SELECT COUNT(*) INTO content_count FROM content_library;
    SELECT COUNT(*) INTO products_count FROM versecoins_products;

    RAISE NOTICE 'Post-nuke verification:';
    RAISE NOTICE 'Character configs preserved: %', character_count;
    RAISE NOTICE 'Content library items preserved: %', content_count;
    RAISE NOTICE 'VerseCoins products preserved: %', products_count;

    IF character_count = 0 OR products_count = 0 THEN
        RAISE EXCEPTION 'CRITICAL: Essential configuration data was lost! Rolling back...';
    END IF;
END $$;

-- Optional: Clear specific auth users (uncomment if you want to clear test users)
-- DELETE FROM auth.users WHERE email LIKE '%+test%' OR email LIKE '%test@%';

COMMIT;

-- Step 5: Cleanup backup tables (uncomment after verifying everything works)
-- DROP TABLE IF EXISTS backup_character_bible;
-- DROP TABLE IF EXISTS backup_character_journal_posts;
-- DROP TABLE IF EXISTS backup_character_selfie_config;
-- DROP TABLE IF EXISTS backup_content_library;
-- DROP TABLE IF EXISTS backup_versecoins_products;
-- DROP TABLE IF EXISTS backup_promotional_discounts;
-- DROP TABLE IF EXISTS backup_archon_sources;
-- DROP TABLE IF EXISTS backup_archon_projects;
-- DROP TABLE IF EXISTS backup_archon_tasks;

-- Final verification queries (run these after the script completes)
/*
SELECT 'messages' as table_name, COUNT(*) as remaining_records FROM interaction_log
UNION ALL
SELECT 'tips', COUNT(*) FROM tips
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'user_versecoins', COUNT(*) FROM user_versecoins
UNION ALL
SELECT 'user_subscriptions', COUNT(*) FROM user_subscriptions
UNION ALL
SELECT 'founders_circle', COUNT(*) FROM founders_circle
UNION ALL
SELECT 'daily_chat_activity', COUNT(*) FROM daily_chat_activity
UNION ALL
SELECT 'user_chat_streaks', COUNT(*) FROM user_chat_streaks
UNION ALL
SELECT 'character_bible', COUNT(*) FROM character_bible
UNION ALL
SELECT 'content_library', COUNT(*) FROM content_library
UNION ALL
SELECT 'versecoins_products', COUNT(*) FROM versecoins_products;
*/