// scripts/fix-pending-tips.js
// Script to check and fix tips stuck in pending status

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPendingTips() {
  try {
    console.log('🔍 Checking for tips stuck in pending status...');
    
    // Get all pending tips
    const { data: pendingTips, error } = await supabase
      .from('tips')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending tips: ${error.message}`);
    }

    if (!pendingTips || pendingTips.length === 0) {
      console.log('✅ No pending tips found!');
      return;
    }

    console.log(`📋 Found ${pendingTips.length} pending tips:`);
    
    for (const tip of pendingTips) {
      console.log(`\n🔍 Checking tip ${tip.id}:`);
      console.log(`   Payment Intent: ${tip.stripe_payment_intent_id}`);
      console.log(`   Amount: $${tip.amount_cents / 100}`);
      console.log(`   Character: ${tip.character_key}`);
      console.log(`   Created: ${new Date(tip.created_at).toLocaleString()}`);
      
      try {
        // Check payment intent status with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(tip.stripe_payment_intent_id);
        
        console.log(`   Stripe Status: ${paymentIntent.status}`);
        console.log(`   Stripe Amount: $${(paymentIntent.amount || 0) / 100}`);
        
        let newStatus = tip.status;
        
        if (paymentIntent.status === 'succeeded') {
          newStatus = 'completed';
          console.log('   ✅ Payment succeeded - updating to completed');
        } else if (paymentIntent.status === 'canceled' || paymentIntent.status === 'payment_failed') {
          newStatus = 'failed';
          console.log('   ❌ Payment failed/canceled - updating to failed');
        } else {
          console.log(`   ⏳ Payment still ${paymentIntent.status} - leaving as pending`);
          continue;
        }
        
        // Update tip status in database
        const { error: updateError } = await supabase
          .from('tips')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', tip.id);
          
        if (updateError) {
          console.error(`   ❌ Failed to update tip ${tip.id}:`, updateError.message);
        } else {
          console.log(`   ✅ Updated tip ${tip.id} to status: ${newStatus}`);
        }
        
      } catch (stripeError) {
        console.error(`   ❌ Failed to check Stripe status for tip ${tip.id}:`, stripeError.message);
      }
    }
    
    console.log('\n🎉 Pending tips check completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
fixPendingTips().then(() => process.exit(0));