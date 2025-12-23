#!/usr/bin/env node

// Test script for user activity analytics endpoint
const { getSupabaseAdmin } = require('../lib/supabaseAdmin');

async function testUserActivity() {
  console.log('🔍 Testing User Activity Analytics...\n');

  try {
    const admin = getSupabaseAdmin();

    // Test basic database queries that the endpoint uses
    console.log('1. Testing profiles table access...');
    const { count: totalUsers, error: profilesError } = await admin
      .from('profiles')
      .select('id', { count: 'exact' });

    if (profilesError) {
      console.log('❌ Profiles query error:', profilesError.message);
    } else {
      console.log(`✅ Found ${totalUsers} total users`);
    }

    console.log('\n2. Testing messages table access...');
    const { data: recentMessages, error: messagesError } = await admin
      .from('messages')
      .select('id, user_id, character, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.log('❌ Messages query error:', messagesError.message);
    } else {
      console.log(`✅ Found ${recentMessages?.length || 0} recent messages`);

      if (recentMessages && recentMessages.length > 0) {
        const sample = recentMessages[0];
        console.log(`   Sample: ${sample.character} message from ${sample.user_id ? 'registered user' : 'anonymous'}`);
      }
    }

    console.log('\n3. Testing user subscriptions table access...');
    const { data: subscriptions, error: subsError } = await admin
      .from('user_subscriptions')
      .select('user_id, status')
      .eq('status', 'active')
      .limit(5);

    if (subsError) {
      console.log('❌ Subscriptions query error:', subsError.message);
    } else {
      console.log(`✅ Found ${subscriptions?.length || 0} active subscriptions`);
    }

    console.log('\n4. Testing date-based message filtering...');
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: monthlyMessages, error: monthlyError } = await admin
      .from('messages')
      .select('id')
      .gte('created_at', last30Days.toISOString());

    if (monthlyError) {
      console.log('❌ Monthly messages query error:', monthlyError.message);
    } else {
      console.log(`✅ Found ${monthlyMessages?.length || 0} messages in last 30 days`);
    }

    console.log('\n📊 Database access test complete!');
    console.log('\n🎯 Next steps:');
    console.log('1. Add ENABLE_ADMIN_TOOLS=true to your environment variables');
    console.log('2. Access /admin in your browser');
    console.log('3. The User Activity Dashboard will show comprehensive engagement metrics');

    console.log('\n📈 Metrics you\'ll see:');
    console.log('• Bounce rate (users with 0-1 messages)');
    console.log('• User engagement levels (low, medium, high)');
    console.log('• Character popularity rankings');
    console.log('• Session length and activity patterns');
    console.log('• Free vs paid user distribution');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure Supabase environment variables are set');
    console.log('2. Check database connection and permissions');
    console.log('3. Verify tables exist: profiles, messages, user_subscriptions');
  }
}

// Run the test
testUserActivity().catch(console.error);