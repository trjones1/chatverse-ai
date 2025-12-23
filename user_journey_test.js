const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class UserJourneyTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      site: 'https://www.chatwithlexi.com',
      journeyFindings: [],
      screenshots: [],
      userStates: {},
      authTests: {}
    };
    this.screenshotDir = path.join(__dirname, 'qa_screenshots');
  }

  async init() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    this.browser = await chromium.launch({ headless: false });
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    this.page = await this.context.newPage();
    
    // Enable console logging
    this.page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    this.page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  }

  async takeScreenshot(name, description) {
    const filename = `journey_${Date.now()}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    
    this.results.screenshots.push({
      name,
      description,
      filename,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Screenshot taken: ${name} -> ${filename}`);
    return filename;
  }

  addFinding(severity, title, description, evidence = null) {
    this.results.journeyFindings.push({
      severity,
      title,
      description,
      evidence,
      timestamp: new Date().toISOString()
    });
    console.log(`[${severity.toUpperCase()}] ${title}: ${description}`);
  }

  async testAnonymousUserExperience() {
    console.log('=== TESTING ANONYMOUS USER EXPERIENCE ===');
    
    try {
      // Navigate to homepage as anonymous user
      await this.page.goto('https://www.chatwithlexi.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.takeScreenshot('anonymous_homepage', 'Homepage as anonymous user');
      
      // Check for login/signup options
      const loginButton = this.page.getByText('Log In', { exact: false }).first();
      const signupButton = this.page.getByText('Sign Up', { exact: false }).first();
      
      if (await loginButton.count() > 0) {
        this.addFinding('POSITIVE', 'Login option available', 'Login button found for anonymous users');
      } else {
        this.addFinding('HIGH', 'Login option missing', 'No login button found for anonymous users');
      }
      
      if (await signupButton.count() > 0) {
        this.addFinding('POSITIVE', 'Signup option available', 'Signup button found for anonymous users');
      } else {
        this.addFinding('MEDIUM', 'Signup option missing', 'No signup button found for anonymous users');
      }
      
      // Test dashboard access as anonymous user
      console.log('Testing dashboard access as anonymous user...');
      await this.page.goto('https://www.chatwithlexi.com/dashboard', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      await this.takeScreenshot('anonymous_dashboard', 'Dashboard page as anonymous user');
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('/dashboard')) {
        this.addFinding('POSITIVE', 'Anonymous dashboard access', 'Anonymous users can access dashboard with upgrade prompts');
      } else {
        this.addFinding('MEDIUM', 'Anonymous dashboard redirect', 'Anonymous users redirected from dashboard');
      }
      
      // Test chat access as anonymous user
      console.log('Testing chat access as anonymous user...');
      await this.page.goto('https://www.chatwithlexi.com/chat', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.takeScreenshot('anonymous_chat', 'Chat page as anonymous user');
      
      const chatUrl = this.page.url();
      if (chatUrl.includes('/chat')) {
        this.addFinding('POSITIVE', 'Anonymous chat access', 'Anonymous users can access chat interface');
        
        // Check for message limits or upgrade prompts
        const limitText = this.page.locator('text=/message.*remaining|limit|free|upgrade/i').first();
        if (await limitText.count() > 0) {
          const limitContent = await limitText.textContent();
          this.addFinding('POSITIVE', 'Message limits displayed', `Message limits shown: ${limitContent}`);
        }
      }
      
    } catch (error) {
      this.addFinding('HIGH', 'Anonymous user test failed', `Error testing anonymous experience: ${error.message}`);
    }
  }

  async testLoginFlow() {
    console.log('=== TESTING LOGIN FLOW ===');
    
    try {
      // Navigate to homepage
      await this.page.goto('https://www.chatwithlexi.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Look for login button
      const loginButton = this.page.getByText('Log In', { exact: false }).first();
      
      if (await loginButton.count() > 0) {
        console.log('Clicking login button...');
        await loginButton.click();
        
        // Wait for login modal or redirect
        await this.page.waitForTimeout(2000);
        
        await this.takeScreenshot('login_modal_opened', 'Login modal/page after clicking login');
        
        // Check if we're in a modal or redirected to auth page
        const currentUrl = this.page.url();
        const modalPresent = await this.page.locator('[role="dialog"], .modal, .login-modal').count() > 0;
        
        if (modalPresent) {
          this.addFinding('POSITIVE', 'Login modal opens', 'Login modal appears when clicking login button');
          
          // Look for email input
          const emailInput = this.page.locator('input[type="email"], input[name="email"]').first();
          if (await emailInput.count() > 0) {
            this.addFinding('POSITIVE', 'Email input present', 'Email input field found in login form');
          } else {
            this.addFinding('HIGH', 'Email input missing', 'No email input found in login form');
          }
          
          // Look for password input
          const passwordInput = this.page.locator('input[type="password"], input[name="password"]').first();
          if (await passwordInput.count() > 0) {
            this.addFinding('POSITIVE', 'Password input present', 'Password input field found in login form');
          } else {
            this.addFinding('HIGH', 'Password input missing', 'No password input found in login form');
          }
          
          // Look for submit button
          const submitButton = this.page.locator('button[type="submit"], button').filter({ hasText: /sign in|login|submit/i }).first();
          if (await submitButton.count() > 0) {
            this.addFinding('POSITIVE', 'Login submit button present', 'Submit button found in login form');
          } else {
            this.addFinding('HIGH', 'Login submit button missing', 'No submit button found in login form');
          }
          
        } else if (currentUrl !== 'https://www.chatwithlexi.com') {
          this.addFinding('POSITIVE', 'Login redirect works', `Login redirects to auth page: ${currentUrl}`);
        } else {
          this.addFinding('HIGH', 'Login flow broken', 'Login button does not open modal or redirect');
        }
        
      } else {
        this.addFinding('CRITICAL', 'Login button not found', 'Cannot locate login button to test authentication flow');
      }
      
    } catch (error) {
      this.addFinding('HIGH', 'Login flow test failed', `Error testing login flow: ${error.message}`);
    }
  }

  async testSignupFlow() {
    console.log('=== TESTING SIGNUP FLOW ===');
    
    try {
      // Navigate back to homepage
      await this.page.goto('https://www.chatwithlexi.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Look for signup buttons (could be multiple)
      const signupButtons = this.page.getByText('Sign Up', { exact: false });
      const signupCount = await signupButtons.count();
      
      if (signupCount > 0) {
        console.log(`Found ${signupCount} signup buttons`);
        this.addFinding('POSITIVE', 'Signup options available', `${signupCount} signup buttons found`);
        
        // Try clicking the first signup button
        await signupButtons.first().click();
        await this.page.waitForTimeout(2000);
        
        await this.takeScreenshot('signup_modal_opened', 'Signup modal/page after clicking signup');
        
        // Check for signup form elements
        const emailInput = this.page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = this.page.locator('input[type="password"], input[name="password"]').first();
        
        if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
          this.addFinding('POSITIVE', 'Signup form complete', 'Signup form has email and password inputs');
        } else {
          this.addFinding('HIGH', 'Signup form incomplete', 'Signup form missing required inputs');
        }
        
      } else {
        this.addFinding('HIGH', 'Signup buttons not found', 'No signup buttons located on homepage');
      }
      
    } catch (error) {
      this.addFinding('HIGH', 'Signup flow test failed', `Error testing signup flow: ${error.message}`);
    }
  }

  async testPremiumUpgradeFlow() {
    console.log('=== TESTING PREMIUM UPGRADE FLOW ===');
    
    try {
      // Navigate to dashboard to look for upgrade options
      await this.page.goto('https://www.chatwithlexi.com/dashboard', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.takeScreenshot('dashboard_upgrade_options', 'Dashboard showing upgrade options');
      
      // Look for premium upgrade buttons
      const upgradeButtons = this.page.locator('button, a').filter({ hasText: /premium|upgrade|subscribe|\$|pay/i });
      const upgradeCount = await upgradeButtons.count();
      
      if (upgradeCount > 0) {
        console.log(`Found ${upgradeCount} upgrade options`);
        this.addFinding('POSITIVE', 'Premium upgrade options available', `${upgradeCount} upgrade buttons/links found`);
        
        // Try clicking an upgrade button (but don't complete payment)
        try {
          await upgradeButtons.first().click();
          await this.page.waitForTimeout(3000);
          
          await this.takeScreenshot('upgrade_flow_started', 'After clicking upgrade button');
          
          const currentUrl = this.page.url();
          if (currentUrl.includes('stripe') || currentUrl.includes('checkout') || currentUrl.includes('payment')) {
            this.addFinding('POSITIVE', 'Payment flow integration', 'Upgrade button redirects to payment processor');
          } else {
            // Check if a payment modal opened
            const paymentModal = await this.page.locator('[role="dialog"], .modal, .checkout').count() > 0;
            if (paymentModal) {
              this.addFinding('POSITIVE', 'Payment modal opens', 'Payment modal appears for upgrade flow');
            } else {
              this.addFinding('MEDIUM', 'Upgrade flow unclear', 'Upgrade button behavior unclear');
            }
          }
          
        } catch (clickError) {
          this.addFinding('MEDIUM', 'Upgrade button click failed', `Could not click upgrade button: ${clickError.message}`);
        }
        
      } else {
        this.addFinding('HIGH', 'Premium upgrade options missing', 'No premium upgrade options found on dashboard');
      }
      
    } catch (error) {
      this.addFinding('HIGH', 'Premium upgrade test failed', `Error testing premium upgrade: ${error.message}`);
    }
  }

  async testNavigationConsistency() {
    console.log('=== TESTING NAVIGATION CONSISTENCY ===');
    
    const pages = [
      { path: '/', name: 'Homepage' },
      { path: '/chat', name: 'Chat' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/settings', name: 'Settings' }
    ];
    
    for (const page of pages) {
      try {
        console.log(`Testing navigation to ${page.name}...`);
        
        await this.page.goto(`https://www.chatwithlexi.com${page.path}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        
        await this.takeScreenshot(`nav_${page.name.toLowerCase()}`, `Navigation to ${page.name}`);
        
        // Check for common navigation elements
        const navElement = this.page.locator('nav, .navigation, header').first();
        if (await navElement.count() > 0) {
          this.addFinding('POSITIVE', `${page.name} navigation present`, `Navigation element found on ${page.name}`);
        } else {
          this.addFinding('MEDIUM', `${page.name} navigation missing`, `No navigation element on ${page.name}`);
        }
        
        // Check page loads without errors
        const currentUrl = this.page.url();
        if (currentUrl.includes(page.path) || currentUrl === 'https://www.chatwithlexi.com/') {
          this.addFinding('POSITIVE', `${page.name} page loads`, `${page.name} page loads successfully`);
        } else {
          this.addFinding('MEDIUM', `${page.name} page redirect`, `${page.name} redirects to ${currentUrl}`);
        }
        
      } catch (error) {
        this.addFinding('HIGH', `${page.name} navigation failed`, `Cannot navigate to ${page.name}: ${error.message}`);
      }
    }
  }

  async testResponsiveNavigation() {
    console.log('=== TESTING RESPONSIVE NAVIGATION ===');
    
    try {
      await this.page.goto('https://www.chatwithlexi.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Test mobile viewport
      await this.page.setViewportSize({ width: 375, height: 667 });
      await this.page.waitForTimeout(1000);
      
      await this.takeScreenshot('mobile_navigation', 'Navigation on mobile viewport');
      
      // Look for mobile menu button (hamburger)
      const mobileMenuButton = this.page.locator('button').filter({ hasText: /menu|☰|≡/i }).or(
        this.page.locator('[aria-label*="menu"], [aria-label*="navigation"]')
      ).first();
      
      if (await mobileMenuButton.count() > 0) {
        this.addFinding('POSITIVE', 'Mobile menu button present', 'Mobile navigation menu button found');
        
        // Try opening mobile menu
        await mobileMenuButton.click();
        await this.page.waitForTimeout(1000);
        
        await this.takeScreenshot('mobile_menu_opened', 'Mobile navigation menu opened');
        
        // Check if menu items are visible
        const menuItems = this.page.locator('a, button').filter({ hasText: /chat|dashboard|settings|login/i });
        const menuItemCount = await menuItems.count();
        
        if (menuItemCount > 0) {
          this.addFinding('POSITIVE', 'Mobile menu functional', `${menuItemCount} menu items found in mobile menu`);
        } else {
          this.addFinding('HIGH', 'Mobile menu empty', 'Mobile menu does not show navigation items');
        }
        
      } else {
        // Check if desktop navigation is still visible and functional on mobile
        const desktopNav = this.page.locator('nav a, nav button').first();
        if (await desktopNav.count() > 0) {
          this.addFinding('MEDIUM', 'Desktop nav on mobile', 'Desktop navigation shown on mobile (may not be optimal)');
        } else {
          this.addFinding('HIGH', 'No mobile navigation', 'No navigation options found on mobile viewport');
        }
      }
      
      // Return to desktop viewport
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      
    } catch (error) {
      this.addFinding('HIGH', 'Responsive navigation test failed', `Error testing responsive navigation: ${error.message}`);
    }
  }

  async generateUserJourneyReport() {
    console.log('=== GENERATING USER JOURNEY REPORT ===');
    
    const positiveFindings = this.results.journeyFindings.filter(f => f.severity === 'POSITIVE').length;
    const criticalFindings = this.results.journeyFindings.filter(f => f.severity === 'CRITICAL').length;
    const highFindings = this.results.journeyFindings.filter(f => f.severity === 'HIGH').length;
    const mediumFindings = this.results.journeyFindings.filter(f => f.severity === 'MEDIUM').length;
    
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>ChatWithLexi - User Journey QA Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .finding { margin: 15px 0; padding: 15px; border-left: 4px solid #ccc; }
        .finding.CRITICAL { border-left-color: #ff0000; background-color: #fff5f5; }
        .finding.HIGH { border-left-color: #ff6600; background-color: #fffaf0; }
        .finding.MEDIUM { border-left-color: #ffcc00; background-color: #fffef0; }
        .finding.POSITIVE { border-left-color: #00cc00; background-color: #f0fff0; }
        .screenshot { margin: 10px 0; }
        .summary { background-color: #e6f3ff; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ChatWithLexi - User Journey QA Report</h1>
        <p><strong>Site:</strong> ${this.results.site}</p>
        <p><strong>Assessment Date:</strong> ${new Date(this.results.timestamp).toLocaleString()}</p>
        <p><strong>Focus:</strong> User Authentication, Navigation, and Journey Testing</p>
    </div>
    
    <div class="summary">
        <h2>User Journey Summary</h2>
        <p><strong>Positive Findings:</strong> ${positiveFindings} (working features)</p>
        <p><strong>Critical Issues:</strong> ${criticalFindings}</p>
        <p><strong>High Priority Issues:</strong> ${highFindings}</p>
        <p><strong>Medium Priority Issues:</strong> ${mediumFindings}</p>
        <p><strong>Total Screenshots:</strong> ${this.results.screenshots.length}</p>
    </div>

    <div class="section">
        <h2>User Journey Findings</h2>
        ${this.results.journeyFindings.map(finding => `
            <div class="finding ${finding.severity}">
                <h3>[${finding.severity}] ${finding.title}</h3>
                <p>${finding.description}</p>
                <small>Detected at: ${new Date(finding.timestamp).toLocaleString()}</small>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Test Screenshots</h2>
        ${this.results.screenshots.map(screenshot => `
            <div class="screenshot">
                <h4>${screenshot.name}</h4>
                <p>${screenshot.description}</p>
                <p><strong>File:</strong> ${screenshot.filename}</p>
                <small>Taken at: ${new Date(screenshot.timestamp).toLocaleString()}</small>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;

    const reportPath = path.join(__dirname, 'user_journey_report.html');
    fs.writeFileSync(reportPath, reportHTML);
    
    const resultsPath = path.join(__dirname, 'user_journey_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    console.log(`User journey report generated: ${reportPath}`);
    console.log(`Raw results: ${resultsPath}`);
    
    return { reportPath, resultsPath };
  }

  async runUserJourneyTest() {
    try {
      await this.init();
      
      await this.testAnonymousUserExperience();
      await this.testLoginFlow();
      await this.testSignupFlow();
      await this.testPremiumUpgradeFlow();
      await this.testNavigationConsistency();
      await this.testResponsiveNavigation();
      
      const { reportPath, resultsPath } = await this.generateUserJourneyReport();
      
      return { success: true, reportPath, resultsPath };
      
    } catch (error) {
      console.error('User journey test failed:', error);
      return { success: false, error: error.message };
      
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run user journey test
const journeyTest = new UserJourneyTest();
journeyTest.runUserJourneyTest().then(result => {
  console.log('User journey test completed:', result);
  process.exit(0);
}).catch(error => {
  console.error('User journey test error:', error);
  process.exit(1);
});