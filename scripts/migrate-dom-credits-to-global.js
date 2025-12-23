#!/usr/bin/env node

// Fix the specific issue: move DOM wallet credits to global wallet
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function migrateDomCreditsToGlobal() {
  const USER_ID = '75bf3083-546f-48de-b3b4-95e57dd8afeb';
  const GLOBAL_WALLET_ID = '54aade44-5cc9-4ec2-847b-7b76a930a98d';
  const DOM_WALLET_ID = 'e7b6d066-1ef6-4e87-80c5-0f627f7d79bb';
  
  console.log('🔧 Migrating DOM wallet credits to global wallet...\n');
  
  try {
    // 1. Get current DOM wallet balance from ledger
    const { data: domLedger, error: ledgerError } = await supabase
      .from('voice_credit_ledger')
      .select('delta')
      .eq('wallet_id', DOM_WALLET_ID);
      
    if (ledgerError) throw ledgerError;
    
    const domCredits = domLedger.reduce((sum, entry) => sum + entry.delta, 0);
    console.log(`DOM wallet (${DOM_WALLET_ID}) has ${domCredits} credits`);
    
    if (domCredits <= 0) {
      console.log('✅ No credits to migrate');
      return;
    }
    
    // 2. Transfer credits to global wallet
    const { error: transferError } = await supabase
      .from('voice_credit_ledger')
      .insert({
        wallet_id: GLOBAL_WALLET_ID,
        delta: domCredits,
        reason: 'migrated from DOM character wallet',
        meta: { 
          source_wallet_id: DOM_WALLET_ID,
          migration_date: new Date().toISOString()
        }
      });
      
    if (transferError) throw transferError;
    
    // 3. Deduct credits from DOM wallet
    const { error: deductError } = await supabase
      .from('voice_credit_ledger')
      .insert({
        wallet_id: DOM_WALLET_ID,
        delta: -domCredits,
        reason: 'migrated to global wallet',
        meta: { 
          target_wallet_id: GLOBAL_WALLET_ID,
          migration_date: new Date().toISOString()
        }
      });
      
    if (deductError) throw deductError;
    
    console.log(`✅ Successfully migrated ${domCredits} credits from DOM to global wallet`);
    
    // 4. Verify the migration
    const { data: globalLedger } = await supabase
      .from('voice_credit_ledger')
      .select('delta')
      .eq('wallet_id', GLOBAL_WALLET_ID);
      
    const globalCredits = globalLedger.reduce((sum, entry) => sum + entry.delta, 0);
    console.log(`Global wallet now has ${globalCredits} credits`);
    
    // 5. Update voice credit balance view (if exists)
    try {
      await supabase.rpc('refresh_voice_credit_balance');
      console.log('✅ Refreshed voice credit balance view');
    } catch (e) {
      console.log('ℹ️ Voice credit balance view refresh not available (this is normal)');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message || error);
  }
}

async function main() {
  console.log('🚨 MIGRATE DOM CREDITS TO GLOBAL WALLET');
  console.log('This fixes the issue where voice pack purchases went to character-specific wallets.\n');
  
  await migrateDomCreditsToGlobal();
  
  console.log('\n📝 Next steps:');
  console.log('1. Test voice generation to verify credits work');
  console.log('2. The webhook fix prevents future character-specific wallet creation');
  console.log('3. All new voice pack purchases will go to global wallet automatically');
}

main().catch(console.error);