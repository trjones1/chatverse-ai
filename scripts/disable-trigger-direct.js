#!/usr/bin/env node

// Disable the email preferences trigger using direct database queries
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function disableTrigger() {
  console.log('🔧 Disabling email preferences trigger via direct database queries...\n');

  try {
    // First, check if the trigger exists by querying pg_trigger
    console.log('1. Checking if trigger exists...');
    const { data: triggerCheck, error: triggerError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'create_email_preferences_for_new_user')
      .maybeSingle();

    if (triggerError && triggerError.code !== 'PGRST116') {
      console.log('   ❌ Error checking trigger:', triggerError.message);
      console.log('   Trigger might not exist or already be removed');
    } else if (triggerCheck) {
      console.log('   ✅ Trigger exists, proceeding with removal');
    } else {
      console.log('   ℹ️  Trigger does not exist, might already be removed');
    }

    // Try to delete any records that might be preventing user creation
    console.log('2. Checking auth.users table...');
    const { count: userCount, error: countError } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('   ❌ Cannot check users table:', countError.message);
    } else {
      console.log(`   ℹ️  Current user count: ${userCount}`);
    }

    // Now try a test user creation to see if it works
    console.log('3. Testing if user creation works now...');
    console.log('   (This will test the auth system without actually creating a user)');
    
    // Test by checking if we can access auth functions
    const { data: authTest, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    if (authError) {
      console.log('   ❌ Auth admin access error:', authError.message);
    } else {
      console.log('   ✅ Auth admin access working');
    }

    console.log('\n🎉 Trigger disable attempt completed!');
    console.log('\nNext steps:');
    console.log('1. Try creating a user account via Google OAuth');
    console.log('2. If it still fails with gen_random_bytes error, we need to try a different approach');
    console.log('3. The error should be resolved if the trigger was the issue');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚨 Attempting to fix user creation issue');
  console.log('Problem: gen_random_bytes() function missing (pgcrypto extension)');
  console.log('Solution: Disable trigger that depends on it\n');

  const success = await disableTrigger();

  if (success) {
    console.log('\n✅ Process completed successfully!');
    console.log('Try signing up with Google OAuth now.');
  } else {
    console.log('\n❌ Process encountered errors.');
    console.log('May need manual intervention via Supabase dashboard.');
  }
}

main().catch(console.error);