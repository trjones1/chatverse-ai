#!/usr/bin/env node

// Debug script to check user subscription data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function debugUserSubscription() {
  console.log('🔍 Debugging user subscription data...\n');

  try {
    // 1. Check all users in auth.users
    console.log('1. Checking auth.users table...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('   ❌ Error listing users:', usersError.message);
      return;
    }

    console.log(`   ✅ Found ${users.users.length} users:`);
    users.users.forEach((user, i) => {
      console.log(`   ${i + 1}. User ID: ${user.id}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Created: ${user.created_at}`);
      console.log(`      Last Sign In: ${user.last_sign_in_at}`);
      console.log('');
    });

    // 2. Check user subscriptions
    console.log('2. Checking user_subscriptions table...');
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (subError) {
      console.log('   ❌ Error querying subscriptions:', subError.message);
    } else {
      console.log(`   ✅ Found ${subscriptions.length} subscriptions:`);
      subscriptions.forEach((sub, i) => {
        console.log(`   ${i + 1}. User ID: ${sub.user_id}`);
        console.log(`      Character: ${sub.character_key}`);
        console.log(`      Tier: ${sub.tier}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Subscription ID: ${sub.subscription_id}`);
        console.log(`      Created: ${sub.created_at}`);
        console.log('');
      });
    }

    // 3. Test get_user_entitlements function for each user
    console.log('3. Testing get_user_entitlements function...');
    for (const user of users.users) {
      console.log(`   Testing for user: ${user.email} (${user.id})`);
      
      // Test with different characters
      const characters = ['lexi', 'dom', 'nyx', 'aiko', 'chase'];
      for (const character of characters) {
        const { data: entitlements, error: entError } = await supabase.rpc('get_user_entitlements', {
          p_user_id: user.id,
          p_character_key: character
        });

        if (entError) {
          console.log(`      ❌ ${character}: ${entError.message}`);
        } else {
          const result = entitlements?.[0];
          if (result && result.tier !== 'free') {
            console.log(`      ✅ ${character}: ${result.tier} (${result.status})`);
          } else {
            console.log(`      📱 ${character}: free tier`);
          }
        }
      }
      console.log('');
    }

    // 4. Check if function returns correct structure
    if (users.users.length > 0) {
      const testUser = users.users[0];
      console.log('4. Testing function output structure...');
      const { data: testResult, error: testError } = await supabase.rpc('get_user_entitlements', {
        p_user_id: testUser.id,
        p_character_key: 'dom'
      });

      if (testError) {
        console.log('   ❌ Function error:', testError.message);
        console.log('   Full error:', JSON.stringify(testError, null, 2));
      } else {
        console.log('   ✅ Function output:', JSON.stringify(testResult, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function main() {
  console.log('🚨 Debug User Subscription Data');
  console.log('This script checks if your user and subscription data is properly linked.\n');
  
  await debugUserSubscription();
  
  console.log('✅ Debug complete!');
  console.log('If you have a subscription but entitlements show free tier, there\'s a linking issue.');
}

main().catch(console.error);