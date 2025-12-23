// Check the current schema of message_performance_metrics table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking message_performance_metrics table schema...\n');

  try {
    // Try to get table info from information_schema
    const { data, error } = await admin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'message_performance_metrics')
      .eq('table_schema', 'public');

    if (error) {
      console.log('❌ Could not query schema:', error.message);

      // Fallback: try to select from the table to see what columns exist
      console.log('\n🔍 Trying fallback approach - sample record...');
      const { data: sampleData, error: sampleError } = await admin
        .from('message_performance_metrics')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.log('❌ Could not query table:', sampleError.message);
      } else {
        console.log('✅ Table exists. Sample record keys:', Object.keys(sampleData[0] || {}));
      }
    } else {
      console.log('📋 Current table schema:');
      data.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      const hasAiModel = data.some(col => col.column_name === 'ai_model');
      console.log(`\n🔍 ai_model column exists: ${hasAiModel ? '✅ YES' : '❌ NO'}`);
    }

  } catch (e) {
    console.log('❌ Exception:', e.message);
  }
}

checkSchema().catch(console.error);