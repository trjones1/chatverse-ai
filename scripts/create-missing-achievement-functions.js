// Script to create the missing achievement functions that are causing 404 errors
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function createAchievementFunctions() {
  try {
    console.log('🚀 Creating missing achievement functions...');

    // First create the table if it doesn't exist
    const createTableSQL = `
      -- Create user_achievement_milestones table if it doesn't exist
      CREATE TABLE IF NOT EXISTS user_achievement_milestones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        character_key TEXT NOT NULL,
        max_conversations_reached INTEGER DEFAULT 0,
        max_memories_created INTEGER DEFAULT 0,
        max_facts_learned INTEGER DEFAULT 0,
        first_connection_at TIMESTAMPTZ,
        getting_comfortable_at TIMESTAMPTZ,
        regular_buddy_at TIMESTAMPTZ,
        close_friend_at TIMESTAMPTZ,
        best_friends_at TIMESTAMPTZ,
        soulmate_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, character_key)
      );

      -- Create index
      CREATE INDEX IF NOT EXISTS idx_user_achievement_milestones_user_character
      ON user_achievement_milestones(user_id, character_key);
    `;

    // Execute table creation (we'll ignore errors if table exists)
    try {
      const { error } = await admin.from('user_achievement_milestones').select('id').limit(1);
      if (error && error.code === '42P01') {
        console.log('📝 Creating user_achievement_milestones table...');
        // Table doesn't exist, we need to create it via direct SQL (this won't work via Supabase client)
        console.log('⚠️ Table creation needs manual execution');
      } else {
        console.log('✅ user_achievement_milestones table exists');
      }
    } catch (e) {
      console.log('⚠️ Could not verify table existence:', e.message);
    }

    // Test the functions again to see current state
    console.log('\n🔍 Testing current function availability...');

    // Test get_achievement_status
    try {
      const { data, error } = await admin.rpc('get_achievement_status', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_character_key: 'test'
      });

      if (error) {
        if (error.message.includes('Could not find the function')) {
          console.log('❌ get_achievement_status function is missing');
        } else {
          console.log('✅ get_achievement_status function exists but returned error:', error.message);
        }
      } else {
        console.log('✅ get_achievement_status function working');
      }
    } catch (e) {
      console.log('❌ get_achievement_status test failed:', e.message);
    }

    // Test update_achievement_milestones
    try {
      const { data, error } = await admin.rpc('update_achievement_milestones', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_character_key: 'test',
        p_conversation_count: 1
      });

      if (error) {
        if (error.message.includes('Could not find the function')) {
          console.log('❌ update_achievement_milestones function is missing');
        } else {
          console.log('✅ update_achievement_milestones function exists but returned error:', error.message);
        }
      } else {
        console.log('✅ update_achievement_milestones function working');
      }
    } catch (e) {
      console.log('❌ update_achievement_milestones test failed:', e.message);
    }

    console.log('\n📋 Manual SQL needed to create missing functions:');
    console.log('='.repeat(60));

    // Output the SQL that needs to be run manually
    const functionsSQL = `
-- Create get_achievement_status function
CREATE OR REPLACE FUNCTION get_achievement_status(p_user_id UUID, p_character_key TEXT)
RETURNS JSONB AS $$
DECLARE
  milestone_record RECORD;
  achievement_status JSONB;
BEGIN
  -- Get milestone record
  SELECT * INTO milestone_record
  FROM user_achievement_milestones
  WHERE user_id = p_user_id AND character_key = p_character_key;

  -- If no record exists, return default status
  IF milestone_record IS NULL THEN
    RETURN jsonb_build_object(
      'max_conversations_reached', 0,
      'achievements', jsonb_build_object(
        'first_connection', false,
        'getting_comfortable', false,
        'regular_buddy', false,
        'close_friend', false,
        'best_friends', false,
        'soulmate', false
      )
    );
  END IF;

  -- Build achievement status
  achievement_status := jsonb_build_object(
    'max_conversations_reached', milestone_record.max_conversations_reached,
    'max_memories_created', milestone_record.max_memories_created,
    'max_facts_learned', milestone_record.max_facts_learned,
    'achievements', jsonb_build_object(
      'first_connection', milestone_record.first_connection_at IS NOT NULL,
      'getting_comfortable', milestone_record.getting_comfortable_at IS NOT NULL,
      'regular_buddy', milestone_record.regular_buddy_at IS NOT NULL,
      'close_friend', milestone_record.close_friend_at IS NOT NULL,
      'best_friends', milestone_record.best_friends_at IS NOT NULL,
      'soulmate', milestone_record.soulmate_at IS NOT NULL
    ),
    'achievement_dates', jsonb_build_object(
      'first_connection_at', milestone_record.first_connection_at,
      'getting_comfortable_at', milestone_record.getting_comfortable_at,
      'regular_buddy_at', milestone_record.regular_buddy_at,
      'close_friend_at', milestone_record.close_friend_at,
      'best_friends_at', milestone_record.best_friends_at,
      'soulmate_at', milestone_record.soulmate_at
    )
  );

  RETURN achievement_status;
END;
$$ LANGUAGE plpgsql;

-- Create update_achievement_milestones function
CREATE OR REPLACE FUNCTION update_achievement_milestones(
  p_user_id UUID,
  p_character_key TEXT,
  p_conversation_count INTEGER DEFAULT NULL,
  p_memory_count INTEGER DEFAULT NULL,
  p_fact_count INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_max_conversations INTEGER;
  milestone_record RECORD;
BEGIN
  -- Insert or get existing milestone record
  INSERT INTO user_achievement_milestones (user_id, character_key, max_conversations_reached)
  VALUES (p_user_id, p_character_key, 0)
  ON CONFLICT (user_id, character_key)
  DO NOTHING;

  -- Get current milestone record
  SELECT * INTO milestone_record
  FROM user_achievement_milestones
  WHERE user_id = p_user_id AND character_key = p_character_key;

  -- Update conversation milestones if provided
  IF p_conversation_count IS NOT NULL THEN
    -- Only update if we've reached a new high
    IF p_conversation_count > milestone_record.max_conversations_reached THEN
      UPDATE user_achievement_milestones
      SET
        max_conversations_reached = p_conversation_count,
        updated_at = NOW(),
        -- Set achievement timestamps for newly reached milestones
        first_connection_at = CASE
          WHEN milestone_record.first_connection_at IS NULL AND p_conversation_count >= 1
          THEN NOW()
          ELSE milestone_record.first_connection_at
        END,
        getting_comfortable_at = CASE
          WHEN milestone_record.getting_comfortable_at IS NULL AND p_conversation_count >= 5
          THEN NOW()
          ELSE milestone_record.getting_comfortable_at
        END,
        regular_buddy_at = CASE
          WHEN milestone_record.regular_buddy_at IS NULL AND p_conversation_count >= 10
          THEN NOW()
          ELSE milestone_record.regular_buddy_at
        END,
        close_friend_at = CASE
          WHEN milestone_record.close_friend_at IS NULL AND p_conversation_count >= 25
          THEN NOW()
          ELSE milestone_record.close_friend_at
        END,
        best_friends_at = CASE
          WHEN milestone_record.best_friends_at IS NULL AND p_conversation_count >= 50
          THEN NOW()
          ELSE milestone_record.best_friends_at
        END,
        soulmate_at = CASE
          WHEN milestone_record.soulmate_at IS NULL AND p_conversation_count >= 100
          THEN NOW()
          ELSE milestone_record.soulmate_at
        END
      WHERE user_id = p_user_id AND character_key = p_character_key;
    END IF;
  END IF;

  -- Update memory milestones if provided
  IF p_memory_count IS NOT NULL THEN
    UPDATE user_achievement_milestones
    SET
      max_memories_created = GREATEST(max_memories_created, p_memory_count),
      updated_at = NOW()
    WHERE user_id = p_user_id AND character_key = p_character_key;
  END IF;

  -- Update fact milestones if provided
  IF p_fact_count IS NOT NULL THEN
    UPDATE user_achievement_milestones
    SET
      max_facts_learned = GREATEST(max_facts_learned, p_fact_count),
      updated_at = NOW()
    WHERE user_id = p_user_id AND character_key = p_character_key;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_achievement_status TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION update_achievement_milestones TO service_role;
    `;

    console.log(functionsSQL);

    console.log('\n🎯 Summary:');
    console.log('  1. The user_achievement_milestones table needs to be created');
    console.log('  2. Two RPC functions need to be created: get_achievement_status and update_achievement_milestones');
    console.log('  3. These functions will fix the 404 errors in your logs');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

createAchievementFunctions();