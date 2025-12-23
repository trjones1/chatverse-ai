#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugVoiceCredits() {
  console.log('🔍 Debugging voice credits system...\n');
  
  try {
    // 1. Check credits_grants table structure
    console.log('1. Checking credits_grants table...');
    const { data: grantsTable, error: grantsError } = await supabase
      .from('credits_grants')
      .select('*')
      .limit(5);
    
    if (grantsError) {
      console.error('❌ Error accessing credits_grants table:', grantsError);
    } else {
      console.log('✅ Credits grants table exists with', grantsTable.length, 'recent entries');
      if (grantsTable.length > 0) {
        console.log('Sample entry:', grantsTable[0]);
      }
    }
    
    // 2. Check voice_wallets with global flag
    console.log('\n2. Checking voice_wallets...');
    const { data: wallets, error: walletsError } = await supabase
      .from('voice_wallets')
      .select('*')
      .eq('is_global', true)
      .limit(5);
    
    if (walletsError) {
      console.error('❌ Error accessing voice_wallets:', walletsError);
    } else {
      console.log('✅ Found', wallets.length, 'global voice wallets');
      if (wallets.length > 0) {
        console.log('Sample wallet:', wallets[0]);
      }
    }
    
    // 3. Check voice_credit_ledger for recent activity
    console.log('\n3. Checking voice_credit_ledger...');
    const { data: ledger, error: ledgerError } = await supabase
      .from('voice_credit_ledger')
      .select('*, voice_wallets!inner(user_id, is_global)')
      .eq('voice_wallets.is_global', true)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ledgerError) {
      console.error('❌ Error accessing voice_credit_ledger:', ledgerError);
    } else {
      console.log('✅ Found', ledger.length, 'recent global voice credit transactions');
      ledger.forEach((entry, i) => {
        console.log(`  ${i+1}. ${entry.reason}: ${entry.delta > 0 ? '+' : ''}${entry.delta} credits (${entry.created_at})`);
      });
    }
    
    // 4. Check for recent Stripe events
    console.log('\n4. Checking recent Stripe events...');
    const { data: stripeEvents, error: eventsError } = await supabase
      .from('stripe_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (eventsError) {
      console.error('❌ Error accessing stripe_events:', eventsError);
    } else {
      console.log('✅ Found', stripeEvents.length, 'recent Stripe events');
      stripeEvents.forEach((event, i) => {
        console.log(`  ${i+1}. ${event.id} (${event.created_at})`);
      });
    }
    
    // 5. Check if consume_one_voice_credit_global function exists
    console.log('\n5. Testing voice credit consumption function...');
    const { data: functionTest, error: functionError } = await supabase
      .rpc('consume_one_voice_credit_global', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Test with fake UUID
        p_stripe_customer_id: null
      });
    
    if (functionError) {
      if (functionError.message.includes('function')) {
        console.error('❌ Function consume_one_voice_credit_global does not exist');
      } else {
        console.log('✅ Function exists (expected false for fake user):', functionTest);
      }
    } else {
      console.log('✅ Function executed successfully:', functionTest);
    }
    
    // 6. Check user entitlements function
    console.log('\n6. Testing user entitlements function...');
    const { data: entitlementsTest, error: entitlementsError } = await supabase
      .rpc('get_user_entitlements', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_character_key: 'lexi'
      });
    
    if (entitlementsError) {
      console.error('❌ Error testing entitlements function:', entitlementsError);
    } else {
      console.log('✅ Entitlements function works:', entitlementsTest);
    }
    
    console.log('\n🎯 Voice credits debugging complete!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugVoiceCredits().then(() => process.exit(0));