#!/usr/bin/env node

// Test script for email retention system
// Usage: node scripts/test-email-system.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEmailSystemSetup() {
  console.log('🧪 Testing Email Retention System Setup...\n');

  try {
    // Test 1: Check database tables exist
    console.log('1. Checking database tables...');
    const tables = [
      'email_templates',
      'email_campaigns', 
      'email_preferences',
      'email_sends',
      'email_campaign_queue',
      'user_activity_tracking'
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`   ❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ Table ${table}: OK`);
      }
    }

    // Test 2: Check email templates
    console.log('\n2. Checking email templates...');
    const { data: templates, error: templateError } = await supabase
      .from('email_templates')
      .select('*');

    if (templateError) {
      console.log(`   ❌ Templates: ${templateError.message}`);
    } else {
      console.log(`   ✅ Found ${templates.length} email templates`);
      templates.forEach(template => {
        console.log(`      - ${template.template_key} (${template.character_key})`);
      });
    }

    // Test 3: Check campaigns
    console.log('\n3. Checking email campaigns...');
    const { data: campaigns, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*');

    if (campaignError) {
      console.log(`   ❌ Campaigns: ${campaignError.message}`);
    } else {
      console.log(`   ✅ Found ${campaigns.length} email campaigns`);
      campaigns.forEach(campaign => {
        console.log(`      - ${campaign.campaign_key} (${campaign.character_key})`);
      });
    }

    // Test 4: Check database functions
    console.log('\n4. Testing database functions...');
    
    // Test get_inactive_users_for_campaigns function
    const { data: inactiveUsers, error: inactiveError } = await supabase.rpc(
      'get_inactive_users_for_campaigns',
      { min_days: 7, max_days: 30, result_limit: 5 }
    );

    if (inactiveError) {
      console.log(`   ❌ get_inactive_users_for_campaigns: ${inactiveError.message}`);
    } else {
      console.log(`   ✅ get_inactive_users_for_campaigns: Found ${inactiveUsers.length} inactive users`);
    }

    // Test email campaign analytics function
    const { data: analytics, error: analyticsError } = await supabase.rpc(
      'get_email_campaign_analytics',
      { date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
    );

    if (analyticsError) {
      console.log(`   ❌ get_email_campaign_analytics: ${analyticsError.message}`);
    } else {
      console.log(`   ✅ get_email_campaign_analytics: OK (${analytics.length} results)`);
    }

    // Test 5: Environment variables
    console.log('\n5. Checking environment variables...');
    const requiredEnvVars = [
      'RESEND_API_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CRON_SECRET'
    ];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`   ✅ ${envVar}: Set`);
      } else {
        console.log(`   ❌ ${envVar}: Missing`);
      }
    }

    console.log('\n🎉 Email system testing complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Set up Resend API key in environment variables');
    console.log('   2. Configure CRON_SECRET for automated campaigns');
    console.log('   3. Set up cron job to call /api/email/process-campaigns');
    console.log('   4. Test email sending with /api/email/send-retention');
    console.log('   5. Configure Resend webhook endpoint: /api/email/webhook');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test email personalization (if user ID provided)
async function testEmailPersonalization(userId) {
  console.log(`\n🎭 Testing email personalization for user: ${userId}`);

  try {
    // Get user's memory data
    const { data: memoryData } = await supabase.rpc('get_comprehensive_memory', {
      p_user_id: userId,
      p_character_key: 'lexi',
      p_episode_limit: 3
    });

    console.log('   Memory data:', JSON.stringify(memoryData, null, 2));

    // Get user activity
    const { data: activityData } = await supabase.rpc('get_user_last_activity', {
      p_user_id: userId
    });

    console.log('   Activity data:', JSON.stringify(activityData, null, 2));

  } catch (error) {
    console.error('❌ Personalization test failed:', error);
  }
}

// Main execution
async function main() {
  await testEmailSystemSetup();
  
  // If user ID provided as argument, test personalization
  const userId = process.argv[2];
  if (userId) {
    await testEmailPersonalization(userId);
  }
  
  process.exit(0);
}

main();