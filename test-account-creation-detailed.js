const { chromium } = require('playwright');
const fs = require('fs');

async function testAccountCreationFlow() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    devtools: true  // Open devtools for better debugging
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  const timestamp = Date.now();
  const screenshotDir = `/Users/tramel/code/lexi-bot/screenshots`;
  
  // Ensure screenshot directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  // Comprehensive logging setup
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location();
    console.log(`[BROWSER ${type.toUpperCase()}] ${location.url}:${location.lineNumber} - ${text}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.name}: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });
  
  // Track network requests and responses
  const networkLogs = [];
  page.on('request', request => {
    const requestInfo = {
      type: 'request',
      timestamp: new Date().toISOString(),
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData()
    };
    networkLogs.push(requestInfo);
    console.log(`[REQUEST] ${request.method()} ${request.url()}`);
  });
  
  page.on('response', response => {
    const responseInfo = {
      type: 'response',
      timestamp: new Date().toISOString(),
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers()
    };
    networkLogs.push(responseInfo);
    console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
  });
  
  try {
    console.log('🚀 Starting Account Creation Flow Test');
    
    // Step 1: Navigate to the app
    console.log('📍 Step 1: Navigating to localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.screenshot({ 
      path: `${screenshotDir}/step-1-homepage-${timestamp}.png`,
      fullPage: true 
    });
    
    // Step 2: Look for and click the Login button
    console.log('📍 Step 2: Looking for Login button...');
    const loginButton = page.locator('[data-testid="login-button"]');
    
    if (await loginButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Found Login button, clicking...');
      await loginButton.click();
      await page.waitForTimeout(2000); // Wait for modal to appear
      
      await page.screenshot({ 
        path: `${screenshotDir}/step-2-after-login-click-${timestamp}.png`,
        fullPage: true 
      });
    } else {
      console.log('❌ Login button not found. Looking for mobile menu...');
      const mobileMenuButton = page.locator('button[aria-haspopup="menu"]');
      
      if (await mobileMenuButton.isVisible({ timeout: 3000 })) {
        console.log('📱 Found mobile menu button, clicking...');
        await mobileMenuButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: `${screenshotDir}/step-2-mobile-menu-${timestamp}.png`,
          fullPage: true 
        });
        
        // Look for Log In in mobile menu
        const mobileLoginButton = page.locator('button:has-text("Log In")');
        if (await mobileLoginButton.isVisible()) {
          console.log('✅ Found mobile Login button, clicking...');
          await mobileLoginButton.click();
          await page.waitForTimeout(2000);
        }
      } else {
        console.log('❌ No login interface found');
        throw new Error('Could not find login button');
      }
    }
    
    // Step 3: Look for the LoginModal
    console.log('📍 Step 3: Looking for LoginModal...');
    
    // Check for various modal indicators
    const modalSelectors = [
      '.modal', 
      '[role="dialog"]',
      'form:has(input[type="email"])',
      'div:has-text("Create Account")',
      'div:has-text("Join")',
      'h2:has-text("Join")'
    ];
    
    let modalFound = false;
    for (const selector of modalSelectors) {
      try {
        const modal = page.locator(selector).first();
        if (await modal.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found modal with selector: ${selector}`);
          modalFound = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!modalFound) {
      console.log('❌ Modal not immediately visible. Checking if modal is rendered but hidden...');
      await page.screenshot({ 
        path: `${screenshotDir}/step-3-no-modal-visible-${timestamp}.png`,
        fullPage: true 
      });
      
      // Try to manually dispatch the modal event
      await page.evaluate(() => {
        console.log('Manually dispatching open-login event...');
        const event = new Event('open-login');
        window.dispatchEvent(event);
        document.dispatchEvent(event);
      });
      
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: `${screenshotDir}/step-3-after-manual-event-${timestamp}.png`,
        fullPage: true 
      });
    }
    
    // Step 4: Look for email and password fields
    console.log('📍 Step 4: Looking for form fields...');
    
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();
    
    if (await emailInput.isVisible({ timeout: 5000 }) && await passwordInput.isVisible({ timeout: 5000 })) {
      console.log('✅ Found email and password fields');
      
      // Step 5: Fill in test credentials
      console.log('📍 Step 5: Filling in test credentials...');
      await emailInput.clear();
      await emailInput.fill('test123@example.com');
      
      await passwordInput.clear();
      await passwordInput.fill('password123');
      
      await page.screenshot({ 
        path: `${screenshotDir}/step-5-credentials-filled-${timestamp}.png`,
        fullPage: true 
      });
      
      // Step 6: Look for submit button and submit
      console.log('📍 Step 6: Looking for submit button...');
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Create Account")',
        'button:has-text("Sign Up")',
        'button:has-text("Join")',
        'form button'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = page.locator(selector).first();
          if (await submitButton.isVisible({ timeout: 2000 })) {
            console.log(`✅ Found submit button: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (submitButton) {
        console.log('📍 Step 7: Clicking submit button and monitoring for errors...');
        
        // Start monitoring for database errors before submission
        const errors = [];
        page.on('console', (msg) => {
          const text = msg.text();
          if (text.includes('Database error') || 
              text.includes('Error saving') ||
              text.includes('signup error') ||
              msg.type() === 'error') {
            errors.push({
              type: msg.type(),
              text: text,
              location: msg.location(),
              timestamp: new Date().toISOString()
            });
          }
        });
        
        await submitButton.click();
        
        // Wait for submission to complete
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
          path: `${screenshotDir}/step-7-after-submit-${timestamp}.png`,
          fullPage: true 
        });
        
        // Step 8: Check for success or error messages
        console.log('📍 Step 8: Checking for results...');
        
        // Look for success indicators
        const successSelectors = [
          ':has-text("Account Created")',
          ':has-text("Success")',
          ':has-text("Check your email")',
          '.success',
          '.alert-success'
        ];
        
        let successFound = false;
        for (const selector of successSelectors) {
          try {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              const text = await element.textContent();
              console.log(`✅ SUCCESS FOUND: ${text}`);
              successFound = true;
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Look for error indicators
        const errorSelectors = [
          ':has-text("Database error")',
          ':has-text("Error saving")',
          ':has-text("failed")',
          '.error',
          '.alert-error',
          '[role="alert"]'
        ];
        
        let errorMessages = [];
        for (const selector of errorSelectors) {
          try {
            const elements = page.locator(selector);
            const count = await elements.count();
            for (let i = 0; i < count; i++) {
              const element = elements.nth(i);
              if (await element.isVisible()) {
                const text = await element.textContent();
                if (text && text.trim()) {
                  errorMessages.push(text.trim());
                  console.log(`❌ ERROR FOUND: ${text}`);
                }
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Step 9: Test with alternative email if errors found
        if (errorMessages.length > 0) {
          console.log('📍 Step 9: Testing with alternative email due to errors...');
          
          // Clear and fill with different email
          await emailInput.clear();
          await emailInput.fill('test456@example.com');
          await passwordInput.clear();
          await passwordInput.fill('password123');
          
          await page.screenshot({ 
            path: `${screenshotDir}/step-9-alternative-email-${timestamp}.png`,
            fullPage: true 
          });
          
          await submitButton.click();
          await page.waitForTimeout(5000);
          
          await page.screenshot({ 
            path: `${screenshotDir}/step-9-alternative-result-${timestamp}.png`,
            fullPage: true 
          });
          
          // Check results again
          let alternativeErrors = [];
          for (const selector of errorSelectors) {
            try {
              const elements = page.locator(selector);
              const count = await elements.count();
              for (let i = 0; i < count; i++) {
                const element = elements.nth(i);
                if (await element.isVisible()) {
                  const text = await element.textContent();
                  if (text && text.trim()) {
                    alternativeErrors.push(text.trim());
                    console.log(`❌ ALTERNATIVE TEST ERROR: ${text}`);
                  }
                }
              }
            } catch (e) {
              // Continue
            }
          }
          
          console.log(`🔄 Consistency check: Original errors: ${errorMessages.length}, Alternative errors: ${alternativeErrors.length}`);
        }
        
        // Final results summary
        console.log('\n📊 TEST RESULTS SUMMARY:');
        console.log(`✅ Success indicators found: ${successFound}`);
        console.log(`❌ Error messages found: ${errorMessages.length}`);
        console.log(`📝 Error details:`, errorMessages);
        console.log(`🖥️ Console errors captured:`, errors.length);
        console.log(`📡 Network requests logged:`, networkLogs.length);
        
        // Save detailed results
        const testResults = {
          timestamp: new Date().toISOString(),
          success: successFound,
          errorMessages,
          consoleErrors: errors,
          networkActivity: networkLogs,
          testEmail1: 'test123@example.com',
          testEmail2: 'test456@example.com'
        };
        
        fs.writeFileSync(
          `/Users/tramel/code/lexi-bot/account-creation-test-results-${timestamp}.json`,
          JSON.stringify(testResults, null, 2)
        );
        
      } else {
        console.log('❌ No submit button found');
        await page.screenshot({ 
          path: `${screenshotDir}/step-no-submit-button-${timestamp}.png`,
          fullPage: true 
        });
      }
      
    } else {
      console.log('❌ Could not find email/password form fields');
      await page.screenshot({ 
        path: `${screenshotDir}/step-no-form-fields-${timestamp}.png`,
        fullPage: true 
      });
      
      // Debug: Log all visible inputs
      const allInputs = page.locator('input');
      const inputCount = await allInputs.count();
      console.log(`Found ${inputCount} input elements:`);
      
      for (let i = 0; i < inputCount; i++) {
        const input = allInputs.nth(i);
        if (await input.isVisible()) {
          const type = await input.getAttribute('type');
          const name = await input.getAttribute('name');
          const placeholder = await input.getAttribute('placeholder');
          console.log(`  Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await page.screenshot({ 
      path: `${screenshotDir}/error-state-${timestamp}.png`,
      fullPage: true 
    });
    
    // Save error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      networkActivity: networkLogs
    };
    
    fs.writeFileSync(
      `/Users/tramel/code/lexi-bot/account-creation-error-${timestamp}.json`,
      JSON.stringify(errorReport, null, 2)
    );
  } finally {
    console.log('🏁 Test completed. Check screenshots and JSON files for details.');
    await browser.close();
  }
}

// Run the test
testAccountCreationFlow().catch(console.error);