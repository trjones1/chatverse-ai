#!/usr/bin/env node

// Simple script to enable pgcrypto extension
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('Enabling pgcrypto extension...');
  
  // Test if gen_random_bytes already works
  try {
    const { data, error } = await supabase.rpc('test_gen_random_bytes');
    if (!error) {
      console.log('✅ pgcrypto extension is already working!');
      return;
    }
  } catch (e) {
    console.log('Need to enable pgcrypto extension...');
  }

  // Check if pgcrypto extension is available
  const { data: extensions, error } = await supabase
    .from('pg_available_extensions')
    .select('name')
    .eq('name', 'pgcrypto');

  if (error) {
    console.log('❌ Could not check available extensions:', error.message);
    console.log('\n🔧 MANUAL FIX REQUIRED:');
    console.log('1. Go to Supabase Dashboard → Settings → Database');
    console.log('2. In the SQL Editor, run: CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    console.log('3. Or contact Supabase support to enable pgcrypto');
    return;
  }

  if (!extensions || extensions.length === 0) {
    console.log('❌ pgcrypto extension is not available in this database');
    console.log('Contact Supabase support to enable pgcrypto extension');
    return;
  }

  console.log('✅ pgcrypto extension is available');
  console.log('\n🔧 MANUAL FIX REQUIRED:');
  console.log('Go to Supabase Dashboard → SQL Editor and run:');
  console.log('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  console.log('\nThis will enable the gen_random_bytes() function needed for user creation.');
}

main().catch(console.error);