#!/usr/bin/env node

/**
 * Minimal CI Debug Test - Test what CI is actually failing on
 */

console.log('🔍 CI Debug Test Starting...');
console.log('📍 Node.js version:', process.version);
console.log('📂 Current directory:', process.cwd());
console.log('📦 Environment variables:');
console.log('  QA_HEADLESS:', process.env.QA_HEADLESS);
console.log('  QA_TIMEOUT:', process.env.QA_TIMEOUT);
console.log('  DEBUG:', process.env.DEBUG);

try {
  console.log('🎭 Testing Playwright import...');
  const { chromium } = require('playwright');
  console.log('✅ Playwright imported successfully');
  
  console.log('🌐 Testing domain argument...');
  const domain = process.argv[2];
  console.log('📍 Domain:', domain);
  
  if (!domain) {
    console.error('❌ No domain provided');
    process.exit(1);
  }
  
  console.log('🚀 Testing browser launch...');
  (async () => {
    try {
      const browser = await chromium.launch({
        headless: true,
        timeout: 30000
      });
      console.log('✅ Browser launched successfully');
      
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });
      console.log('✅ Browser context created');
      
      const page = await context.newPage();
      console.log('✅ Page created');
      
      console.log(`🌐 Testing navigation to https://${domain}...`);
      const response = await page.goto(`https://${domain}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      console.log(`✅ Navigation successful - Status: ${response.status()}`);
      console.log(`📄 Page title: ${await page.title()}`);
      
      await browser.close();
      console.log('✅ Browser closed');
      
      console.log('🎉 CI Debug Test PASSED');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Browser test failed:', error.message);
      process.exit(1);
    }
  })();
  
} catch (error) {
  console.error('❌ Initial setup failed:', error.message);
  console.error('📚 Stack trace:', error.stack);
  process.exit(1);
}