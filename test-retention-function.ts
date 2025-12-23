#!/usr/bin/env tsx
/**
 * Test retention email database function
 * Usage: npx tsx test-retention-function.ts
 */

import { getSupabaseAdmin } from './lib/supabaseAdmin';

async function testRetentionFunction() {
  console.log('Testing get_retention_targets() function...\n');

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc('get_retention_targets');

  if (error) {
    console.error('❌ Error calling function:', error);
    console.log('\nThis is expected if you have not run the SQL migration yet.');
    console.log('Run this in Supabase SQL Editor:');
    console.log('  supabase/migrations/20251105000000_retention_email_automation.sql');
    process.exit(1);
  }

  console.log('✅ Function call successful!');
  console.log('Found', data?.length || 0, 'users eligible for retention emails\n');

  if (data && data.length > 0) {
    console.log('Sample users who will receive retention emails:');
    data.slice(0, 5).forEach((user: any, i: number) => {
      const hours = Math.floor(user.hours_since_last_message);
      let window = '';
      if (hours >= 24 && hours < 48) window = '24h window';
      else if (hours >= 72 && hours < 96) window = '3d window';
      else if (hours >= 168 && hours < 192) window = '7d window';

      console.log(`  ${i + 1}. ${user.email}`);
      console.log(`     Last message: ${hours}h ago (${window})`);
      console.log(`     Character: ${user.character_key}`);
      console.log(`     Message count: ${user.message_count}`);
      console.log(`     Hit 5-msg limit: ${user.hit_limit ? 'Yes' : 'No'}`);
      console.log('');
    });
  } else {
    console.log('No users currently eligible. This is normal if:');
    console.log('  - All users are within 24h of last activity (too soon)');
    console.log('  - All users are paying subscribers (skipped)');
    console.log('  - All users were already emailed in last 24h');
  }
}

testRetentionFunction().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
