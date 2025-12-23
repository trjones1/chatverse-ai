#!/usr/bin/env tsx
import { getSupabaseAdmin } from './lib/supabaseAdmin';

async function listAllAuthUsers() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total auth users: ${data.users.length}\n`);

  if (data.users.length === 0) {
    console.log('❌ NO AUTHENTICATED USERS EXIST!');
    console.log('\nThis means:');
    console.log('  - No one has signed up via Google OAuth yet');
    console.log('  - All your users are anonymous');
    console.log('  - Retention emails cannot be sent yet');
    console.log('\nOnce users start signing in with Google, they will:');
    console.log('  1. Hit the 5-message limit');
    console.log('  2. Click "Sign in with Google"');
    console.log('  3. Get added to auth.users with email');
    console.log('  4. Become eligible for retention emails');
  } else {
    console.log('Authenticated users:');
    data.users.forEach(u => {
      const hasEmail = u.email_confirmed_at !== null && u.email_confirmed_at !== undefined;
      console.log(`  - ${u.email} (ID: ${u.id.substring(0, 8)}...)`);
      console.log(`    Confirmed: ${hasEmail ? 'Yes' : 'No'}`);
      console.log(`    Last sign in: ${u.last_sign_in_at || 'never'}`);
      console.log('');
    });
  }
}

listAllAuthUsers().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
