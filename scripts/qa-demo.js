#!/usr/bin/env node

/**
 * QA Demo - Quick demonstration of automated testing capabilities
 * This shows what the full system can do without requiring full setup
 */

const { chromium } = require('playwright');

async function demoQACapabilities() {
  console.log('🎭 QA AUTOMATION DEMO');
  console.log('='.repeat(50));
  console.log('This demonstrates the automated testing capabilities\n');
  
  let browser, page;
  
  try {
    // Initialize browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1500  // Slow for demo visibility
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Demo 1: Navigate to a character site
    console.log('\n📍 DEMO: Navigate to character site');
    await page.goto('https://chatwithlexi.com');
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    console.log(`   ✅ Loaded: ${title}`);
    
    // Demo 2: Find chat elements  
    console.log('\n💬 DEMO: Locate chat interface');
    try {
      const chatInput = await page.waitForSelector('input, textarea', { timeout: 10000 });
      console.log('   ✅ Chat input found');
      
      const sendButton = await page.locator('button[type="submit"], button:has-text("Send")').first();
      if (await sendButton.isVisible()) {
        console.log('   ✅ Send button located');
      }
    } catch (error) {
      console.log('   ℹ️  Chat interface structure varies by implementation');
    }
    
    // Demo 3: Test responsive design
    console.log('\n📱 DEMO: Test responsive design');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    console.log(`   ✅ Mobile viewport: ${isMobile ? 'Active' : 'Inactive'}`);
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Demo 4: Check for key elements
    console.log('\n🔍 DEMO: Scan for key UI elements');
    
    const elements = {
      'Navigation': 'nav, [role="navigation"], .navbar',
      'Chat Area': '.chat, [data-testid*="chat"], .messages', 
      'Input Field': 'input, textarea',
      'Buttons': 'button',
      'Modal/Popup': '[role="dialog"], .modal'
    };
    
    for (const [name, selector] of Object.entries(elements)) {
      try {
        const element = await page.locator(selector).first();
        const exists = await element.count() > 0;
        console.log(`   ${exists ? '✅' : '❌'} ${name}: ${exists ? 'Found' : 'Not found'}`);
      } catch (error) {
        console.log(`   ❌ ${name}: Error checking`);
      }
    }
    
    // Demo 5: Performance metrics
    console.log('\n⚡ DEMO: Performance metrics');
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
        loadComplete: Math.round(nav.loadEventEnd - nav.fetchStart),
        firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0)
      };
    });
    
    console.log(`   ⚡ DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   ⚡ Page Load Complete: ${metrics.loadComplete}ms`);
    if (metrics.firstContentfulPaint > 0) {
      console.log(`   ⚡ First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    }
    
    // Demo 6: Screenshot capability
    console.log('\n📸 DEMO: Screenshot capability');
    const screenshotPath = `demo-screenshot-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`   ✅ Screenshot saved: ${screenshotPath}`);
    
    console.log('\n🎉 DEMO COMPLETE!');
    console.log('\nWhat the full QA automation can do:');
    console.log('✅ Test ALL 11 character domains automatically');
    console.log('✅ Handle email verification with real temporary emails');
    console.log('✅ Complete Stripe checkout flows (test mode)');
    console.log('✅ Test voice message playback and credit tracking');
    console.log('✅ Verify NSFW mode toggle and spicy styling');
    console.log('✅ Check relationship tracking and selfie systems');
    console.log('✅ Generate detailed JSON reports with timing data');
    console.log('✅ Run in CI/CD pipelines for continuous testing');
    console.log('✅ Parallel testing across multiple domains');
    
    console.log('\nTo run full automation:');
    console.log('node scripts/simple-qa-runner.js chatwithlexi.com');
    console.log('node scripts/simple-qa-runner.js --all');
    
  } catch (error) {
    console.error('❌ Demo error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🧹 Browser closed');
    }
  }
}

// Run demo
if (require.main === module) {
  demoQACapabilities().catch(console.error);
}

module.exports = { demoQACapabilities };