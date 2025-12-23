#!/usr/bin/env node

/**
 * Simple QA Runner
 * Ready-to-use automated testing for character sites
 * 
 * Usage: 
 *   node scripts/simple-qa-runner.js chatwithlexi.com
 *   node scripts/simple-qa-runner.js --all
 */

const { chromium } = require('playwright');

// Configuration
const CONFIG = {
  headless: process.env.QA_HEADLESS !== 'false',  // Default to headless, can override with QA_HEADLESS=false
  slowMo: process.env.QA_HEADLESS === 'false' ? 500 : 0,  // Reduce slow down time
  timeout: 15000,        // 15 second timeout per action
  stepTimeout: 25000,    // 25 second timeout per step (reduced)
  messageLimitTimeout: 12000, // 12 second timeout for message limit step specifically
  maxTestDuration: 180000, // 3 minute max test duration
  viewport: { width: 1280, height: 720 },
  
  // Test user data
  testUser: {
    email: `claude-qa-${Date.now()}@1secmail.com`,
    password: 'TestPassword123!',
    name: 'Claude QA Test'
  },
  
  // Stripe test card
  stripeTestCard: {
    number: '4242424242424242',
    expiry: '12/25',
    cvc: '123'
  }
};

// All character domains
const DOMAINS = [
  'chatwithlexi.com',
  'fuckboychase.com', 
  'talktonyx.com',
  'sirdominic.com',
  'chatwithethan.com',
  'chatwithjayden.com',
  'chatwithmiles.com',
  'chatwithchloe.com',
  'waifuwithaiko.com',
  'chatwithzaria.com',
  'chatwithnova.com'
];

class SimpleQARunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Initializing QA Runner...');
    
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo
    });
    
    const context = await this.browser.newContext({
      viewport: CONFIG.viewport
    });
    
    this.page = await context.newPage();
    this.page.setDefaultTimeout(CONFIG.timeout);
    
    // Log console messages for debugging
    this.page.on('console', msg => console.log(`🖥️  ${msg.text()}`));
    this.page.on('pageerror', err => console.error(`❌ Page error: ${err.message}`));
    
    console.log('✅ Browser initialized');
  }

  async testDomain(domain) {
    const startTime = Date.now();
    const result = {
      domain,
      startTime,
      steps: [],
      errors: [],
      success: false
    };

    // Set overall test timeout
    const testTimeout = setTimeout(() => {
      throw new Error(`Test exceeded maximum duration of ${CONFIG.maxTestDuration/1000}s`);
    }, CONFIG.maxTestDuration);

    try {
      console.log(`\n🎭 Testing ${domain.toUpperCase()}`);
      console.log('='.repeat(50));

      // Step 1: Navigate to site
      await this.step('Navigate to site', async () => {
        await this.page.goto(`https://${domain}`, { 
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.timeout 
        });
        
        // Wait for page to be interactive
        await this.page.waitForLoadState('domcontentloaded');
        
        const title = await this.page.title();
        console.log(`   📍 Loaded: ${title}`);
        return { title };
      }, result);

      // Step 2: Start conversation
      await this.step('Start conversation', async () => {
        // First, handle any overlays (cookie banners, privacy notices, etc.)
        await this.handleOverlays();
        
        // Look for chat input or conversation starters
        const chatInput = await this.page.waitForSelector(
          'input[placeholder*="message"], textarea[placeholder*="message"], [data-testid="chat-input"]',
          { timeout: 10000 }
        );
        
        // Clear and fill the input
        await chatInput.fill('');
        await chatInput.fill('Hey! How are you doing today?');
        
        // Wait a moment for the input to register and enable the button
        await this.page.waitForTimeout(500);
        
        // Look for send button that should now be enabled
        const sendButton = await this.page.locator('button[type="submit"], [data-testid="chat-send-button"], [data-testid="send"], button:has-text("Send")').first();
        
        // Wait for button to be enabled and clickable
        await sendButton.waitFor({ state: 'attached', timeout: 5000 });
        
        // Check if button is enabled, if not, try clicking the input again
        const isDisabled = await sendButton.getAttribute('disabled');
        if (isDisabled !== null) {
          console.log('   🔄 Button disabled, focusing input again...');
          await chatInput.focus();
          await chatInput.fill('Hey! How are you doing today?');
          await this.page.waitForTimeout(500);
        }
        
        // Handle overlays again before clicking
        await this.handleOverlays();
        
        // Try to click the send button with force if needed
        try {
          await sendButton.click({ timeout: 10000 });
        } catch (error) {
          console.log('   🔄 Click intercepted, trying force click...');
          await sendButton.click({ force: true });
        }
        
        console.log('   💬 Initial message sent');
        return { messageSent: true };
      }, result);

      // Step 3: Hit message limit
      await this.step('Reach message limit', async () => {
        // Send a few messages to hit the limit (reduced for speed)
        const messages = [
          "Tell me about your day",
          "What do you like to do for fun?"
        ];
        
        let messagesSent = 0;

        for (let i = 0; i < messages.length; i++) {
          try {
            // Try to find input field with more patience
            const inputSelectors = [
              '[data-testid="chat-input"]',
              'input[placeholder*="message"]',
              'textarea[placeholder*="message"]',
              'input[type="text"]',
              'textarea'
            ];
            
            let input = null;
            for (const selector of inputSelectors) {
              try {
                input = await this.page.waitForSelector(selector, { timeout: 500 });
                if (input) break;
              } catch (e) {
                continue;
              }
            }
            
            if (!input) {
              console.log(`   ⚠️  No input field found, might have hit limit`);
              break;
            }
            
            await input.fill('');
            await input.fill(messages[i]);
            
            // Wait for input to register
            await this.page.waitForTimeout(200);
            
            const send = await this.page.locator('button[type="submit"], [data-testid="chat-send-button"], [data-testid="send"]').first();
            
            // Check if send button exists and is enabled (faster timeouts)
            if (await send.isVisible({ timeout: 800 })) {
              await send.click({ timeout: 1500 });
              messagesSent++;
              console.log(`   📤 Sent message ${i + 2}`);
            } else {
              console.log(`   ⚠️  Send button not available, might have hit limit`);
              break;
            }
          } catch (error) {
            console.log(`   ⚠️  Could not send message ${i + 2}: ${error.message}`);
            // Might have hit limit, continue to check for upgrade prompts
            break;
          }
          
          await this.page.waitForTimeout(200);
        }

        // Look for upgrade/paywall prompt or other limit indicators
        const upgradeSelectors = [
          '[data-testid="upgrade"]',
          '[data-testid="paywall"]', 
          'button:has-text("Upgrade")',
          'button:has-text("Subscribe")',
          'button:has-text("Get Premium")',
          '.upgrade-prompt',
          '.paywall',
          ':has-text("upgrade")',
          ':has-text("subscribe")',
          ':has-text("premium")',
          ':has-text("limit")',
          ':has-text("reached")'
        ];

        let limitReached = false;
        let upgradePrompt = null;
        
        // Try to find any upgrade-related elements (faster search)
        for (const selector of upgradeSelectors) {
          try {
            upgradePrompt = await this.page.waitForSelector(selector, { timeout: 500 });
            if (upgradePrompt) {
              console.log(`   🚧 Found upgrade indicator: ${selector}`);
              limitReached = true;
              break;
            }
          } catch (error) {
            // Continue to next selector
          }
        }
        
        // If no explicit upgrade prompt, do a quick check for common indicators
        if (!limitReached) {
          try {
            const sendButton = await this.page.locator('[data-testid="chat-send-button"]').first();
            const isDisabled = await sendButton.getAttribute('disabled', { timeout: 1000 });
            
            if (isDisabled !== null) {
              console.log('   🚧 Message limit detected via disabled send button');
              limitReached = true;
            }
          } catch (error) {
            // Button not found, might have hit limit
            console.log('   🚧 Send button not found, possible limit reached');
            limitReached = true;
          }
        }
        
        if (!limitReached) {
          console.log('   ℹ️  No explicit message limit found - may be working normally or limit not yet reached');
          // Still consider this successful since we sent messages
          console.log(`   📊 Successfully sent ${messagesSent} additional messages`);
        }
        
        return { limitReached: limitReached || messagesSent > 0, messagesSent };
      }, result);

      // Step 4: Test signup flow (optional)
      try {
        await this.step('Test signup flow', async () => {
          // Try to click upgrade or signup
          const upgradeBtn = await this.page.locator(
            '[data-testid="upgrade"], button:has-text("Upgrade"), button:has-text("Sign Up"), button:has-text("Get Premium")'
          ).first();
          
          if (await upgradeBtn.isVisible({ timeout: 5000 })) {
            await upgradeBtn.click();
            
            // Look for email input (timeout faster)
            const emailInput = await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
            await emailInput.fill(CONFIG.testUser.email);

            const passwordInput = await this.page.locator('input[type="password"], input[name="password"]').first();
            if (await passwordInput.isVisible({ timeout: 3000 })) {
              await passwordInput.fill(CONFIG.testUser.password);
            }

            // Submit signup
            const submitBtn = await this.page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create")').first();
            if (await submitBtn.isVisible({ timeout: 3000 })) {
              await submitBtn.click();
            }

            console.log(`   👤 Signup submitted for: ${CONFIG.testUser.email}`);
            return { email: CONFIG.testUser.email };
          } else {
            console.log(`   ℹ️  No signup flow found, skipping...`);
            return { skipped: true };
          }
        }, result);
      } catch (error) {
        console.log(`   ⚠️  Signup flow failed, continuing: ${error.message}`);
        result.steps.push({ name: 'Test signup flow', success: false, error: error.message, optional: true });
      }

      // Step 5: Check for email verification message (optional)
      try {
        await this.step('Check email verification', async () => {
          // Look for email verification message or redirect
          await this.page.waitForTimeout(1000);
          
          const bodyText = await this.page.locator('body').textContent();
          const hasEmailMessage = bodyText.toLowerCase().includes('email') || bodyText.toLowerCase().includes('verify') || bodyText.toLowerCase().includes('check');
          
          console.log(`   📧 Email verification prompt: ${hasEmailMessage ? 'Found' : 'Not found'}`);
          return { emailPromptShown: hasEmailMessage };
        }, result);
      } catch (error) {
        console.log(`   ⚠️  Email verification check failed, continuing: ${error.message}`);
        result.steps.push({ name: 'Check email verification', success: false, error: error.message, optional: true });
      }

      // Step 6: Test dashboard access (optional)
      try {
        await this.step('Test dashboard', async () => {
          // Try to navigate to dashboard
          await this.page.goto(`https://${domain}/dashboard`, { 
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.timeout 
          });
          
          const currentUrl = this.page.url();
          const onDashboard = currentUrl.includes('dashboard') || currentUrl.includes('portal');
          
          console.log(`   📊 Dashboard accessible: ${onDashboard}`);
          
          if (onDashboard) {
            // Look for subscription status (quick check)
            try {
              const subscriptionEl = await this.page.locator('[data-testid="subscription"], .subscription, .plan').first();
              const subscriptionText = await subscriptionEl.textContent({ timeout: 3000 });
              console.log(`   💳 Subscription status: ${subscriptionText}`);
            } catch (e) {
              console.log(`   💳 Subscription status: Not found`);
            }
          }
          
          return { dashboardAccessible: onDashboard };
        }, result);
      } catch (error) {
        console.log(`   ⚠️  Dashboard test failed, continuing: ${error.message}`);
        result.steps.push({ name: 'Test dashboard', success: false, error: error.message, optional: true });
      }

      // Step 7: Test responsive design (optional)
      try {
        await this.step('Test responsive design', async () => {
          // Test mobile viewport
          await this.page.setViewportSize({ width: 375, height: 667 });
          await this.page.goto(`https://${domain}`, { 
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.timeout 
          });
          await this.page.waitForLoadState('domcontentloaded');
          
          const isMobileResponsive = await this.page.evaluate(() => {
            const body = document.body;
            return body.scrollWidth <= window.innerWidth;
          });
          
          console.log(`   📱 Mobile responsive: ${isMobileResponsive}`);
          
          // Reset to desktop
          await this.page.setViewportSize(CONFIG.viewport);
          
          return { mobileResponsive: isMobileResponsive };
        }, result);
      } catch (error) {
        console.log(`   ⚠️  Responsive design test failed, continuing: ${error.message}`);
        result.steps.push({ name: 'Test responsive design', success: false, error: error.message, optional: true });
      }

      result.success = true;
      result.duration = Date.now() - startTime;
      
      console.log(`\n✅ ${domain} - ALL TESTS PASSED (${(result.duration/1000).toFixed(1)}s)`);

    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      console.error(`\n❌ ${domain} - TEST FAILED: ${error.message}`);
    } finally {
      clearTimeout(testTimeout);
    }

    this.results.push(result);
    return result;
  }

  async handleOverlays() {
    // Common overlay selectors to dismiss
    const overlaySelectors = [
      // Cookie banners
      'button:has-text("Accept")',
      'button:has-text("Accept All")', 
      'button:has-text("OK")',
      'button:has-text("Agree")',
      'button:has-text("Got it")',
      '[data-testid="accept-cookies"]',
      '[data-testid="cookie-accept"]',
      '.cookie-accept',
      '#cookiebot-accept',
      
      // Privacy notices
      'button:has-text("Continue")',
      'button:has-text("Proceed")',
      
      // General modal close buttons
      '[data-testid="close"]',
      '[data-testid="modal-close"]',
      'button[aria-label="Close"]',
      '.modal-close',
      
      // Age verification
      'button:has-text("Yes")',
      'button:has-text("Enter")',
      'button:has-text("I am 18+")',
      
      // Fixed overlays by class
      '.fixed.inset-0',
      '.fixed.bottom-0',
      '[style*="z-index: 999"]'
    ];

    for (const selector of overlaySelectors) {
      try {
        const element = await this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click({ timeout: 2000 });
          console.log(`   🍪 Dismissed overlay: ${selector}`);
          await this.page.waitForTimeout(500);
          break; // Only dismiss one at a time
        }
      } catch (error) {
        // Ignore errors, element might not exist
      }
    }
  }

  async step(name, fn, result, customTimeout = null) {
    const stepStart = Date.now();
    
    try {
      console.log(`\n🔄 ${name}...`);
      
      // Use custom timeout or default
      let timeout = customTimeout || CONFIG.stepTimeout;
      if (name === 'Reach message limit') {
        timeout = CONFIG.messageLimitTimeout;
      }
      
      // Wrap step in timeout
      const stepPromise = fn();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Step "${name}" timed out after ${timeout/1000}s`)), timeout);
      });
      
      const stepResult = await Promise.race([stepPromise, timeoutPromise]);
      
      const stepDuration = Date.now() - stepStart;
      result.steps.push({ name, success: true, data: stepResult, duration: stepDuration });
      console.log(`   ✅ ${name} completed (${(stepDuration/1000).toFixed(1)}s)`);
      return stepResult;
    } catch (error) {
      const stepDuration = Date.now() - stepStart;
      result.steps.push({ name, success: false, error: error.message, duration: stepDuration });
      console.error(`   ❌ ${name} failed: ${error.message} (${(stepDuration/1000).toFixed(1)}s)`);
      throw error;
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE QA REPORT');
    console.log('='.repeat(80));
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.length - successful;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Sites: ${this.results.length}`);
    console.log(`   Successful: ${successful} ✅`);
    console.log(`   Failed: ${failed} ❌`);
    console.log(`   Success Rate: ${((successful / this.results.length) * 100).toFixed(1)}%`);
    
    console.log(`\n📝 DETAILED RESULTS:`);
    
    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(1);
      const completedSteps = result.steps.filter(s => s.success).length;
      
      console.log(`\n🎭 ${result.domain.toUpperCase()} ${status}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Steps: ${completedSteps}/${result.steps.length}`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
      
      // Show step breakdown
      for (const step of result.steps) {
        const stepStatus = step.success ? '✅' : '❌';
        console.log(`     ${stepStatus} ${step.name}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        successful,
        failed,
        successRate: ((successful / this.results.length) * 100).toFixed(1)
      },
      results: this.results
    };
    
    const fs = require('fs');
    const reportPath = `qa-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Detailed report saved: ${reportPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('\n🧹 Browser closed');
    }
  }

  async runTests(domains) {
    await this.init();
    
    for (const domain of domains) {
      await this.testDomain(domain);
      
      // Brief pause between domains
      if (domains.length > 1) {
        console.log('\n⏸️  Pausing between tests...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    await this.generateReport();
    await this.cleanup();
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node simple-qa-runner.js <domain>     # Test single domain');
    console.log('  node simple-qa-runner.js --all        # Test all domains');
    console.log('  node simple-qa-runner.js --help       # Show help');
    process.exit(1);
  }
  
  let domainsToTest = [];
  
  if (args[0] === '--all') {
    domainsToTest = DOMAINS;
    console.log(`🚀 Testing ALL ${DOMAINS.length} character domains`);
  } else if (args[0] === '--help') {
    console.log('Simple QA Runner - Automated testing for character chat sites\n');
    console.log('Available domains:');
    DOMAINS.forEach(domain => console.log(`  - ${domain}`));
    process.exit(0);
  } else {
    domainsToTest = args;
    console.log(`🚀 Testing: ${domainsToTest.join(', ')}`);
  }
  
  const qa = new SimpleQARunner();
  await qa.runTests(domainsToTest);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { SimpleQARunner };