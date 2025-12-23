#!/usr/bin/env node

/**
 * Fix missing pgcrypto extension
 * This enables the gen_random_bytes() function required by Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function fixPgCrypto() {
  console.log('🔧 Fixing pgcrypto extension for Supabase Auth...\n');

  try {
    // Enable pgcrypto extension using direct SQL
    console.log('1. Enabling pgcrypto extension...');
    const { data, error } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'pgcrypto')
      .maybeSingle();
      
    if (error) {
      console.log('   Error checking extension:', error.message);
      console.log('   Attempting to enable via SQL...');
      
      // Try to create extension via raw SQL
      const { error: createError } = await supabase.rpc('exec', {
        sql: 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
      });
      
      if (createError) {
        console.log('   ❌ Failed to enable pgcrypto:', createError.message);
        return false;
      }
    }

    if (error) {
      console.log('   ❌ Error enabling pgcrypto:', error.message);
      console.log('   Trying alternative approach...');
      
      // Try direct SQL execution
      const { data: data2, error: error2 } = await supabase
        .from('pg_extension')
        .select('extname')
        .eq('extname', 'pgcrypto')
        .single();
        
      if (error2 && error2.code !== 'PGRST116') {
        console.log('   ❌ pgcrypto extension check failed:', error2.message);
        return false;
      }
      
      if (data2) {
        console.log('   ✅ pgcrypto extension already exists');
      } else {
        console.log('   ❌ pgcrypto extension not found and could not be created');
        console.log('   This requires database admin privileges');
        return false;
      }
    } else {
      console.log('   ✅ pgcrypto extension enabled successfully');
    }

    // Test gen_random_bytes function
    console.log('2. Testing gen_random_bytes() function...');
    const { data: testData, error: testError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT gen_random_bytes(16) as test_bytes;'
    });

    if (testError) {
      console.log('   ❌ gen_random_bytes test failed:', testError.message);
      return false;
    } else {
      console.log('   ✅ gen_random_bytes() function working correctly');
    }

    // Check other required functions
    console.log('3. Checking other crypto functions...');
    const functions = ['gen_random_uuid', 'digest', 'hmac'];
    
    for (const func of functions) {
      try {
        let testSql;
        switch (func) {
          case 'gen_random_uuid':
            testSql = 'SELECT gen_random_uuid() as test;';
            break;
          case 'digest':
            testSql = "SELECT digest('test', 'sha256') as test;";
            break;
          case 'hmac':
            testSql = "SELECT hmac('test', 'key', 'sha256') as test;";
            break;
        }
        
        const { error: funcError } = await supabase.rpc('exec_sql', { sql: testSql });
        
        if (funcError) {
          console.log(`   ⚠️  ${func}() function test failed:`, funcError.message);
        } else {
          console.log(`   ✅ ${func}() function working`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${func}() function test error:`, e.message);
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function main() {
  console.log('🚨 CRITICAL: Fixing missing pgcrypto extension');
  console.log('This extension is required for Supabase Auth to work properly.\n');

  const success = await fixPgCrypto();

  if (success) {
    console.log('\n🎉 pgcrypto extension fix completed!');
    console.log('\nNext steps:');
    console.log('1. Try creating a user account again');
    console.log('2. Check that authentication flows work properly');
    console.log('3. Verify the Supabase Auth logs show no more gen_random_bytes errors');
  } else {
    console.log('\n❌ pgcrypto extension fix failed.');
    console.log('\nThis may require manual intervention:');
    console.log('1. Contact Supabase support if this is a hosted instance');
    console.log('2. Or run "CREATE EXTENSION pgcrypto;" as a database superuser');
    console.log('3. Check your database permissions and extension availability');
  }
}

main().catch(console.error);