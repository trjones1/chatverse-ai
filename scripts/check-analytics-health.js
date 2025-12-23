#!/usr/bin/env node
// Analytics Health Check Script
// Verifies GTM setup, dataLayer functionality, and key tracking events

const path = require('path');
const fs = require('fs');

console.log('🔍 Analytics Health Check Starting...\n');

// Check 1: Environment Variables
console.log('1. Checking Environment Variables:');
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
console.log(`   GTM ID: ${gtmId ? '✅ ' + gtmId : '❌ Missing NEXT_PUBLIC_GTM_ID'}`);

// Check 2: Analytics Library
console.log('\n2. Checking Analytics Library:');
const analyticsPath = path.join(__dirname, '..', 'lib', 'analytics.ts');
if (fs.existsSync(analyticsPath)) {
  console.log('   ✅ Analytics library exists at lib/analytics.ts');

  const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');

  // Check for key functions
  const functions = [
    'trackMessageSent',
    'trackSubscriptionPurchase',
    'trackVoicePackPurchase',
    'trackTipPurchase',
    'trackPageView',
    'trackSignUp',
    'trackPremiumCTA'
  ];

  functions.forEach(fn => {
    if (analyticsContent.includes(`export function ${fn}`)) {
      console.log(`   ✅ ${fn} function found`);
    } else {
      console.log(`   ❌ ${fn} function missing`);
    }
  });
} else {
  console.log('   ❌ Analytics library not found');
}

// Check 3: GTM Component
console.log('\n3. Checking GTM Components:');
const gtmPath = path.join(__dirname, '..', 'components', 'GTM.tsx');
if (fs.existsSync(gtmPath)) {
  console.log('   ✅ GTM component exists');

  const gtmContent = fs.readFileSync(gtmPath, 'utf8');
  if (gtmContent.includes('window.dataLayer')) {
    console.log('   ✅ dataLayer initialization found');
  } else {
    console.log('   ❌ dataLayer initialization missing');
  }

  if (gtmContent.includes('gtm.js')) {
    console.log('   ✅ GTM script loading found');
  } else {
    console.log('   ❌ GTM script loading missing');
  }
} else {
  console.log('   ❌ GTM component not found');
}

// Check 4: GTM Page View Component
const gtmPageViewPath = path.join(__dirname, '..', 'components', 'GtmPageView.tsx');
if (fs.existsSync(gtmPageViewPath)) {
  console.log('   ✅ GtmPageView component exists');

  const gtmPageViewContent = fs.readFileSync(gtmPageViewPath, 'utf8');
  if (gtmPageViewContent.includes('page_view')) {
    console.log('   ✅ Page view tracking found');
  } else {
    console.log('   ❌ Page view tracking missing');
  }
} else {
  console.log('   ❌ GtmPageView component not found');
}

// Check 5: Layout Integration
console.log('\n4. Checking Layout Integration:');
const layoutPath = path.join(__dirname, '..', 'app', 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  console.log('   ✅ Layout file exists');

  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  if (layoutContent.includes('<GTM')) {
    console.log('   ✅ GTM component imported in layout');
  } else {
    console.log('   ❌ GTM component not found in layout');
  }

  if (layoutContent.includes('<GtmPageView')) {
    console.log('   ✅ GtmPageView component imported in layout');
  } else {
    console.log('   ❌ GtmPageView component not found in layout');
  }
} else {
  console.log('   ❌ Layout file not found');
}

// Check 6: Key Component Integration
console.log('\n5. Checking Component Integration:');
const chatBoxPath = path.join(__dirname, '..', 'components', 'ChatBox.tsx');
if (fs.existsSync(chatBoxPath)) {
  console.log('   ✅ ChatBox component exists');

  const chatBoxContent = fs.readFileSync(chatBoxPath, 'utf8');
  if (chatBoxContent.includes('trackMessageSent')) {
    console.log('   ✅ Message tracking found in ChatBox');
  } else {
    console.log('   ❌ Message tracking missing in ChatBox');
  }

  if (chatBoxContent.includes('trackMessageLimit')) {
    console.log('   ✅ Message limit tracking found in ChatBox');
  } else {
    console.log('   ❌ Message limit tracking missing in ChatBox');
  }
} else {
  console.log('   ❌ ChatBox component not found');
}

// Check 7: Character Configuration
console.log('\n6. Checking Character Configuration:');
const charactersPath = path.join(__dirname, '..', 'lib', 'characters.config.ts');
if (fs.existsSync(charactersPath)) {
  console.log('   ✅ Character config exists');

  const charactersContent = fs.readFileSync(charactersPath, 'utf8');
  if (charactersContent.includes('gtm')) {
    console.log('   ✅ GTM config found in character config');
  } else {
    console.log('   ⚠️  No character-specific GTM config (using global)');
  }
} else {
  console.log('   ❌ Character config not found');
}

// Recommendations
console.log('\n📋 Recommendations:');
console.log('1. Test dataLayer in browser console: window.dataLayer');
console.log('2. Check GTM preview mode in production');
console.log('3. Verify events are firing in GTM debug mode');
console.log('4. Check network tab for gtm.js loading');
console.log('5. Ensure cookie consent is not blocking analytics');

console.log('\n🎯 Analytics Health Check Complete!');