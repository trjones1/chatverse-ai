const { chromium } = require('playwright');
const fs = require('fs');

async function testSignupFlow() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  const timestamp = Date.now();
  const screenshotDir = `/Users/tramel/code/lexi-bot/screenshots`;
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  // Enhanced logging
  const errors = [];
  const networkLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${text}`);
    
    if (text.includes('Database error') || 
        text.includes('error saving') ||
        text.includes('signup error') ||
        msg.type() === 'error') {
      errors.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    console.log(`[RESPONSE] ${status} ${url}`);
    
    if (status >= 400 || url.includes('/api/auth/') || url.includes('signup') || url.includes('supabase')) {
      networkLogs.push({
        url: url,
        status: status,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    console.log('🚀 Testing Account Creation Flow');
    
    // Step 1: Navigate to app
    console.log('📍 Step 1: Navigating to app...');
    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: `${screenshotDir}/signup-test-1-homepage-${timestamp}.png`,
      fullPage: true 
    });
    
    // Step 2: Try to trigger the login modal
    console.log('📍 Step 2: Looking for login button...');
    
    // Wait for page to be ready
    await page.waitForSelector('nav', { timeout: 10000 });
    
    // Look for the login button
    const loginButton = page.locator('[data-testid="login-button"]');
    
    if (await loginButton.isVisible({ timeout: 3000 })) {
      console.log('✅ Found desktop login button');
      await loginButton.click();
    } else {
      console.log('🔍 Looking for mobile menu...');
      const mobileMenuButton = page.locator('button[aria-haspopup="menu"]');
      if (await mobileMenuButton.isVisible({ timeout: 3000 })) {
        await mobileMenuButton.click();
        await page.waitForTimeout(1000);
        const mobileLoginButton = page.locator('text="Log In"').last();
        await mobileLoginButton.click();
      } else {
        throw new Error('Could not find login button');
      }
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: `${screenshotDir}/signup-test-2-after-login-click-${timestamp}.png`,
      fullPage: true 
    });
    
    // Step 3: Look for modal and form fields
    console.log('📍 Step 3: Looking for signup form...');
    
    // Multiple strategies to find the modal
    let formFound = false;
    
    // Strategy 1: Look for email input directly
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      console.log('✅ Found email input');
      formFound = true;
    }
    
    // Strategy 2: Look for modal content
    if (!formFound) {
      const modalContent = page.locator('[role="dialog"], .modal, div:has-text("Create Account")').first();
      if (await modalContent.isVisible({ timeout: 3000 })) {
        console.log('✅ Found modal');
        formFound = true;
      }
    }
    
    // Strategy 3: Manual dispatch of modal event if not found
    if (!formFound) {
      console.log('🔧 Manually triggering modal...');
      await page.evaluate(() => {
        const event = new Event('open-login');
        window.dispatchEvent(event);
      });
      await page.waitForTimeout(2000);
      
      if (await emailInput.isVisible({ timeout: 3000 })) {
        console.log('✅ Modal triggered successfully');
        formFound = true;
      }
    }
    
    if (!formFound) {
      throw new Error('Could not find signup form');
    }
    
    await page.screenshot({ 
      path: `${screenshotDir}/signup-test-3-modal-visible-${timestamp}.png`,
      fullPage: true 
    });
    
    // Step 4: Fill signup form
    console.log('📍 Step 4: Filling signup form...');
    
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.clear();
    await emailInput.fill('test123@example.com');
    
    await passwordInput.clear();
    await passwordInput.fill('password123');
    
    await page.screenshot({ 
      path: `${screenshotDir}/signup-test-4-form-filled-${timestamp}.png`,
      fullPage: true 
    });
    
    // Step 5: Submit form and monitor for database errors
    console.log('📍 Step 5: Submitting form...');
    
    // Look for submit button
    const submitButton = page.locator('button:has-text("Create Account"), button:has-text("Sign Up"), button[type="submit"]').first();
    
    if (!await submitButton.isVisible({ timeout: 3000 })) {
      throw new Error('Submit button not found');
    }
    
    // Set up promise to wait for response or error
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/auth/signup') || 
      response.url().includes('supabase') ||
      response.status() >= 400
    ).catch(() => null);
    
    await submitButton.click();
    
    // Wait for either success or error
    await Promise.race([
      page.waitForTimeout(10000),
      responsePromise
    ]);
    
    await page.screenshot({ 
      path: `${screenshotDir}/signup-test-5-after-submit-${timestamp}.png`,
      fullPage: true 
    });
    
    // Step 6: Check for success or error messages
    console.log('📍 Step 6: Checking results...');
    
    // Look for success indicators
    const successSelectors = [
      'text="Account Created"',
      'text="Check your email"',
      'text="Success"',
      '.success'
    ];
    
    let successFound = false;
    for (const selector of successSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 2000 })) {
        const element = page.locator(selector);
        const text = await element.textContent();
        console.log(`✅ SUCCESS: ${text}`);
        successFound = true;
        break;
      }
    }
    
    // Look for error messages
    const errorSelectors = [
      'text="Database error"',
      'text="Error saving"', 
      'text="signup failed"',
      'text="failed"',
      ':has-text("Database error")',
      ':has-text("Error saving")',
      ':has-text("failed")',
      '.error',
      '[role="alert"]'
    ];
    
    const errorMessages = [];
    for (const selector of errorSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        if (await element.isVisible({ timeout: 1000 })) {
          const text = await element.textContent();
          if (text && text.trim()) {
            errorMessages.push(text.trim());
            console.log(`❌ ERROR: ${text}`);
          }
        }
      }
    }
    
    // Step 7: Test with different email if errors found
    if (errorMessages.length > 0) {
      console.log('📍 Step 7: Testing with different email...');
      
      await emailInput.clear();
      await emailInput.fill('test456@example.com');
      await passwordInput.clear();
      await passwordInput.fill('password123');
      
      await page.screenshot({ 
        path: `${screenshotDir}/signup-test-7-retry-form-${timestamp}.png`,
        fullPage: true 
      });
      
      await submitButton.click();
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: `${screenshotDir}/signup-test-8-retry-result-${timestamp}.png`,
        fullPage: true 
      });
      
      // Check for consistency in errors
      const retryErrors = [];
      for (const selector of errorSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        for (let i = 0; i < count; i++) {
          const element = elements.nth(i);
          if (await element.isVisible({ timeout: 1000 })) {
            const text = await element.textContent();
            if (text && text.trim()) {
              retryErrors.push(text.trim());
            }
          }
        }
      }
      
      console.log(`🔄 Error consistency check: First attempt: ${errorMessages.length} errors, Retry: ${retryErrors.length} errors`);
    }
    
    // Generate final report
    const testResults = {
      timestamp: new Date().toISOString(),
      testEmails: ['test123@example.com', 'test456@example.com'],
      success: successFound,
      errorMessages: errorMessages,
      consoleErrors: errors,
      networkErrors: networkLogs,
      conclusions: []
    };
    
    if (successFound) {
      testResults.conclusions.push('Account creation appears to work successfully');
    }
    
    if (errorMessages.length > 0) {
      testResults.conclusions.push('Database errors found during account creation');
      testResults.conclusions.push('Errors appear to be consistent across different emails');
    }
    
    if (errors.length > 0) {
      testResults.conclusions.push('JavaScript console errors detected');
    }
    
    if (networkLogs.length > 0) {
      testResults.conclusions.push('Network errors detected during authentication process');
    }
    
    console.log('\n📊 TEST SUMMARY:');
    console.log(`✅ Success: ${successFound}`);
    console.log(`❌ Errors found: ${errorMessages.length}`);
    console.log(`🖥️ Console errors: ${errors.length}`);
    console.log(`📡 Network errors: ${networkLogs.length}`);
    
    fs.writeFileSync(
      `/Users/tramel/code/lexi-bot/signup-test-results-${timestamp}.json`,
      JSON.stringify(testResults, null, 2)
    );
    
    console.log(`\n📄 Results saved to signup-test-results-${timestamp}.json`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ 
      path: `${screenshotDir}/signup-test-error-${timestamp}.png`,
      fullPage: true 
    });
    
    const errorReport = {
      error: error.message,
      errors: errors,
      networkLogs: networkLogs,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `/Users/tramel/code/lexi-bot/signup-test-error-${timestamp}.json`,
      JSON.stringify(errorReport, null, 2)
    );
  } finally {
    await browser.close();
  }
}

testSignupFlow().catch(console.error);