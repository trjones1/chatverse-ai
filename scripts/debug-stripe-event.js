#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function debugStripeEvent() {
  console.log('🔍 Debugging recent Stripe events...\n');
  
  try {
    // Get recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 3,
      created: {
        gte: Math.floor(Date.now() / 1000) - (24 * 60 * 60) // Last 24 hours
      }
    });
    
    console.log(`Found ${sessions.data.length} recent checkout sessions:\n`);
    
    for (const session of sessions.data) {
      console.log(`📋 Session: ${session.id}`);
      console.log(`   Amount: $${(session.amount_total || 0) / 100}`);
      console.log(`   Status: ${session.payment_status}`);
      console.log(`   Metadata:`, session.metadata);
      
      // Get full session with line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'line_items.data.price.product']
      });
      
      console.log(`   Line items: ${fullSession.line_items?.data?.length || 0}`);
      
      if (fullSession.line_items?.data) {
        for (const item of fullSession.line_items.data) {
          console.log(`     - ${item.description} (${item.quantity}x)`);
          console.log(`       Price ID: ${item.price?.id}`);
          console.log(`       Price metadata:`, item.price?.metadata);
          
          // Check if product is expanded
          if (item.price?.product && typeof item.price.product === 'object') {
            console.log(`       Product metadata:`, item.price.product.metadata);
          } else {
            console.log(`       Product ID: ${item.price?.product} (not expanded)`);
          }
        }
      }
      
      console.log(''); // Empty line
    }
    
    // Check specific voice pack price IDs from env
    console.log('\n🎯 Voice pack price IDs from environment:');
    const voicePrices = [
      'LEXI_STRIPE_PRICE_VOICE_10',
      'LEXI_STRIPE_PRICE_VOICE_25', 
      'LEXI_STRIPE_PRICE_VOICE_50',
      'LEXI_STRIPE_PRICE_VOICE_100'
    ];
    
    for (const priceEnv of voicePrices) {
      const priceId = process.env[priceEnv];
      if (priceId) {
        console.log(`   ${priceEnv}: ${priceId}`);
        
        try {
          const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
          console.log(`     - Credits from price metadata: ${price.metadata?.voice_credits || 'not set'}`);
          if (price.product && typeof price.product === 'object') {
            console.log(`     - Credits from product metadata: ${price.product.metadata?.voice_credits || 'not set'}`);
          }
        } catch (err) {
          console.log(`     - Error retrieving price: ${err.message}`);
        }
      } else {
        console.log(`   ${priceEnv}: not set`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugStripeEvent().then(() => process.exit(0));