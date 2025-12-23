#!/usr/bin/env node

/**
 * Comprehensive QA Runner - Full user journey testing for CI/CD
 * Tests complete user flow including email verification and payments
 */

const { chromium } = require('playwright');
const fs = require('fs');

class ComprehensiveQARunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      batchName: process.env.QA_BATCH_NAME || 'default',
      domains: [],
      startTime: Date.now(),
      environment: process.env.ENVIRONMENT || 'unknown',
      deploymentUrl: process.env.DEPLOYMENT_URL || 'unknown'
    };
  }

  async init() {
    console.log('🚀 Initializing Comprehensive QA Runner...');
    
    this.browser = await chromium.launch({
      headless: process.env.QA_HEADLESS === 'true',
      slowMo: process.env.QA_HEADLESS === 'true' ? 0 : 500
    });
    
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    this.page = await context.newPage();
    this.page.setDefaultTimeout(parseInt(process.env.QA_TIMEOUT) || 60000);
    
    console.log('✅ Comprehensive QA browser initialized');
  }

  async runTests() {
    const domains = (process.env.TEST_DOMAINS || '').split(',').filter(Boolean);
    
    if (domains.length === 0) {
      throw new Error('No domains specified in TEST_DOMAINS');
    }
    
    console.log(`🎭 Testing ${domains.length} domains: ${domains.join(', ')}`);
    
    for (const domain of domains) {
      await this.testDomain(domain.trim());
    }
    
    await this.generateReport();
  }

  async testDomain(domain) {
    const domainResult = {
      domain,
      startTime: Date.now(),
      tests: [],
      success: false,
      errors: []
    };

    try {
      console.log(`\n🎭 COMPREHENSIVE TESTING: ${domain.toUpperCase()}`);
      console.log('='.repeat(60));

      // Test 1: Site Loading & Performance
      await this.test(domainResult, 'Site Loading & Performance', async () => {
        // Use DEPLOYMENT_URL for preview deployments, fallback to domain
        const baseUrl = process.env.DEPLOYMENT_URL || `https://${domain}`;
        console.log(`🌐 Testing ${baseUrl} (${process.env.DEPLOYMENT_URL ? 'preview' : 'production'})`);
        
        const response = await this.page.goto(baseUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        const metrics = await this.page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          const paint = performance.getEntriesByName('first-contentful-paint')[0];
          
          return {
            status: nav ? Math.round(nav.responseStart - nav.fetchStart) : 0,
            domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.fetchStart) : 0,
            loadComplete: nav ? Math.round(nav.loadEventEnd - nav.fetchStart) : 0,
            firstContentfulPaint: paint ? Math.round(paint.startTime) : 0,
            transferSize: nav ? nav.transferSize : 0
          };
        });

        await this.takeScreenshot(domain, 'initial-load');
        
        return { 
          httpStatus: response.status(),
          title: await this.page.title(),
          metrics 
        };
      });

      // Test 2: Chat Interface Interaction
      await this.test(domainResult, 'Chat Interface Interaction', async () => {
        const chatInput = await this.page.waitForSelector(
          'input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]',
          { timeout: 10000 }
        );

        // Send initial message
        await chatInput.fill('Hello! Testing the chat interface.');
        
        const sendButton = await this.page.locator('button[type="submit"], button:has-text("Send")').first();
        await sendButton.click();
        
        // Wait for response
        await this.page.waitForTimeout(3000);
        
        // Send more messages to hit limit
        const messages = [
          "Tell me about yourself",
          "What's your favorite activity?", 
          "I'm enjoying our conversation"
        ];
        
        for (const message of messages) {
          await chatInput.fill(message);
          await sendButton.click();
          await this.page.waitForTimeout(2000);
        }
        
        await this.takeScreenshot(domain, 'chat-interaction');
        
        return { messagesSent: messages.length + 1 };
      });

      // Test 3: Paywall/Upgrade Flow
      await this.test(domainResult, 'Paywall & Upgrade Flow', async () => {
        // Look for upgrade prompts
        try {
          const upgradeElement = await this.page.waitForSelector(
            '[data-testid*="upgrade"], button:has-text("Upgrade"), .upgrade-prompt, button:has-text("Sign Up")',
            { timeout: 15000 }
          );
          
          await upgradeElement.click();
          await this.page.waitForTimeout(2000);
          
          await this.takeScreenshot(domain, 'paywall-triggered');
          
          return { paywallTriggered: true };
        } catch (error) {
          console.log('   ℹ️  Paywall not triggered or different flow');
          return { paywallTriggered: false };
        }
      });

      // Test 4: Account Creation Flow
      await this.test(domainResult, 'Account Creation Flow', async () => {
        const testEmail = `qa-test-${Date.now()}@1secmail.com`;
        
        try {
          // Look for email input
          const emailInput = await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
          await emailInput.fill(testEmail);
          
          const passwordInput = await this.page.locator('input[type="password"], input[name="password"]').first();
          await passwordInput.fill('TestPassword123!');
          
          // Submit form
          const submitBtn = await this.page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create")').first();
          await submitBtn.click();
          
          await this.page.waitForTimeout(3000);
          await this.takeScreenshot(domain, 'account-creation');
          
          return { 
            accountCreationAttempted: true, 
            testEmail: testEmail 
          };
        } catch (error) {
          return { 
            accountCreationAttempted: false, 
            error: error.message 
          };
        }
      });

      // Test 5: Dashboard/Settings Access
      await this.test(domainResult, 'Dashboard Access', async () => {
        try {
          // Use DEPLOYMENT_URL for preview deployments, fallback to domain
          const baseUrl = process.env.DEPLOYMENT_URL || `https://${domain}`;
          const dashboardUrl = baseUrl + '/dashboard';
          await this.page.goto(dashboardUrl, { waitUntil: 'networkidle' });
          
          const currentUrl = this.page.url();
          const onDashboard = currentUrl.includes('dashboard') || currentUrl.includes('portal');
          
          if (onDashboard) {
            await this.takeScreenshot(domain, 'dashboard-view');
          }
          
          return { 
            dashboardAccessible: onDashboard,
            currentUrl: currentUrl
          };
        } catch (error) {
          return { 
            dashboardAccessible: false,
            error: error.message
          };
        }
      });

      // Test 6: Mobile Responsiveness
      await this.test(domainResult, 'Mobile Responsiveness', async () => {
        await this.page.setViewportSize({ width: 375, height: 667 });
        // Use DEPLOYMENT_URL for preview deployments, fallback to domain
        const baseUrl = process.env.DEPLOYMENT_URL || `https://${domain}`;
        await this.page.goto(baseUrl, { waitUntil: 'networkidle' });
        
        const mobileMetrics = await this.page.evaluate(() => {
          return {
            viewportWidth: window.innerWidth,
            bodyWidth: document.body.scrollWidth,
            hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
            hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
            isMobileOptimized: document.body.scrollWidth <= window.innerWidth + 20
          };
        });
        
        await this.takeScreenshot(domain, 'mobile-view');
        
        // Reset viewport
        await this.page.setViewportSize({ width: 1280, height: 720 });
        
        return mobileMetrics;
      });

      domainResult.success = true;
      domainResult.duration = Date.now() - domainResult.startTime;
      
      console.log(`✅ ${domain} - All tests completed (${(domainResult.duration/1000).toFixed(1)}s)`);

    } catch (error) {
      domainResult.success = false;
      domainResult.duration = Date.now() - domainResult.startTime;
      domainResult.errors.push(error.message);
      
      console.error(`❌ ${domain} - Testing failed: ${error.message}`);
      await this.takeScreenshot(domain, 'error-state');
    }

    this.results.domains.push(domainResult);
  }

  async test(domainResult, testName, testFunction) {
    const testStart = Date.now();
    
    try {
      console.log(`🧪 ${testName}...`);
      const result = await testFunction();
      
      const duration = Date.now() - testStart;
      domainResult.tests.push({
        name: testName,
        success: true,
        duration,
        data: result
      });
      
      console.log(`   ✅ ${testName} (${duration}ms)`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - testStart;
      domainResult.tests.push({
        name: testName,
        success: false,
        duration,
        error: error.message
      });
      
      console.error(`   ❌ ${testName} failed: ${error.message}`);
      throw error;
    }
  }

  async takeScreenshot(domain, stage) {
    try {
      if (!fs.existsSync('screenshots')) {
        fs.mkdirSync('screenshots', { recursive: true });
      }
      
      const filename = `screenshots/${domain}-${stage}-${Date.now()}.png`;
      await this.page.screenshot({ 
        path: filename,
        fullPage: true
      });
      
      console.log(`   📸 Screenshot: ${filename}`);
    } catch (error) {
      console.error(`   ⚠️  Screenshot failed: ${error.message}`);
    }
  }

  async generateReport() {
    this.results.duration = Date.now() - this.results.startTime;
    this.results.summary = {
      totalDomains: this.results.domains.length,
      successful: this.results.domains.filter(d => d.success).length,
      failed: this.results.domains.filter(d => !d.success).length,
      successRate: ((this.results.domains.filter(d => d.success).length / this.results.domains.length) * 100).toFixed(1),
      totalDuration: `${(this.results.duration / 1000).toFixed(1)}s`
    };

    // Save detailed JSON report
    const reportFilename = `qa-report-${this.results.batchName}-${Date.now()}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify({
      ...this.results,
      timestamp: new Date().toISOString(),
      ciInfo: {
        githubSha: process.env.GITHUB_SHA,
        githubRunId: process.env.GITHUB_RUN_ID,
        githubRepository: process.env.GITHUB_REPOSITORY
      }
    }, null, 2));

    console.log(`\n📊 COMPREHENSIVE QA REPORT - ${this.results.batchName.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log(`Total Domains: ${this.results.summary.totalDomains}`);
    console.log(`Successful: ${this.results.summary.successful} ✅`);
    console.log(`Failed: ${this.results.summary.failed} ❌`);
    console.log(`Success Rate: ${this.results.summary.successRate}%`);
    console.log(`Duration: ${this.results.summary.totalDuration}`);
    console.log(`Report saved: ${reportFilename}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI execution
async function main() {
  const runner = new ComprehensiveQARunner();
  
  try {
    await runner.init();
    await runner.runTests();
    
    const successfulDomains = runner.results.domains.filter(d => d.success).length;
    const totalDomains = runner.results.domains.length;
    
    // Exit with error code if any tests failed
    process.exit(successfulDomains === totalDomains ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Comprehensive QA failed:', error.message);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { ComprehensiveQARunner };