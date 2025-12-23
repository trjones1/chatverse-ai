#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getOrCreateGlobalWallet(userId) {
  // Try to get existing global wallet
  const { data: existing } = await supabase
    .from('voice_wallets')
    .select('id')
    .eq('user_id', userId)
    .eq('is_global', true)
    .maybeSingle();
    
  if (existing?.id) return existing.id;
  
  // Create new global wallet
  const { data: created, error } = await supabase
    .from('voice_wallets')
    .insert({
      user_id: userId,
      character_key: 'global',
      is_global: true
    })
    .select('id')
    .single();
    
  if (error) throw error;
  return created.id;
}

async function grantVoiceCredits(userId, amount, reason) {
  if (!amount || amount <= 0) return;
  
  const walletId = await getOrCreateGlobalWallet(userId);
  const { error } = await supabase
    .from('voice_credit_ledger')
    .insert({
      wallet_id: walletId,
      delta: amount,
      reason: reason,
      meta: {}
    });
    
  if (error) throw error;
  console.log(`✅ Granted ${amount} voice credits to user ${userId} (reason: ${reason})`);
}

async function fixMissedVoiceCredits() {
  console.log('🔧 Fixing missed voice credit purchases...\n');
  
  try {
    // 1. Find credits_grants entries with 0 credits that should have had credits
    console.log('1. Finding missed voice pack purchases...');
    const { data: missedGrants, error: grantsError } = await supabase
      .from('credits_grants')
      .select('*')
      .eq('credits', 0)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (grantsError) throw grantsError;
    
    console.log(`Found ${missedGrants.length} grants with 0 credits to investigate\n`);
    
    for (const grant of missedGrants) {
      console.log(`🔍 Investigating event: ${grant.event_id}`);
      
      try {
        // Get the Stripe event details
        const event = await stripe.events.retrieve(grant.event_id);
        
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          console.log(`   Session: ${session.id}, Amount: $${(session.amount_total || 0) / 100}`);
          console.log(`   Metadata:`, session.metadata);
          
          // Get line items to check for voice credits
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { 
            limit: 100,
            expand: ['data.price.product']
          });
          
          let totalCreditsFound = 0;
          let userId = session.client_reference_id;
          
          for (const item of lineItems.data) {
            const qty = item.quantity || 1;
            const price = item.price;
            
            // Check for credits in metadata (both old and new format)
            const creditsFromPrice = price.metadata?.voice_credits || price.metadata?.credits;
            const creditsFromProduct = (price.product && typeof price.product === 'object') 
              ? (price.product.metadata?.voice_credits || price.product.metadata?.credits)
              : undefined;
              
            const credits = creditsFromPrice || creditsFromProduct;
            
            if (credits) {
              const creditAmount = Number(credits) * qty;
              totalCreditsFound += creditAmount;
              console.log(`   Found: ${item.description} = ${creditAmount} credits (${credits} × ${qty})`);
            }
          }
          
          if (totalCreditsFound > 0 && userId) {
            console.log(`   🎯 Should have granted ${totalCreditsFound} credits to user ${userId}`);
            
            // Check if user already has these credits
            const walletId = await getOrCreateGlobalWallet(userId);
            const { data: existingCredits } = await supabase
              .from('voice_credit_ledger')
              .select('delta, reason, created_at')
              .eq('wallet_id', walletId)
              .order('created_at', { ascending: false });
            
            // Check if we already fixed this (look for matching credit amount around the same time)
            const eventTime = new Date(grant.created_at);
            const hasMatchingCredit = existingCredits?.some(entry => 
              entry.delta === totalCreditsFound && 
              Math.abs(new Date(entry.created_at) - eventTime) < 24 * 60 * 60 * 1000 // Within 24 hours
            );
            
            if (!hasMatchingCredit) {
              console.log(`   💰 Granting missing ${totalCreditsFound} credits...`);
              await grantVoiceCredits(userId, totalCreditsFound, `retroactive fix for ${session.id}`);
              
              // Update the credits_grants record
              await supabase
                .from('credits_grants')
                .update({ credits: totalCreditsFound })
                .eq('id', grant.id);
                
              console.log(`   📝 Updated credits_grants record`);
            } else {
              console.log(`   ✅ Credits already granted (found matching entry)`);
            }
          } else if (totalCreditsFound === 0) {
            console.log(`   ℹ️  No voice credits found (likely subscription only)`);
          } else {
            console.log(`   ⚠️  Found credits but no user ID`);
          }
        }
        
        console.log(''); // Empty line
        
      } catch (stripeError) {
        console.error(`   ❌ Error checking Stripe event: ${stripeError.message}`);
      }
    }
    
    console.log('🎯 Voice credits fix complete!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

fixMissedVoiceCredits().then(() => process.exit(0));