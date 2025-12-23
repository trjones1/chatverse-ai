// Test script to verify all database fixes work
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseFixes() {
  console.log('🧪 TESTING DATABASE FIXES...\n');

  let allTestsPassed = true;

  // 1. Test message_performance_metrics with ai_model column
  console.log('1. Testing message_performance_metrics with ai_model...');
  try {
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      character_key: 'test',
      message_length: 10,
      response_time_ms: 1000,
      ai_model: 'gpt-4' // This should now work
    };

    const { data, error } = await admin
      .from('message_performance_metrics')
      .insert(testData)
      .select();

    if (error) {
      console.log('❌ message_performance_metrics insert failed:', error.message);
      allTestsPassed = false;
    } else {
      console.log('✅ message_performance_metrics insert works');

      // Clean up test record
      await admin
        .from('message_performance_metrics')
        .delete()
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
      console.log('  📋 Test record cleaned up');
    }
  } catch (e) {
    console.log('❌ message_performance_metrics exception:', e.message);
    allTestsPassed = false;
  }

  // 2. Test that existing tables still work
  console.log('\n2. Testing existing tables still work...');

  const existingTables = ['episodic_memories', 'user_display_names'];

  for (const tableName of existingTables) {
    try {
      const { data, error } = await admin
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName} test failed:`, error.message);
        allTestsPassed = false;
      } else {
        console.log(`✅ ${tableName} still works`);
      }
    } catch (e) {
      console.log(`❌ ${tableName} exception:`, e.message);
      allTestsPassed = false;
    }
  }

  // 3. Summary
  console.log('\n=== TEST RESULTS ===');
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Database fixes are working correctly.');
    console.log('\n📋 Fixed Issues:');
    console.log('  ✅ ai_model column added to message_performance_metrics - no more 409 insert errors');
    console.log('  ✅ Existing tables still work properly');
  } else {
    console.log('❌ Some tests failed. Check the errors above.');
  }

  return allTestsPassed;
}

testDatabaseFixes().catch(console.error);