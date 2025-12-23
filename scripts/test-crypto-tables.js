// Simple script to test if crypto voice and tips tables exist
const { getSupabaseAdmin } = require('../lib/supabaseAdmin');

const supabase = getSupabaseAdmin();

async function testTables() {
  try {
    console.log('🔄 Testing crypto voice and tips tables...');

    // Test the tables by checking if they exist
    const { data: voiceData, error: voiceTestError } = await supabase
      .from('user_voice_credits')
      .select('count')
      .limit(0);

    const { data: tipsData, error: tipsTestError } = await supabase
      .from('crypto_tips')
      .select('count')
      .limit(0);

    if (voiceTestError) {
      console.log('❌ Voice credits table not accessible:', voiceTestError.message);
    } else {
      console.log('✅ Voice credits table accessible');
    }

    if (tipsTestError) {
      console.log('❌ Crypto tips table not accessible:', tipsTestError.message);
    } else {
      console.log('✅ Crypto tips table accessible');
    }

    console.log('✅ Table test completed!');

  } catch (error) {
    console.error('❌ Error testing tables:', error);
  }
}

testTables();