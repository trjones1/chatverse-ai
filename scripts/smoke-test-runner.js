#!/usr/bin/env node

/**
 * Smoke Test Runner - Quick validation after deployment
 * Tests core functionality in under 2 minutes per domain
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  headless: process.env.QA_HEADLESS === 'true',
  timeout: parseInt(process.env.QA_TIMEOUT) || 30000,
  slowMo: process.env.QA_HEADLESS === 'true' ? 0 : 500,
  screenshots: process.env.QA_TAKE_SCREENSHOTS === 'true'
};

class SmokeTestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      domain: '',
      startTime: Date.now(),
      environment: process.env.ENVIRONMENT || 'unknown',
      tests: [],
      success: false,
      errors: []
    };
  }

  async init() {
    console.log('🚀 Initializing Smoke Test Runner...');
    console.log('🔧 Config:', CONFIG);
    
    try {
      this.browser = await chromium.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo,
        // CI-friendly browser settings
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,720'
        ]
      });
      console.log('✅ Browser launched successfully');
      
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (compatible; QA-Bot/1.0; +https://github.com/your-repo)',
        // Additional CI settings
        bypassCSP: true,
        ignoreHTTPSErrors: true
      });
      console.log('✅ Browser context created');
      
      this.page = await context.newPage();
      this.page.setDefaultTimeout(CONFIG.timeout);
      console.log('✅ Page created with timeout:', CONFIG.timeout);
      
    } catch (error) {
      console.error('❌ Browser initialization failed:', error);
      throw error;
    }
    
    // Error handling
    this.page.on('pageerror', error => {
      console.error(`❌ Page Error: ${error.message}`);
      this.results.errors.push(`Page Error: ${error.message}`);
    });
    
    console.log('✅ Smoke test browser initialized');
  }

  async runSmokeTests(domain) {
    this.results.domain = domain;
    console.log(`\n🔥 SMOKE TESTING: ${domain.toUpperCase()}`);
    console.log('='.repeat(50));

    try {
      await this.test('Site Accessibility', async () => {
        // Use DEPLOYMENT_URL for preview deployments, fallback to domain
        const baseUrl = process.env.DEPLOYMENT_URL || `https://${domain}`;
        
        console.log(`🌐 Testing ${baseUrl}...`);
        console.log(`🔍 Environment: ${process.env.ENVIRONMENT || 'unknown'}`);
        console.log(`🎯 Using ${process.env.DEPLOYMENT_URL ? 'Vercel preview URL' : 'production domain'}`);
        
        const response = await this.page.goto(baseUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        
        if (!response.ok()) {
          throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
        }
        
        const title = await this.page.title();
        console.log(`   ✅ Site loaded: ${title}`);
        
        return { 
          status: response.status(),
          title: title,
          url: this.page.url()
        };
      });

      await this.test('Core UI Elements', async () => {
        // Check for essential UI elements
        const elements = await this.page.evaluate(() => {
          const checks = {
            hasInput: document.querySelector('input, textarea') !== null,
            hasButtons: document.querySelector('button') !== null,
            hasNavigation: document.querySelector('nav, [role="navigation"]') !== null,
            hasContent: document.body.textContent.trim().length > 100
          };
          
          return checks;
        });
        
        console.log(`   📱 Input fields: ${elements.hasInput ? '✅' : '❌'}`);
        console.log(`   🔘 Buttons: ${elements.hasButtons ? '✅' : '❌'}`);
        console.log(`   🧭 Navigation: ${elements.hasNavigation ? '✅' : '❌'}`);
        console.log(`   📄 Content: ${elements.hasContent ? '✅' : '❌'}`);
        
        const criticalMissing = !elements.hasInput || !elements.hasButtons || !elements.hasContent;
        if (criticalMissing) {
          throw new Error('Critical UI elements missing');
        }
        
        return elements;
      });

      await this.test('Performance Check', async () => {
        const metrics = await this.page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          if (!nav) return null;
          
          return {
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
            loadComplete: Math.round(nav.loadEventEnd - nav.fetchStart),
            transferSize: nav.transferSize,
            responseStart: Math.round(nav.responseStart - nav.fetchStart)
          };
        });
        
        if (metrics) {
          console.log(`   ⚡ DOM Ready: ${metrics.domContentLoaded}ms`);
          console.log(`   ⚡ Load Complete: ${metrics.loadComplete}ms`);
          console.log(`   📦 Transfer Size: ${(metrics.transferSize / 1024).toFixed(1)}KB`);
          
          // Performance thresholds
          const warnings = [];
          if (metrics.domContentLoaded > 3000) warnings.push('Slow DOM loading');
          if (metrics.loadComplete > 5000) warnings.push('Slow page load');
          if (metrics.transferSize > 1024 * 1024) warnings.push('Large transfer size');
          
          if (warnings.length > 0) {
            console.log(`   ⚠️  Performance warnings: ${warnings.join(', ')}`);
          }
        }
        
        return metrics;
      });

      await this.test('Chat Interface', async () => {
        // Quick chat interface test
        let chatWorking = false;
        
        try {
          const chatInput = await this.page.waitForSelector(
            'input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]',
            { timeout: 5000 }
          );
          
          if (chatInput) {
            await chatInput.fill('Test message');
            console.log('   💬 Chat input functional');
            chatWorking = true;
          }
        } catch (error) {
          console.log('   ⚠️  Chat input not found or not functional');
        }
        
        return { chatInputFunctional: chatWorking };
      });

      await this.test('Mobile Responsiveness', async () => {
        // Quick mobile check
        await this.page.setViewportSize({ width: 375, height: 667 });
        await this.page.waitForTimeout(1000);
        
        const mobileCheck = await this.page.evaluate(() => {
          return {
            noHorizontalScroll: document.body.scrollWidth <= window.innerWidth,
            hasViewportMeta: document.querySelector('meta[name="viewport"]') !== null,
            mobileWidth: window.innerWidth
          };
        });
        
        console.log(`   📱 Mobile viewport: ${mobileCheck.mobileWidth}px`);
        console.log(`   📱 No horizontal scroll: ${mobileCheck.noHorizontalScroll ? '✅' : '❌'}`);
        console.log(`   📱 Viewport meta tag: ${mobileCheck.hasViewportMeta ? '✅' : '❌'}`);
        
        // Reset viewport
        await this.page.setViewportSize({ width: 1280, height: 720 });
        
        return mobileCheck;
      });

      // Take screenshot for evidence
      if (CONFIG.screenshots) {
        await this.takeScreenshot('smoke-test-final');
      }

      this.results.success = true;
      this.results.duration = Date.now() - this.results.startTime;
      
      console.log(`\n🎉 SMOKE TEST PASSED: ${domain}`);
      console.log(`⏱️  Duration: ${(this.results.duration / 1000).toFixed(1)}s`);

    } catch (error) {
      this.results.success = false;
      this.results.duration = Date.now() - this.results.startTime;
      this.results.errors.push(error.message);
      
      console.error(`\n🚨 SMOKE TEST FAILED: ${domain}`);
      console.error(`❌ Error: ${error.message}`);
      
      if (CONFIG.screenshots) {
        await this.takeScreenshot('smoke-test-failure');
      }
    }

    return this.results;
  }

  async test(name, testFunction) {
    const testStart = Date.now();
    
    try {
      console.log(`\n🧪 ${name}...`);
      const result = await testFunction();
      
      const duration = Date.now() - testStart;
      this.results.tests.push({
        name,
        success: true,
        duration,
        data: result
      });
      
      console.log(`   ✅ ${name} passed (${duration}ms)`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - testStart;
      this.results.tests.push({
        name,
        success: false,
        duration,
        error: error.message
      });
      
      console.error(`   ❌ ${name} failed: ${error.message}`);
      throw error;
    }
  }

  async takeScreenshot(name) {
    try {
      if (!fs.existsSync('screenshots')) {
        fs.mkdirSync('screenshots', { recursive: true });
      }
      
      const filename = `screenshots/${this.results.domain}-${name}-${Date.now()}.png`;
      await this.page.screenshot({ 
        path: filename,
        fullPage: true
      });
      
      console.log(`   📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.error(`   ⚠️  Screenshot failed: ${error.message}`);
    }
  }

  async saveResults() {
    const filename = `smoke-test-${this.results.domain}-${Date.now()}.json`;
    
    fs.writeFileSync(filename, JSON.stringify({
      ...this.results,
      timestamp: new Date().toISOString(),
      ciInfo: {
        githubSha: process.env.GITHUB_SHA,
        githubRunId: process.env.GITHUB_RUN_ID,
        environment: process.env.ENVIRONMENT,
        deploymentUrl: process.env.DEPLOYMENT_URL
      }
    }, null, 2));
    
    console.log(`📄 Results saved: ${filename}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }
}

// CLI execution
async function main() {
  const domain = process.argv[2];
  
  // Handle help flags
  if (!domain || domain === '--help' || domain === '-h') {
    console.log(`
🔥 Smoke Test Runner - Quick domain validation

Usage: node smoke-test-runner.js <domain>

Examples:
  node smoke-test-runner.js chatwithlexi.com
  node smoke-test-runner.js fuckboychase.com
  node smoke-test-runner.js talktonyx.com

Environment Variables:
  QA_HEADLESS=true/false       Show/hide browser
  QA_TIMEOUT=30000            Timeout in milliseconds
  QA_TAKE_SCREENSHOTS=true    Capture screenshots
`);
    process.exit(0);
  }
  
  // Validate domain format
  if (!domain.includes('.')) {
    console.error('❌ Invalid domain format. Expected: domain.com');
    process.exit(1);
  }
  
  const runner = new SmokeTestRunner();
  
  try {
    await runner.init();
    const results = await runner.runSmokeTests(domain);
    await runner.saveResults();
    
    // Exit with appropriate code
    process.exit(results.success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Smoke test runner failed:', error.message);
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

module.exports = { SmokeTestRunner };