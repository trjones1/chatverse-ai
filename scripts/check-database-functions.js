// Script to check which RPC functions exist in the database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function checkFunctions() {
  try {
    console.log('🔍 Checking database functions...');

    // Test update_user_chat_streak
    console.log('\n1. Testing update_user_chat_streak...');
    try {
      const { data, error } = await admin.rpc('update_user_chat_streak', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        p_character_key: 'test'
      });

      if (error) {
        console.log('❌ update_user_chat_streak error:', error.message);
      } else {
        console.log('✅ update_user_chat_streak function exists and is callable');
      }
    } catch (e) {
      console.log('❌ update_user_chat_streak failed:', e.message);
    }

    // Test get_achievement_status
    console.log('\n2. Testing get_achievement_status...');
    try {
      const { data, error } = await admin.rpc('get_achievement_status', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        p_character_key: 'test'
      });

      if (error) {
        console.log('❌ get_achievement_status error:', error.message);
      } else {
        console.log('✅ get_achievement_status function exists and is callable');
      }
    } catch (e) {
      console.log('❌ get_achievement_status failed:', e.message);
    }

    // Test update_achievement_milestones
    console.log('\n3. Testing update_achievement_milestones...');
    try {
      const { data, error } = await admin.rpc('update_achievement_milestones', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        p_character_key: 'test',
        p_conversation_count: 1
      });

      if (error) {
        console.log('❌ update_achievement_milestones error:', error.message);
      } else {
        console.log('✅ update_achievement_milestones function exists and is callable');
      }
    } catch (e) {
      console.log('❌ update_achievement_milestones failed:', e.message);
    }

    // Test get_user_streak_status
    console.log('\n4. Testing get_user_streak_status...');
    try {
      const { data, error } = await admin.rpc('get_user_streak_status', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        p_character_key: 'test'
      });

      if (error) {
        console.log('❌ get_user_streak_status error:', error.message);
      } else {
        console.log('✅ get_user_streak_status function exists and is callable');
      }
    } catch (e) {
      console.log('❌ get_user_streak_status failed:', e.message);
    }

    console.log('\n🎯 Function check completed!');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkFunctions();