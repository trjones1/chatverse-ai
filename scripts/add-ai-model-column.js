// Add ai_model column to message_performance_metrics table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function addAiModelColumn() {
  console.log('🔧 Adding ai_model column to message_performance_metrics...\n');

  try {
    // Use raw SQL to add the column
    const sql = `
      ALTER TABLE message_performance_metrics
      ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);
    `;

    // Execute via a simple insert test that will reveal if we need the column
    console.log('🧪 Testing if ai_model column is needed...');

    const testInsert = await admin
      .from('message_performance_metrics')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        character_key: 'test-ai-model',
        total_messages: 1,
        total_size_bytes: 100,
        active_sessions: 1,
        archived_messages: 0,
        load_time_ms: 500,
        warning_level: 'none',
        ai_model: 'gpt-4'
      })
      .select();

    if (testInsert.error) {
      if (testInsert.error.message.includes("Could not find the 'ai_model' column")) {
        console.log('❌ ai_model column missing - this confirms we need to add it');
        console.log('\n📝 You need to run this SQL in your Supabase SQL editor:');
        console.log('```sql');
        console.log('ALTER TABLE message_performance_metrics');
        console.log('ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);');
        console.log('```');
        console.log('\n🔗 Go to: https://supabase.com/dashboard/project/copjpqtwdqrclfrwoaeb/sql');
        return false;
      } else {
        console.log('❌ Other error:', testInsert.error.message);
        return false;
      }
    } else {
      console.log('✅ ai_model column already exists and works!');

      // Clean up test record
      await admin
        .from('message_performance_metrics')
        .delete()
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
        .eq('character_key', 'test-ai-model');

      console.log('📋 Test record cleaned up');
      return true;
    }

  } catch (e) {
    console.log('❌ Exception:', e.message);
    return false;
  }
}

addAiModelColumn().then(success => {
  if (success) {
    console.log('\n🎉 ai_model column is working correctly!');
  } else {
    console.log('\n⚠️  Manual SQL execution required in Supabase dashboard');
  }
}).catch(console.error);