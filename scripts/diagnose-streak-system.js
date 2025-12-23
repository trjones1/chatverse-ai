// Comprehensive diagnostic script for streak system
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseStreakSystem() {
  console.log('🔍 DIAGNOSING STREAK SYSTEM...\n');

  // 1. Check if daily_chat_activity table exists
  console.log('1. Checking daily_chat_activity table...');
  try {
    const { data: dailyData, error: dailyError } = await admin
      .from('daily_chat_activity')
      .select('*')
      .limit(1);

    if (dailyError) {
      if (dailyError.code === '42P01') {
        console.log('❌ daily_chat_activity table does NOT exist');
      } else {
        console.log('⚠️ daily_chat_activity table error:', dailyError.message);
      }
    } else {
      console.log('✅ daily_chat_activity table exists');
    }
  } catch (e) {
    console.log('❌ daily_chat_activity table check failed:', e.message);
  }

  // 2. Check if user_chat_streaks table exists
  console.log('\n2. Checking user_chat_streaks table...');
  try {
    const { data: streaksData, error: streaksError } = await admin
      .from('user_chat_streaks')
      .select('*')
      .limit(1);

    if (streaksError) {
      if (streaksError.code === '42P01') {
        console.log('❌ user_chat_streaks table does NOT exist');
      } else {
        console.log('⚠️ user_chat_streaks table error:', streaksError.message);
      }
    } else {
      console.log('✅ user_chat_streaks table exists');
    }
  } catch (e) {
    console.log('❌ user_chat_streaks table check failed:', e.message);
  }

  // 3. Check if update_user_chat_streak function exists
  console.log('\n3. Testing update_user_chat_streak function...');
  try {
    // Use a dummy UUID that won't exist
    const { data: streakResult, error: streakError } = await admin.rpc('update_user_chat_streak', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_character_key: 'test'
    });

    if (streakError) {
      if (streakError.message.includes('Could not find the function')) {
        console.log('❌ update_user_chat_streak function does NOT exist');
      } else if (streakError.code === '23503') {
        console.log('✅ update_user_chat_streak function exists (got expected foreign key error)');
      } else {
        console.log('⚠️ update_user_chat_streak function error:', {
          message: streakError.message,
          code: streakError.code,
          details: streakError.details
        });
      }
    } else {
      console.log('✅ update_user_chat_streak function works');
    }
  } catch (e) {
    console.log('❌ update_user_chat_streak function test failed:', e.message);
  }

  // 4. Check if get_user_streak_status function exists
  console.log('\n4. Testing get_user_streak_status function...');
  try {
    const { data: statusResult, error: statusError } = await admin.rpc('get_user_streak_status', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_character_key: 'test'
    });

    if (statusError) {
      if (statusError.message.includes('Could not find the function')) {
        console.log('❌ get_user_streak_status function does NOT exist');
      } else {
        console.log('⚠️ get_user_streak_status function error:', statusError.message);
      }
    } else {
      console.log('✅ get_user_streak_status function works');
    }
  } catch (e) {
    console.log('❌ get_user_streak_status function test failed:', e.message);
  }

  // 5. Check some real user data if possible
  console.log('\n5. Checking for any existing user data...');
  try {
    const { data: users, error: usersError } = await admin.auth.admin.listUsers();

    if (usersError) {
      console.log('⚠️ Could not list users:', usersError.message);
    } else if (users && users.users && users.users.length > 0) {
      const testUser = users.users[0];
      console.log('📋 Found test user:', testUser.id, testUser.email);

      // Test with real user
      console.log('\n6. Testing with real user...');
      try {
        const { data: realStreakResult, error: realStreakError } = await admin.rpc('update_user_chat_streak', {
          p_user_id: testUser.id,
          p_character_key: 'lexi'
        });

        if (realStreakError) {
          console.log('❌ Real user test failed:', {
            message: realStreakError.message,
            code: realStreakError.code,
            details: realStreakError.details
          });
        } else {
          console.log('✅ Real user test succeeded:', realStreakResult);
        }
      } catch (e) {
        console.log('❌ Real user test error:', e.message);
      }
    } else {
      console.log('📋 No users found to test with');
    }
  } catch (e) {
    console.log('⚠️ Could not check users:', e.message);
  }

  console.log('\n🎯 DIAGNOSIS COMPLETE');
  console.log('\nNext steps based on results:');
  console.log('- If tables don\'t exist: Run the streak system migration');
  console.log('- If functions don\'t exist: Run the function creation SQL');
  console.log('- If foreign key errors persist: Check auth.users table access');
}

diagnoseStreakSystem().catch(console.error);