#!/usr/bin/env node

/**
 * Stripe Product Migration Script
 * Migrates products and prices from test mode to live mode
 * 
 * Usage: node scripts/migrate-stripe-products.js
 * 
 * Requirements:
 * - STRIPE_SECRET_KEY must be set to your LIVE mode secret key
 * - Run from project root directory
 */

const fs = require('fs');
const path = require('path');

// Products to migrate (cleaned and organized)
const PRODUCTS = [
  {
    name: '✨ Premium Chat – Monthly Subscription',
    description: 'Connect with your AI companion through unlimited conversations. Perfect for engaging dialogue, thoughtful discussions, and daily companionship. 🎁 Includes 10 FREE bonus voice credits (a $10 value).',
    metadata: { voice_credits: '0' },
    prices: [{ amount: 999, currency: 'usd', interval: 'month' }]
  },
  {
    name: '💎 Premium+ Chat – Monthly Subscription',
    description: 'Enhanced conversations with your AI companion. Unlock deeper discussions and personalized interactions. 🎁 Includes 10 FREE bonus voice credits (a $10 value).',
    metadata: { voice_credits: '0' },
    prices: [{ amount: 2999, currency: 'usd', interval: 'month' }]
  },
  {
    name: '🌙 Nyx Premium+ Chat - Monthly Subscription',
    description: 'Connect with Nyx through exclusive conversations. Experience her unique personality and gothic charm designed for engaging premium interactions.',
    metadata: { voice_credits: '0' },
    prices: [{ amount: 3499, currency: 'usd', interval: 'month' }]
  },
  {
    name: '👔 Dominic Premium+ Chat - Monthly Subscription',
    description: 'Experience Dominic\'s confident personality. Premium conversations with his distinctive leadership style and professional presence for engaging companionship.',
    metadata: { voice_credits: '0' },
    prices: [{ amount: 3499, currency: 'usd', interval: 'month' }]
  },
  {
    name: '🎙️ Voice Pack – 10 Credits',
    description: 'Add voice responses to your conversations. Each credit generates one AI voice message. Perfect for first-time users exploring voice features with their AI companion.',
    metadata: { voice_credits: '10' },
    prices: [{ amount: 999, currency: 'usd' }]
  },
  {
    name: '🎙️ Voice Pack – 25 Credits',
    description: 'Enhance conversations with voice responses. Each credit generates one personalized AI voice message. A great choice for regular users who enjoy voice features.',
    metadata: { voice_credits: '25' },
    prices: [{ amount: 2299, currency: 'usd' }]
  },
  {
    name: '🎙️ Voice Pack – 50 Credits',
    description: 'Premium voice interaction package. Each credit creates one personalized voice response. Ideal for users who want regular voice conversations with their AI companion.',
    metadata: { voice_credits: '50' },
    prices: [{ amount: 3999, currency: 'usd' }]
  },
  {
    name: '🎙️ Voice Pack – 100 Credits',
    description: 'Complete voice experience bundle. Transform text conversations into voice interactions. Best value for users who prefer voice communication with their AI companion.',
    metadata: { voice_credits: '100' },
    prices: [{ amount: 7499, currency: 'usd' }]
  }
];

