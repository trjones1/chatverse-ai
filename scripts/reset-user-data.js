#!/usr/bin/env node

/**
 * Simple user data reset script using Node.js and Supabase
 * This resets all user data while preserving configuration tables
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Tables to clear (only if they exist)
const tablesToClear = [
  'stripe_events',
  'user_subscriptions', 
  'user_voice_credits',
  'daily_chat_usage',
  'messages',
  'memories',
  'relationship_progress',
  'user_character_memories'
];

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .single();
  
  return !error && data;
}

async function clearTable(tableName) {
  console.log(`  Checking table: ${tableName}`);
  
  const exists = await checkTableExists(tableName);
  if (!exists) {
    console.log(`    ⏭️  Table ${tableName} does not exist, skipping`);
    return;
  }

  // Clear the table
  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
  if (error) {
    console.log(`    ❌ Error clearing ${tableName}:`, error.message);
  } else {
    console.log(`    ✅ Cleared table: ${tableName}`);
  }
}

async function clearAuthUsers() {
  console.log('  Clearing auth.users via Admin API...');
  
  try {
    // Use admin API to list and delete users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log(`    ❌ Error listing users:`, listError.message);
      return;
    }
    
    if (!users || users.users.length === 0) {
      console.log('    ℹ️  No users found to delete');
      return;
    }
    
    console.log(`    Found ${users.users.length} users to delete`);
    
    for (const user of users.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.log(`    ❌ Error deleting user ${user.id}:`, deleteError.message);
      }
    }
    
    console.log(`    ✅ Deleted ${users.users.length} users`);
    
  } catch (error) {
    console.log(`    ❌ Error in auth cleanup:`, error.message);
  }
}

async function verifyReset() {
  console.log('\n=== VERIFICATION ===');
  
  const verificationTables = [
    'user_subscriptions',
    'messages', 
    'memories',
    'user_voice_credits'
  ];
  
  for (const tableName of verificationTables) {
    const exists = await checkTableExists(tableName);
    if (!exists) {
      console.log(`${tableName}: table does not exist`);
      continue;
    }
    
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.log(`${tableName}: error checking - ${error.message}`);
    } else {
      console.log(`${tableName}: ${count} rows remaining`);
    }
  }
  
  // Check auth users
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log(`auth.users: ${users?.users?.length || 0} users remaining`);
}

async function main() {
  console.log('🚨 WARNING: This will permanently delete ALL user data!');
  console.log('This includes:');
  console.log('  - All user accounts and authentication data');
  console.log('  - All subscriptions and billing information');
  console.log('  - All messages and conversation history');
  console.log('  - All memories and relationship progress');
  console.log('  - All voice credits and usage data');
  console.log('');
  console.log('This action is IRREVERSIBLE!');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const confirmation = await new Promise(resolve => {
    rl.question("Type 'RESET_ALL_DATA' to confirm: ", resolve);
  });
  
  rl.close();

  if (confirmation !== 'RESET_ALL_DATA') {
    console.log('❌ Reset cancelled.');
    process.exit(1);
  }

  console.log('\n🔄 Starting user data reset...\n');

  // Clear regular tables
  console.log('Clearing public tables:');
  for (const tableName of tablesToClear) {
    await clearTable(tableName);
  }

  // Clear auth users
  console.log('\nClearing authentication data:');
  await clearAuthUsers();

  // Verify the reset
  await verifyReset();

  console.log('\n🎉 Reset completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Test user signup flow');
  console.log('2. Test payment processing');  
  console.log('3. Test webhook handling');
  console.log('4. Verify entitlements are working');
  console.log('');
  console.log('The application is ready for fresh testing.');
}

main().catch(console.error);