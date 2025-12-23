#!/usr/bin/env node

// Test voice credit consumption functions
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function testVoiceCreditFunctions() {
  console.log('🔍 Testing voice credit consumption functions...\n');

  const userId = '75bf3083-546f-48de-b3b4-95e57dd8afeb'; // Your user ID

  try {
    // 1. Check current entitlements
    console.log('1. Current voice credits before test:');
    const { data: before, error: beforeError } = await supabase.rpc('get_user_entitlements', {
      p_user_id: userId,
      p_character_key: 'dom'
    });
    
    if (beforeError) {
      console.log('   ❌ Error:', beforeError.message);
      return;
    }
    
    console.log(`   ✅ Voice credits: ${before?.[0]?.voice_credits}`);
    console.log(`   ✅ Can use voice: ${before?.[0]?.can_use_voice}`);
    console.log(`   ✅ Tier: ${before?.[0]?.tier}`);

    // 2. Test consume_one_voice_credit_global function
    console.log('\n2. Testing consume_one_voice_credit_global function:');
    const { data: consumeResult, error: consumeError } = await supabase.rpc('consume_one_voice_credit_global', {
      p_user_id: userId,
      p_stripe_customer_id: null
    });
    
    if (consumeError) {
      console.log('   ❌ Function error:', consumeError.message);
      console.log('   📋 Full error:', JSON.stringify(consumeError, null, 2));
    } else {
      console.log('   ✅ Function result:', consumeResult);
    }

    // 3. Check credits after consumption attempt
    console.log('\n3. Voice credits after consumption attempt:');
    const { data: after, error: afterError } = await supabase.rpc('get_user_entitlements', {
      p_user_id: userId,
      p_character_key: 'dom'
    });
    
    if (afterError) {
      console.log('   ❌ Error:', afterError.message);
    } else {
      console.log(`   ✅ Voice credits: ${after?.[0]?.voice_credits}`);
      const creditChange = (before?.[0]?.voice_credits || 0) - (after?.[0]?.voice_credits || 0);
      console.log(`   📊 Credits consumed: ${creditChange}`);
    }

    // 4. Check voice wallets directly
    console.log('\n4. Checking voice wallets directly:');
    const { data: wallets, error: walletsError } = await supabase
      .from('voice_wallets')
      .select('*')
      .eq('user_id', userId);
    
    if (walletsError) {
      console.log('   ❌ Error:', walletsError.message);
    } else {
      console.log(`   ✅ Found ${wallets.length} wallets:`);
      wallets.forEach((wallet, i) => {
        console.log(`   ${i + 1}. Character: ${wallet.character_key}`);
        console.log(`      Global: ${wallet.is_global}`);
        console.log(`      ID: ${wallet.id}`);
      });
    }

    // 5. Check voice credit ledger
    console.log('\n5. Checking voice credit ledger:');
    const { data: ledger, error: ledgerError } = await supabase
      .from('voice_credit_ledger')
      .select(`
        *,
        voice_wallets!inner(user_id, character_key, is_global)
      `)
      .eq('voice_wallets.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ledgerError) {
      console.log('   ❌ Error:', ledgerError.message);
    } else {
      console.log(`   ✅ Found ${ledger.length} recent transactions:`);
      ledger.forEach((entry, i) => {
        console.log(`   ${i + 1}. Delta: ${entry.delta}`);
        console.log(`      Reason: ${entry.reason}`);
        console.log(`      Character: ${entry.voice_wallets.character_key}`);
        console.log(`      Global: ${entry.voice_wallets.is_global}`);
        console.log(`      Date: ${entry.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function main() {
  console.log('🚨 Test Voice Credit Consumption');
  console.log('This will test the voice credit consumption function.\n');
  
  await testVoiceCreditFunctions();
  
  console.log('✅ Test complete!');
}

main().catch(console.error);