async function migrateProducts() {
  console.log('🚀 Starting Stripe Product Migration to Live Mode');
  console.log('=' .repeat(60));

  // Check for Stripe secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Error: STRIPE_SECRET_KEY environment variable not set');
    console.log('Please set your LIVE mode Stripe secret key:');
    console.log('export STRIPE_SECRET_KEY=sk_live_...');
    process.exit(1);
  }

  if (process.env.STRIPE_SECRET_KEY.includes('test')) {
    console.error('❌ Error: You are using a TEST mode key!');
    console.log('Please use your LIVE mode secret key (sk_live_...)');
    process.exit(1);
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const results = { products: [], prices: [], errors: [] };

  for (const [index, productData] of PRODUCTS.entries()) {
    try {
      console.log(`\n📦 Creating Product ${index + 1}/${PRODUCTS.length}: ${productData.name}`);
      
      // Create product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        tax_code: 'txcd_10000000', // Digital goods
        metadata: productData.metadata
      });
      
      console.log(`   ✅ Product created: ${product.id}`);
      results.products.push({
        id: product.id,
        name: product.name,
        voice_credits: productData.metadata.voice_credits
      });

      // Create price(s) for the product
      for (const priceData of productData.prices) {
        const priceOptions = {
          product: product.id,
          unit_amount: priceData.amount,
          currency: priceData.currency,
          tax_behavior: 'unspecified'
        };

        // Add recurring info if it's a subscription
        if (priceData.interval) {
          priceOptions.recurring = {
            interval: priceData.interval,
            interval_count: 1
          };
        }

        const price = await stripe.prices.create(priceOptions);
        
        console.log(`   💰 Price created: ${price.id} ($${(priceData.amount/100).toFixed(2)}${priceData.interval ? `/${priceData.interval}` : ''})`);
        results.prices.push({
          id: price.id,
          product_id: product.id,
          amount: priceData.amount,
          currency: priceData.currency,
          interval: priceData.interval || 'one_time'
        });
      }

    } catch (error) {
      console.error(`   ❌ Failed to create ${productData.name}:`, error.message);
      results.errors.push({
        product: productData.name,
        error: error.message
      });
    }

    // Add small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Products created: ${results.products.length}`);
  console.log(`💰 Prices created: ${results.prices.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(error => {
      console.log(`   - ${error.product}: ${error.error}`);
    });
  }

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `stripe-migration-${timestamp}.json`;
  
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      products_created: results.products.length,
      prices_created: results.prices.length,
      errors: results.errors.length
    },
    products: results.products,
    prices: results.prices,
    errors: results.errors
  }, null, 2));

  console.log(`\n📄 Full report saved to: ${reportPath}`);

  if (results.products.length > 0) {
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Update your environment variables with new CONSOLIDATED price IDs:');
    console.log('\n// Add these to your .env file (REPLACES all character-specific prices):');
    
    // Generate consolidated environment variable suggestions
    results.prices.forEach(price => {
      const product = results.products.find(p => p.id === price.product_id);
      if (product?.voice_credits && product.voice_credits !== '0') {
        console.log(`STRIPE_PRICE_VOICE_${product.voice_credits}=${price.id}`);
      } else if (product?.name.includes('SFW Chat –')) {
        console.log(`STRIPE_PRICE_SFW=${price.id}`);
      } else if (product?.name.includes('Premium+ NSFW Chat –') && !product?.name.includes('Nyx') && !product?.name.includes('Dominic')) {
        console.log(`STRIPE_PRICE_NSFW=${price.id}`);
      } else if (product?.name.includes('Nyx At Night')) {
        console.log(`NYX_STRIPE_PRICE_NSFW_PREMIUM=${price.id}`);
      } else if (product?.name.includes('Bound - Dominic')) {
        console.log(`DOM_STRIPE_PRICE_NSFW_PREMIUM=${price.id}`);
      }
    });

    console.log('\n// IMPORTANT: Remove all old character-specific price variables:');
    console.log('// - LEXI_PRICE_*, NYX_PRICE_*, CHASE_PRICE_*, etc.');
    console.log('// - F_STRIPE_PRICE_*, M_STRIPE_PRICE_*');
    console.log('// The new consolidated system uses shared products for all characters!');

    console.log('\n2. Update lib/characters.config.ts to use consolidated pricing');
    console.log('3. Test your checkout flows with the new live products');
    console.log('4. Update any hardcoded price IDs in your application');
  }

  console.log('\n🎉 Migration completed!');
}

// Run migration if called directly
if (require.main === module) {
  migrateProducts().catch(console.error);
}

module.exports = { migrateProducts, PRODUCTS };