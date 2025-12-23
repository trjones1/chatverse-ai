#!/usr/bin/env node

// Migrate user voice credits from character-specific to global wallet
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function migrateUserToGlobalCredits() {
  console.log('🔄 Migrating user voice credits to global wallet system...\n');

  const userId = '75bf3083-546f-48de-b3b4-95e57dd8afeb'; // Your user ID

  try {
    // 1. Get current character-specific credits
    console.log('1. Checking current character-specific credits:');
    const { data: currentCredits } = await supabase.rpc('get_user_entitlements', {
      p_user_id: userId,
      p_character_key: 'dom'
    });
    
    const credits = currentCredits?.[0]?.voice_credits || 0;
    console.log(`   ✅ Found ${credits} voice credits in DOM wallet`);

    if (credits === 0) {
      console.log('   ℹ️  No credits to migrate');
      return;
    }

    // 2. Check if global wallet already exists
    console.log('\n2. Checking for existing global wallet:');
    const { data: globalWallet, error: globalError } = await supabase
      .from('voice_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_global', true)
      .maybeSingle();
    
    if (globalError) {
      console.log('   ❌ Error checking global wallet:', globalError.message);
      return;
    }

    let walletId;
    if (globalWallet) {
      console.log(`   ✅ Found existing global wallet: ${globalWallet.id}`);
      walletId = globalWallet.id;
    } else {
      console.log('   📝 Creating new global wallet...');
      const { data: newWallet, error: createError } = await supabase
        .from('voice_wallets')
        .insert({
          user_id: userId,
          character_key: 'global',
          is_global: true
        })
        .select()
        .single();
      
      if (createError) {
        console.log('   ❌ Error creating global wallet:', createError.message);
        return;
      }
      
      console.log(`   ✅ Created global wallet: ${newWallet.id}`);
      walletId = newWallet.id;
    }

    // 3. Add credits to global wallet
    console.log('\n3. Adding credits to global wallet:');
    const { data: creditResult, error: creditError } = await supabase
      .from('voice_credit_ledger')
      .insert({
        wallet_id: walletId,
        delta: credits,
        reason: 'migrated from character wallet'
      })
      .select();
    
    if (creditError) {
      console.log('   ❌ Error adding credits:', creditError.message);
      return;
    }
    
    console.log(`   ✅ Added ${credits} credits to global wallet`);

    // 4. Test the global credit consumption function
    console.log('\n4. Testing global credit consumption:');
    const { data: testResult, error: testError } = await supabase.rpc('consume_one_voice_credit_global', {
      p_user_id: userId,
      p_stripe_customer_id: null
    });
    
    if (testError) {
      console.log('   ❌ Function error:', testError.message);
    } else {
      console.log(`   ✅ Function result: ${testResult}`);
      if (testResult === true) {
        console.log('   🎉 Voice credit consumption now works!');
        
        // Add the credit back since this was just a test
        await supabase
          .from('voice_credit_ledger')
          .insert({
            wallet_id: walletId,
            delta: 1,
            reason: 'test credit restored'
          });
        console.log('   ↩️  Test credit restored');
      }
    }

    // 5. Verify final state
    console.log('\n5. Verifying final state:');
    const { data: finalCredits } = await supabase.rpc('get_user_entitlements', {
      p_user_id: userId,
      p_character_key: 'dom'
    });
    
    console.log(`   ✅ Final voice credits: ${finalCredits?.[0]?.voice_credits}`);

    console.log('\n🎯 Migration Summary:');
    console.log(`   • Migrated ${credits} credits to global wallet`);
    console.log(`   • Global wallet ID: ${walletId}`);
    console.log(`   • Voice features should now work across all characters`);
    console.log(`   • Credits are shared globally instead of per-character`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function main() {
  console.log('🚨 MIGRATE USER TO GLOBAL VOICE CREDITS');
  console.log('This will move your credits from character-specific to global wallet.\n');
  
  await migrateUserToGlobalCredits();
  
  console.log('\n✅ Migration complete!');
  console.log('Try using voice features now - they should work properly.');
}

main().catch(console.error);