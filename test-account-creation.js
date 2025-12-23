const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testAccountCreation() {
  const browser = await chromium.launch({ 
    headless: false,  // Run in headed mode for visual validation
    slowMo: 1000      // Slow down actions for better observation
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text());
  });
  
  // Enable request/response logging
  page.on('request', request => {
    console.log(`[REQUEST]: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', response => {
    console.log(`[RESPONSE]: ${response.status()} ${response.url()}`);
  });
  
  // Enable error logging
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]:`, error.message);
  });
  
  const timestamp = Date.now();
  const screenshotDir = `/Users/tramel/code/lexi-bot/screenshots`;
  
  // Ensure screenshot directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  try {
    console.log('Navigating to localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: `${screenshotDir}/step-1-homepage-${timestamp}.png`,
      fullPage: true 
    });
    
    console.log('Looking for sign up / account creation options...');
    
    // Look for common sign up elements
    const signUpSelectors = [
      'a[href*="signup"]',
      'a[href*="register"]', 
      'a[href*="create"]',
      'button:has-text("Sign Up")',
      'button:has-text("Create Account")',
      'button:has-text("Register")',
      '[data-testid*="signup"]',
      '[data-testid*="register"]',
      '.signup',
      '.register'
    ];
    
    let signUpElement = null;
    for (const selector of signUpSelectors) {
      try {
        signUpElement = await page.locator(selector).first();
        if (await signUpElement.isVisible({ timeout: 2000 })) {
          console.log(`Found sign up element with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!signUpElement || !(await signUpElement.isVisible())) {
      console.log('No obvious sign up button found. Looking for navigation...');
      
      // Check if there's a navigation menu or login link that might lead to sign up
      const navSelectors = [
        'nav a',
        'header a', 
        'a:has-text("Login")',
        'a:has-text("Sign In")',
        'button:has-text("Login")',
        'button:has-text("Sign In")'
      ];
      
      for (const selector of navSelectors) {
        try {
          const elements = await page.locator(selector).all();
          for (const element of elements) {
            if (await element.isVisible()) {
              const text = await element.textContent();
              console.log(`Found navigation element: "${text}"`);
            }
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Try clicking on login to see if it leads to sign up option
      try {
        const loginLink = page.locator('a:has-text("Login"), button:has-text("Login"), a:has-text("Sign In"), button:has-text("Sign In")').first();
        if (await loginLink.isVisible({ timeout: 3000 })) {
          console.log('Clicking on login link to find sign up option...');
          await loginLink.click();
          await page.waitForLoadState('networkidle');
          
          await page.screenshot({ 
            path: `${screenshotDir}/step-2-login-page-${timestamp}.png`,
            fullPage: true 
          });
        }
      } catch (e) {
        console.log('No login link found either');
      }
    }
    
    // Now look for sign up on the current page (could be login page)
    for (const selector of signUpSelectors) {
      try {
        signUpElement = await page.locator(selector).first();
        if (await signUpElement.isVisible({ timeout: 2000 })) {
          console.log(`Found sign up element on current page with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (signUpElement && await signUpElement.isVisible()) {
      console.log('Clicking sign up button...');
      await signUpElement.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: `${screenshotDir}/step-3-signup-page-${timestamp}.png`,
        fullPage: true 
      });
    } else {
      console.log('Still no sign up found. Taking screenshot of current state...');
      await page.screenshot({ 
        path: `${screenshotDir}/step-no-signup-found-${timestamp}.png`,
        fullPage: true 
      });
      
      // Try manual navigation to common signup URLs
      const signupUrls = [
        'http://localhost:3002/signup',
        'http://localhost:3002/register', 
        'http://localhost:3002/auth/signup',
        'http://localhost:3002/create-account'
      ];
      
      for (const url of signupUrls) {
        try {
          console.log(`Trying direct navigation to: ${url}`);
          await page.goto(url, { waitUntil: 'networkidle' });
          
          // Check if we got a valid signup page (not 404)
          const pageTitle = await page.title();
          const hasSignupForm = await page.locator('form').count() > 0;
          
          if (hasSignupForm || pageTitle.toLowerCase().includes('sign') || pageTitle.toLowerCase().includes('register')) {
            console.log(`Found signup page at: ${url}`);
            await page.screenshot({ 
              path: `${screenshotDir}/step-3-signup-page-direct-${timestamp}.png`,
              fullPage: true 
            });
            break;
          }
        } catch (e) {
          console.log(`Failed to load ${url}: ${e.message}`);
        }
      }
    }
    
    // Now look for email and password fields
    console.log('Looking for email and password input fields...');
    
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email"]',
      'input[id*="email"]',
      '[data-testid*="email"]'
    ];
    
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]', 
      'input[placeholder*="password"]',
      'input[id*="password"]',
      '[data-testid*="password"]'
    ];
    
    let emailInput = null;
    let passwordInput = null;
    
    // Find email input
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.locator(selector).first();
        if (await emailInput.isVisible({ timeout: 2000 })) {
          console.log(`Found email input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Find password input
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.locator(selector).first();
        if (await passwordInput.isVisible({ timeout: 2000 })) {
          console.log(`Found password input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (emailInput && passwordInput && await emailInput.isVisible() && await passwordInput.isVisible()) {
      console.log('Found email and password fields. Testing account creation...');
      
      // Fill in the test credentials
      await emailInput.fill('test123@example.com');
      await passwordInput.fill('password123');
      
      await page.screenshot({ 
        path: `${screenshotDir}/step-4-credentials-filled-${timestamp}.png`,
        fullPage: true 
      });
      
      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign Up")',
        'button:has-text("Create Account")',
        'button:has-text("Register")',
        'button:has-text("Create")',
        '[data-testid*="submit"]',
        'form button'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.locator(selector).first();
          if (await submitButton.isVisible({ timeout: 2000 })) {
            console.log(`Found submit button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (submitButton && await submitButton.isVisible()) {
        console.log('Clicking submit button to create account...');
        
        // Monitor network requests during submission
        const requests = [];
        const responses = [];
        
        page.on('request', req => requests.push({
          url: req.url(),
          method: req.method(),
          headers: req.headers(),
          postData: req.postData()
        }));
        
        page.on('response', resp => responses.push({
          url: resp.url(),
          status: resp.status(),
          headers: resp.headers()
        }));
        
        await submitButton.click();
        
        // Wait for potential response or error
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: `${screenshotDir}/step-5-after-submit-${timestamp}.png`,
          fullPage: true 
        });
        
        // Check for error messages
        const errorSelectors = [
          '.error',
          '.alert-error',
          '.error-message',
          '[role="alert"]',
          '.text-red',
          '.text-danger',
          '*:has-text("Database error")',
          '*:has-text("Error")',
          '*:has-text("Failed")'
        ];
        
        let errorFound = false;
        for (const selector of errorSelectors) {
          try {
            const errorElements = await page.locator(selector).all();
            for (const element of errorElements) {
              if (await element.isVisible()) {
                const errorText = await element.textContent();
                if (errorText && errorText.trim()) {
                  console.log(`Found error message: "${errorText}"`);
                  errorFound = true;
                }
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Also check for success indicators
        const successSelectors = [
          '.success',
          '.alert-success', 
          '.success-message',
          '.text-green',
          '*:has-text("Success")',
          '*:has-text("Welcome")',
          '*:has-text("Account created")'
        ];
        
        let successFound = false;
        for (const selector of successSelectors) {
          try {
            const successElements = await page.locator(selector).all();
            for (const element of successElements) {
              if (await element.isVisible()) {
                const successText = await element.textContent();
                if (successText && successText.trim()) {
                  console.log(`Found success message: "${successText}"`);
                  successFound = true;
                }
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Save network activity
        fs.writeFileSync(
          `/Users/tramel/code/lexi-bot/network-activity-${timestamp}.json`,
          JSON.stringify({ requests, responses }, null, 2)
        );
        
        console.log(`Error found: ${errorFound}, Success found: ${successFound}`);
        
        // If we found an error, try with a different email
        if (errorFound) {
          console.log('Error detected. Testing with alternative email...');
          
          // Clear fields and try again
          await emailInput.clear();
          await passwordInput.clear();
          
          await emailInput.fill('test456@example.com');
          await passwordInput.fill('password123');
          
          await page.screenshot({ 
            path: `${screenshotDir}/step-6-alternative-email-${timestamp}.png`,
            fullPage: true 
          });
          
          await submitButton.click();
          await page.waitForTimeout(3000);
          
          await page.screenshot({ 
            path: `${screenshotDir}/step-7-alternative-result-${timestamp}.png`,
            fullPage: true 
          });
        }
        
      } else {
        console.log('No submit button found');
        await page.screenshot({ 
          path: `${screenshotDir}/step-no-submit-${timestamp}.png`,
          fullPage: true 
        });
      }
      
    } else {
      console.log('Could not find email and/or password fields');
      console.log(`Email input found: ${emailInput ? 'yes' : 'no'}`);
      console.log(`Password input found: ${passwordInput ? 'yes' : 'no'}`);
      
      await page.screenshot({ 
        path: `${screenshotDir}/step-no-form-fields-${timestamp}.png`,
        fullPage: true 
      });
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
    await page.screenshot({ 
      path: `${screenshotDir}/error-state-${timestamp}.png`,
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the test
testAccountCreation().catch(console.error);