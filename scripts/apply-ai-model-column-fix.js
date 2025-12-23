// Apply the ai_model column fix to message_performance_metrics
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('🔧 Applying ai_model column fix to message_performance_metrics...\n');

  try {
    // Add the ai_model column
    const { data, error } = await admin.rpc('exec_sql', {
      sql: 'ALTER TABLE message_performance_metrics ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);'
    });

    if (error) {
      console.log('❌ Failed to add ai_model column:', error.message);
      console.log('⚠️  This might be expected if exec_sql function doesn\'t exist');

      // Try alternative approach - test if column exists by trying to insert
      console.log('\n🧪 Testing if ai_model column works now...');
      const testResult = await admin
        .from('message_performance_metrics')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          character_key: 'test',
          message_length: 10,
          response_time_ms: 1000,
          ai_model: 'test'
        })
        .select();

      if (testResult.error) {
        console.log('❌ ai_model column still missing:', testResult.error.message);
        console.log('\n📝 Manual SQL needed:');
        console.log('ALTER TABLE message_performance_metrics ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);');
        return false;
      } else {
        console.log('✅ ai_model column works! (Might have been added previously)');

        // Clean up test record
        await admin
          .from('message_performance_metrics')
          .delete()
          .eq('user_id', '00000000-0000-0000-000000000000');

        return true;
      }
    } else {
      console.log('✅ ai_model column added successfully');
      return true;
    }
  } catch (e) {
    console.log('❌ Exception:', e.message);
    return false;
  }
}

applyFix().catch(console.error);