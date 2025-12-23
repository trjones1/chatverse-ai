#!/usr/bin/env node

console.log('🔍 Analytics Debug Script\n');

// Check environment variables
console.log('Environment Variables:');
console.log(`  NEXT_PUBLIC_GTM_ID: ${process.env.NEXT_PUBLIC_GTM_ID || '❌ Not set'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`  VERCEL_ENV: ${process.env.VERCEL_ENV || 'Not on Vercel'}`);

// Load .env.local if in development
if (process.env.NODE_ENV !== 'production') {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env.local');

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('\n.env.local Content:');
      envContent.split('\n').forEach(line => {
        if (line.includes('GTM') || line.includes('GA') || line.includes('ANALYTICS')) {
          console.log(`  ${line}`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Could not read .env.local:', error.message);
  }
}

// Test GTM configuration
console.log('\nGTM Configuration Test:');
try {
  const { getCharacterConfig } = require('../lib/characters.config.ts');

  // Test different domains
  const domains = ['chatverse.ai', 'chatwithlexi.com', 'talktonyx.com'];

  domains.forEach(domain => {
    try {
      const config = getCharacterConfig(domain);
      console.log(`  ${domain}: GTM ID = ${config.gtm || 'Not set'}`);
    } catch (err) {
      console.log(`  ${domain}: Error - ${err.message}`);
    }
  });
} catch (error) {
  console.log('❌ Could not load character config:', error.message);
}

// Test analytics library
console.log('\nAnalytics Library Test:');
try {
  // We can't actually run the analytics in Node.js, but we can check the imports
  const fs = require('fs');
  const path = require('path');
  const analyticsPath = path.join(__dirname, '..', 'lib', 'analytics.ts');

  if (fs.existsSync(analyticsPath)) {
    console.log('  ✅ Analytics library exists');

    const content = fs.readFileSync(analyticsPath, 'utf8');
    const functions = [
      'track',
      'trackMessageSent',
      'trackSubscriptionPurchase',
      'trackPageView'
    ];

    functions.forEach(fn => {
      if (content.includes(`export function ${fn}`)) {
        console.log(`  ✅ ${fn} function found`);
      } else {
        console.log(`  ❌ ${fn} function missing`);
      }
    });
  } else {
    console.log('  ❌ Analytics library not found');
  }
} catch (error) {
  console.log('❌ Could not check analytics library:', error.message);
}

console.log('\n🔧 Debugging Steps:');
console.log('1. Check if GTM container GTM-WZTWQF74 exists in Google Tag Manager');
console.log('2. Verify environment variables are set in Vercel dashboard');
console.log('3. Test in browser console: window.dataLayer');
console.log('4. Check Network tab for gtm.js requests');
console.log('5. Use GTM Preview mode to debug tag firing');

console.log('\n📊 Expected Analytics Events:');
console.log('- page_view: When users visit pages');
console.log('- message_sent: When users send chat messages');
console.log('- purchase: When users buy subscriptions/credits');
console.log('- sign_up: When users create accounts');
console.log('- premium_cta: When users interact with upgrade prompts');