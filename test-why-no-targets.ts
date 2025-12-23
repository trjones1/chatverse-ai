#!/usr/bin/env tsx
import { getSupabaseAdmin } from './lib/supabaseAdmin';

async function checkExclusions() {
  const supabase = getSupabaseAdmin();
  const userId = '75bf3083-c5c7-4a02-ae6f-1b69dd27d2f6';

  console.log('Checking why user is excluded from retention emails...\n');

  // Check recent retention emails
  const { data: recentEmails } = await supabase
    .from('email_logs')
    .select('*')
    .eq('user_id', userId)
    .like('campaign_type', 'retention%')
    .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  console.log('1. Recent retention emails (last 24h):', recentEmails?.length || 0);
  if (recentEmails && recentEmails.length > 0) {
    console.log('   ❌ EXCLUDED: User was sent retention email recently');
    recentEmails.forEach(e => {
      console.log(`      - ${e.campaign_type} at ${e.sent_at}`);
    });
  } else {
    console.log('   ✅ Not excluded by recent emails');
  }

  // Check unsubscribes
  const { data: unsubscribe } = await supabase
    .from('email_unsubscribes')
    .select('*')
    .eq('user_id', userId);

  console.log('\n2. Unsubscribed:', unsubscribe?.length || 0);
  if (unsubscribe && unsubscribe.length > 0) {
    console.log('   ❌ EXCLUDED: User unsubscribed from emails');
  } else {
    console.log('   ✅ Not excluded by unsubscribe');
  }

  // Check active subscriptions
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  console.log('\n3. Active subscriptions:', subscription?.length || 0);
  if (subscription && subscription.length > 0) {
    console.log('   ❌ EXCLUDED: User has active subscription');
    subscription.forEach(s => {
      console.log(`      - Tier: ${s.tier}, Character: ${s.character_key}`);
      console.log(`      - Period end: ${s.current_period_end}`);
      const periodEnd = s.current_period_end ? new Date(s.current_period_end) : null;
      if (periodEnd && periodEnd > new Date()) {
        console.log(`      - Status: Active (expires in future)`);
      } else if (!s.current_period_end) {
        console.log(`      - Status: Active (no expiration)`);
      } else {
        console.log(`      - Status: Expired`);
      }
    });
  } else {
    console.log('   ✅ Not excluded by active subscription');
  }

  // Check if email confirmed
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  const hasConfirmedEmail = userData.user && userData.user.email_confirmed_at !== null;

  console.log('\n4. Email status:');
  console.log('   Email:', userData.user?.email || 'none');
  console.log('   Confirmed:', hasConfirmedEmail ? 'Yes ✅' : 'No ❌');

  if (!hasConfirmedEmail) {
    console.log('   ❌ EXCLUDED: Email not confirmed');
  }
}

checkExclusions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
