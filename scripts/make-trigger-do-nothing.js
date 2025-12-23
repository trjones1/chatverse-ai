#!/usr/bin/env node

// Replace the problematic trigger function with a no-op version
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function makeEmptyTrigger() {
  console.log('🔧 Making email preferences trigger do nothing...\n');

  // Create a simple no-op trigger function
  const noOpFunction = `
CREATE OR REPLACE FUNCTION create_user_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger now does nothing to avoid gen_random_bytes issues
  -- Email preferences can be created manually if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `.trim();

  console.log('Creating no-op trigger function...');
  console.log('This function will simply return NEW without doing anything.');

  // We can't execute DDL via the Supabase client, so let's provide the SQL
  console.log('\n📋 MANUAL STEP REQUIRED:');
  console.log('Go to Supabase Dashboard → SQL Editor and run this SQL:');
  console.log('\n' + '='.repeat(60));
  console.log(noOpFunction);
  console.log('='.repeat(60));

  console.log('\n✅ This will replace the problematic function with one that:');
  console.log('   • Does nothing (no email preferences creation)');
  console.log('   • Does not use gen_random_bytes() or any pgcrypto functions');
  console.log('   • Simply returns NEW to satisfy the trigger requirement');
  console.log('   • Allows user creation to proceed normally');

  console.log('\n🎯 After running this SQL:');
  console.log('   1. User signup via Google OAuth will work');
  console.log('   2. No more gen_random_bytes errors');
  console.log('   3. Core functionality remains intact');
  console.log('   4. Email preferences can be added manually later if needed');

  return noOpFunction;
}

async function main() {
  console.log('🚨 FINAL SOLUTION: Make Trigger Do Nothing');
  console.log('Instead of disabling the trigger, we replace it with a no-op function.\n');

  const sqlToRun = await makeEmptyTrigger();

  console.log('\n📝 Copy and paste the SQL above into Supabase Dashboard SQL Editor');
  console.log('Then try creating a user account - it should work immediately!');
}

main().catch(console.error);