#!/usr/bin/env node

// Simply disable the problematic email trigger
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function disableTrigger() {
  console.log('🔧 Disabling problematic email preferences trigger...\n');
  
  // Try to use the SQL editor approach via Supabase client
  try {
    // First, let's check if we can at least query the database
    const { data: testQuery, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'email_preferences')
      .limit(1);
      
    if (testError) {
      console.log('❌ Database connection test failed:', testError.message);
      console.log('\n🔧 MANUAL FIX REQUIRED:');
      console.log('Go to Supabase Dashboard → SQL Editor and run:');
      console.log('DROP TRIGGER IF EXISTS create_email_preferences_for_new_user ON auth.users;');
      return;
    }
    
    console.log('✅ Database connection working');
    console.log('❌ Cannot execute DDL statements via Supabase client');
    console.log('\n🔧 MANUAL FIX REQUIRED:');
    console.log('Go to Supabase Dashboard → SQL Editor and run:');
    console.log('');
    console.log('DROP TRIGGER IF EXISTS create_email_preferences_for_new_user ON auth.users;');
    console.log('DROP FUNCTION IF EXISTS create_user_email_preferences();');
    console.log('');
    console.log('This will disable the trigger that requires gen_random_bytes()');
    console.log('User creation will work without email preferences setup');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function main() {
  console.log('🚨 SOLUTION: Disable Email Preferences Trigger');
  console.log('The trigger is causing user creation to fail because it needs pgcrypto.');
  console.log('Email preferences are not critical - we can set them up later.\n');
  
  await disableTrigger();
  
  console.log('\n📋 After disabling the trigger:');
  console.log('1. User creation via Google OAuth will work');
  console.log('2. Email preferences can be created manually when needed');
  console.log('3. Core functionality (chat, payments) will be unaffected');
  console.log('\nThis is the fastest way to get user authentication working!');
}

main().catch(console.error);