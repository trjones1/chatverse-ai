// Comprehensive diagnostic for all database errors seen in logs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable(tableName, description) {
  console.log(`📋 Checking ${description} (${tableName})...`);
  try {
    const { data, error } = await admin
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ ${tableName} table does NOT exist`);
        return false;
      } else {
        console.log(`⚠️ ${tableName} table error:`, error.message);
        return false;
      }
    } else {
      console.log(`✅ ${tableName} table exists`);
      return true;
    }
  } catch (e) {
    console.log(`❌ ${tableName} table check failed:`, e.message);
    return false;
  }
}

async function checkRPCFunction(functionName, params = {}) {
  console.log(`🔧 Checking RPC function: ${functionName}...`);
  try {
    const { data, error } = await admin.rpc(functionName, params);

    if (error) {
      if (error.message.includes('Could not find the function')) {
        console.log(`❌ ${functionName} function does NOT exist`);
        return false;
      } else {
        console.log(`⚠️ ${functionName} function error:`, error.message);
        return true; // Function exists but has issues
      }
    } else {
      console.log(`✅ ${functionName} function works`);
      return true;
    }
  } catch (e) {
    console.log(`❌ ${functionName} function test failed:`, e.message);
    return false;
  }
}

async function diagnoseAllErrors() {
  console.log('🔍 COMPREHENSIVE DATABASE ERROR DIAGNOSIS\n');

  // 1. Check tables that are getting 400/404 errors
  console.log('=== TABLE EXISTENCE CHECKS ===\n');

  const tablesToCheck = [
    { name: 'messages', description: 'Messages table' },
    { name: 'episodic_memories', description: 'Episodic memories table' },
    { name: 'user_display_names', description: 'User display names table' },
    { name: 'message_performance_metrics', description: 'Message performance metrics table' },
  ];

  const tableResults = {};
  for (const table of tablesToCheck) {
    tableResults[table.name] = await checkTable(table.name, table.description);
  }

  console.log('\n=== RPC FUNCTION CHECKS ===\n');

  // 2. Check RPC functions that are failing
  const rpcFunctionsToCheck = [
    // No RPC functions to check currently
  ];

  const rpcResults = {};
  for (const func of rpcFunctionsToCheck) {
    rpcResults[func.name] = await checkRPCFunction(func.name, func.params);
  }

  // 3. Test actual problematic queries
  console.log('\n=== SPECIFIC ERROR PATTERN TESTS ===\n');

  // Test episodic_memories access (400 error)
  console.log('🔍 Testing episodic_memories access pattern...');
  try {
    const { data, error } = await admin
      .from('episodic_memories')
      .select('*')
      .limit(5);

    if (error) {
      console.log('❌ episodic_memories query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
    } else {
      console.log('✅ episodic_memories query works, returned', data?.length || 0, 'records');
    }
  } catch (e) {
    console.log('❌ episodic_memories query exception:', e.message);
  }

  // Test user_display_names access (406 error)
  console.log('\n🔍 Testing user_display_names access pattern...');
  try {
    const { data, error } = await admin
      .from('user_display_names')
      .select('*')
      .limit(5);

    if (error) {
      console.log('❌ user_display_names query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
    } else {
      console.log('✅ user_display_names query works, returned', data?.length || 0, 'records');
    }
  } catch (e) {
    console.log('❌ user_display_names query exception:', e.message);
  }

  // Test message_performance_metrics insert (409 error)
  console.log('\n🔍 Testing message_performance_metrics insert pattern...');
  try {
    // Try inserting a test record
    const { data, error } = await admin
      .from('message_performance_metrics')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        character_key: 'test',
        message_length: 10,
        response_time_ms: 1000,
        ai_model: 'test'
      })
      .select();

    if (error) {
      console.log('❌ message_performance_metrics insert failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
    } else {
      console.log('✅ message_performance_metrics insert works');

      // Clean up test record
      await admin
        .from('message_performance_metrics')
        .delete()
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
    }
  } catch (e) {
    console.log('❌ message_performance_metrics insert exception:', e.message);
  }

  // 4. Summary
  console.log('\n=== DIAGNOSIS SUMMARY ===\n');

  console.log('📋 Table Status:');
  Object.entries(tableResults).forEach(([table, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  });

  console.log('\n🔧 RPC Function Status:');
  Object.entries(rpcResults).forEach(([func, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${func}`);
  });

  console.log('\n📝 Recommended Actions:');
  if (!tableResults.messages) {
    console.log('  - Create messages table');
  }
  if (!tableResults.episodic_memories) {
    console.log('  - Create episodic_memories table');
  }
  if (!tableResults.user_display_names) {
    console.log('  - Create user_display_names table');
  }
  if (!tableResults.message_performance_metrics) {
    console.log('  - Create message_performance_metrics table');
  }
}

diagnoseAllErrors().catch(console.error);