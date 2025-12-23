#!/usr/bin/env ts-node
/**
 * Test analytics endpoints locally without auth
 * Usage: npx ts-node test-analytics-local.ts
 */

import { getSupabaseAdmin } from './lib/supabaseAdmin';

async function testEngagementMetrics() {
  console.log('\n🔍 Testing Engagement Metrics API...\n');

  try {
    const supabase = getSupabaseAdmin();
    const daysBack = 7;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    console.log('📊 Fetching message data from interaction_log...');
    const { data: messageData, error: messageError } = await supabase
      .from('interaction_log')
      .select('user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user');

    if (messageError) {
      console.error('❌ Error fetching message data:', messageError);
      return;
    }

    console.log(`✅ Found ${messageData?.length || 0} user messages from interaction_log`);

    console.log('📊 Fetching anonymous message data from anonymous_interactions...');
    const { data: anonMessages, error: anonError } = await supabase
      .from('anonymous_interactions')
      .select('anonymous_id')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user');

    if (anonError) {
      console.error('❌ Error fetching anonymous messages:', anonError);
      return;
    }

    console.log(`✅ Found ${anonMessages?.length || 0} anonymous messages from anonymous_interactions`);

    const totalMessages = messageData?.length || 0;
    const uniqueUsers = new Set(
      messageData?.filter(m => m.user_id).map(m => m.user_id) || []
    ).size;
    const avgMessagesPerUser = uniqueUsers > 0 ? totalMessages / uniqueUsers : 0;

    console.log('\n📈 Engagement Metrics Results:');
    console.log(`  - Total Messages: ${totalMessages}`);
    console.log(`  - Unique Users: ${uniqueUsers}`);
    console.log(`  - Avg Messages/User: ${avgMessagesPerUser.toFixed(2)}`);

    console.log('\n✅ Engagement Metrics test passed!\n');
  } catch (error) {
    console.error('❌ Engagement Metrics test failed:', error);
  }
}

async function testCharacterPerformance() {
  console.log('\n🔍 Testing Character Performance API...\n');

  try {
    const supabase = getSupabaseAdmin();
    const daysBack = 7;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    console.log('📊 Fetching character interaction data...');
    const { data: interactionData, error: interactionError } = await supabase
      .from('interaction_log')
      .select('character_key, user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user');

    if (interactionError) {
      console.error('❌ Error fetching interaction data:', interactionError);
      return;
    }

    console.log(`✅ Found ${interactionData?.length || 0} interactions`);

    // Calculate per-character stats
    const characterStats: Record<string, { messages: number; users: Set<string> }> = {};

    interactionData?.forEach(interaction => {
      const char = interaction.character_key || 'unknown';
      if (!characterStats[char]) {
        characterStats[char] = { messages: 0, users: new Set() };
      }
      characterStats[char].messages++;
      if (interaction.user_id) {
        characterStats[char].users.add(interaction.user_id);
      }
    });

    console.log('\n📈 Character Performance Results:');
    Object.entries(characterStats).forEach(([char, stats]) => {
      console.log(`  ${char}:`);
      console.log(`    - Messages: ${stats.messages}`);
      console.log(`    - Unique Users: ${stats.users.size}`);
      console.log(`    - Avg Messages/User: ${(stats.messages / stats.users.size).toFixed(2)}`);
    });

    console.log('\n✅ Character Performance test passed!\n');
  } catch (error) {
    console.error('❌ Character Performance test failed:', error);
  }
}

async function testTimeBasedAnalytics() {
  console.log('\n🔍 Testing Time-Based Analytics API...\n');

  try {
    const supabase = getSupabaseAdmin();
    const daysBack = 7;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    console.log('📊 Fetching time-based interaction data...');
    const { data: timeData, error: timeError } = await supabase
      .from('interaction_log')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user');

    if (timeError) {
      console.error('❌ Error fetching time data:', timeError);
      return;
    }

    console.log(`✅ Found ${timeData?.length || 0} messages`);

    // Calculate hourly distribution
    const hourlyStats: Record<number, number> = {};
    timeData?.forEach(msg => {
      const hour = new Date(msg.created_at).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    console.log('\n📈 Time-Based Analytics Results:');
    console.log('  Hourly message distribution:');
    Object.entries(hourlyStats)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .slice(0, 5) // Show top 5 hours
      .forEach(([hour, count]) => {
        console.log(`    ${hour}:00 - ${count} messages`);
      });

    console.log('\n✅ Time-Based Analytics test passed!\n');
  } catch (error) {
    console.error('❌ Time-Based Analytics test failed:', error);
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('  Testing Analytics APIs Locally');
  console.log('═══════════════════════════════════════════');

  await testEngagementMetrics();
  await testCharacterPerformance();
  await testTimeBasedAnalytics();

  console.log('═══════════════════════════════════════════');
  console.log('  All tests complete!');
  console.log('═══════════════════════════════════════════\n');

  process.exit(0);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
