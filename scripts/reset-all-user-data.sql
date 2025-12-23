-- Reset All User Data Script
-- This script clears all user-related data while preserving schema and configurations
-- Use with caution - this is irreversible!

-- Disable triggers and constraints temporarily for faster execution
SET session_replication_role = replica;

BEGIN;

DO $$
DECLARE
    tables_to_clear TEXT[] := ARRAY[
        'stripe_events',
        'stripe_customers', 
        'auth.users',
        'auth.sessions',
        'auth.refresh_tokens',
        'auth.audit_log_entries',
        'auth.flow_state',
        'auth.saml_providers',
        'auth.saml_relay_states',
        'auth.sso_providers',
        'auth.sso_domains', 
        'auth.identities',
        'auth.mfa_amr_claims',
        'auth.mfa_challenges',
        'auth.mfa_factors',
        'user_subscriptions',
        'user_voice_credits',
        'daily_chat_usage',
        'messages',
        'memories',
        'relationship_progress',
        'user_character_memories'
    ];
    target_table TEXT;
    target_schema TEXT;
    full_table_name TEXT;
BEGIN
    FOREACH full_table_name IN ARRAY tables_to_clear
    LOOP
        -- Split schema and table name
        IF position('.' in full_table_name) > 0 THEN
            target_schema := split_part(full_table_name, '.', 1);
            target_table := split_part(full_table_name, '.', 2);
        ELSE
            target_schema := 'public';
            target_table := full_table_name;
        END IF;
        
        -- Check if table exists and truncate if it does
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = target_schema 
            AND table_name = target_table
        ) THEN
            EXECUTE format('TRUNCATE TABLE %I.%I CASCADE', target_schema, target_table);
            RAISE NOTICE 'Cleared table: %.%', target_schema, target_table;
        ELSE
            RAISE NOTICE 'Table does not exist, skipping: %.%', target_schema, target_table;
        END IF;
    END LOOP;
END
$$;

-- 5. Clear user preferences and settings (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
        TRUNCATE TABLE user_preferences CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_nsfw_settings') THEN
        TRUNCATE TABLE user_nsfw_settings CASCADE;
    END IF;
END
$$;

-- 6. Clear any temporary or cache tables (only if they exist)
DO $$
BEGIN
    -- Clear user_sessions if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        TRUNCATE TABLE user_sessions CASCADE;
    END IF;
    
    -- Clear user_activity_logs if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_activity_logs') THEN
        TRUNCATE TABLE user_activity_logs CASCADE;
    END IF;
    
    -- Clear email_campaigns if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
        TRUNCATE TABLE email_campaigns CASCADE;
    END IF;
    
    -- Clear email_campaign_sends if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaign_sends') THEN
        TRUNCATE TABLE email_campaign_sends CASCADE;
    END IF;
END
$$;

-- 7. Reset any sequences that might be affected
-- Note: Auth sequences are managed by Supabase and will auto-reset

-- 8. Clear any remaining user-related data (catch-all for tables we might have missed)
-- Add any other user-related tables here as needed

COMMIT;

-- Re-enable triggers and constraints
SET session_replication_role = DEFAULT;

-- Verify the reset - only check tables that exist
DO $$
DECLARE
    verification_tables TEXT[] := ARRAY[
        'auth.users',
        'user_subscriptions', 
        'messages',
        'memories',
        'user_voice_credits',
        'stripe_events'
    ];
    preserved_tables TEXT[] := ARRAY[
        'character_configs',
        'content_library'
    ];
    target_table TEXT;
    target_schema TEXT;
    full_table_name TEXT;
    row_count INT;
    result_text TEXT := E'\n=== RESET VERIFICATION ===\n';
BEGIN
    -- Check cleared tables
    result_text := result_text || E'Cleared tables:\n';
    
    FOREACH full_table_name IN ARRAY verification_tables
    LOOP
        -- Split schema and table name
        IF position('.' in full_table_name) > 0 THEN
            target_schema := split_part(full_table_name, '.', 1);
            target_table := split_part(full_table_name, '.', 2);
        ELSE
            target_schema := 'public';
            target_table := full_table_name;
        END IF;
        
        -- Check if table exists and get count
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = target_schema 
            AND table_name = target_table
        ) THEN
            EXECUTE format('SELECT count(*) FROM %I.%I', target_schema, target_table) INTO row_count;
            result_text := result_text || format('  %s.%s: %s rows remaining\n', target_schema, target_table, row_count);
        ELSE
            result_text := result_text || format('  %s.%s: table does not exist\n', target_schema, target_table);
        END IF;
    END LOOP;
    
    -- Check preserved tables
    result_text := result_text || E'\nPreserved tables:\n';
    
    FOREACH full_table_name IN ARRAY preserved_tables
    LOOP
        target_schema := 'public';
        target_table := full_table_name;
        
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = target_schema 
            AND table_name = target_table
        ) THEN
            EXECUTE format('SELECT count(*) FROM %I.%I', target_schema, target_table) INTO row_count;
            result_text := result_text || format('  %s: %s rows preserved\n', target_table, row_count);
        ELSE
            result_text := result_text || format('  %s: table does not exist\n', target_table);
        END IF;
    END LOOP;
    
    result_text := result_text || E'\n=== RESET COMPLETED SUCCESSFULLY ===\n';
    
    RAISE NOTICE '%', result_text;
END
$$;

ANALYZE;

-- Success message
SELECT 'User data reset completed successfully. All user accounts, subscriptions, messages, and memories have been cleared.' as status;