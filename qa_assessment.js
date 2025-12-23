const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class QAAssessment {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      site: 'https://www.chatwithlexi.com',
      findings: [],
      screenshots: [],
      performance: {},
      accessibility: {}
    };
    this.screenshotDir = path.join(__dirname, 'qa_screenshots');
  }

  async init() {
    // Ensure screenshot directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }

    this.browser = await chromium.launch({ headless: false });
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    this.page = await this.context.newPage();
  }

  async takeScreenshot(name, description) {
    const filename = `${Date.now()}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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

  addFinding(severity, category, title, description, evidence = null) {
    this.results.findings.push({
      severity,
      category,
      title,
      description,
      evidence,
      timestamp: new Date().toISOString()
    });
    console.log(`[${severity.toUpperCase()}] ${category}: ${title}`);
  }

  async assessInitialLoad() {
    console.log('=== INITIAL SITE ASSESSMENT ===');
    
    const startTime = Date.now();
    
    try {
      await this.page.goto('https://www.chatwithlexi.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      const loadTime = Date.now() - startTime;
      this.results.performance.initialLoad = loadTime;
      
      console.log(`Page loaded in ${loadTime}ms`);
      
      await this.takeScreenshot('homepage_initial', 'Initial homepage load');
      
      // Check for console errors
      const errors = [];
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Check page title
      const title = await this.page.title();
      console.log(`Page title: ${title}`);
      
      // Check for basic elements
      const hasNavigation = await this.page.locator('nav').count() > 0;
      const hasChatInterface = await this.page.locator('[data-testid*="chat"], .chat').count() > 0;
      const hasLoginButton = await this.page.getByText('Log In').count() > 0;
      
      if (!hasNavigation) {
        this.addFinding('HIGH', 'Navigation', 'Missing navigation element', 'No nav element found on homepage');
      }
      
      if (!hasChatInterface) {
        this.addFinding('CRITICAL', 'Chat System', 'Chat interface not found', 'Primary chat functionality appears missing');
      }
      
      if (!hasLoginButton) {
        this.addFinding('MEDIUM', 'Authentication', 'Login button not visible', 'Users may have difficulty accessing login');
      }
      
      // Test responsive design
      await this.page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      await this.takeScreenshot('homepage_mobile', 'Homepage on mobile viewport');
      
      await this.page.setViewportSize({ width: 1920, height: 1080 }); // Desktop size
      
    } catch (error) {
      this.addFinding('CRITICAL', 'Site Access', 'Failed to load homepage', `Error: ${error.message}`);
    }
  }

  async testChatFunctionality() {
    console.log('=== CHAT FUNCTIONALITY TESTING ===');
    
    try {
      // Look for chat input field
      const chatInput = this.page.locator('input[type="text"], textarea').first();
      
      if (await chatInput.count() > 0) {
        console.log('Chat input found');
        
        // Test typing in chat
        await chatInput.fill('Hello, this is a test message');
        await this.takeScreenshot('chat_input_filled', 'Chat input with test message');
        
        // Look for send button
        const sendButton = this.page.locator('button').filter({ hasText: /send|submit/i }).first();
        
        if (await sendButton.count() > 0) {
          console.log('Send button found');
          
          // Try to send message (but be careful not to actually submit)
          const isDisabled = await sendButton.isDisabled();
          if (isDisabled) {
            this.addFinding('MEDIUM', 'Chat System', 'Send button disabled', 'Send button appears disabled even with text input');
          }
          
        } else {
          this.addFinding('HIGH', 'Chat System', 'Send button missing', 'No send button found for chat functionality');
        }
        
      } else {
        this.addFinding('CRITICAL', 'Chat System', 'Chat input not found', 'Cannot locate chat input field');
      }
      
      // Check for message history or conversation area
      const messageArea = this.page.locator('.messages, .conversation, [data-testid*="message"]').first();
      
      if (await messageArea.count() === 0) {
        this.addFinding('HIGH', 'Chat System', 'Message display area missing', 'No visible area for displaying chat messages');
      }
      
    } catch (error) {
      this.addFinding('CRITICAL', 'Chat System', 'Chat functionality test failed', `Error: ${error.message}`);
    }
  }

  async testNavigation() {
    console.log('=== NAVIGATION TESTING ===');
    
    try {
      // Test Dashboard link
      const dashboardLink = this.page.getByText('Dashboard').first();
      if (await dashboardLink.count() > 0) {
        console.log('Testing Dashboard navigation');
        await dashboardLink.click();
        await this.page.waitForTimeout(2000);
        await this.takeScreenshot('dashboard_page', 'Dashboard page after navigation');
        
        // Navigate back to home
        await this.page.goto('https://www.chatwithlexi.com');
        await this.page.waitForTimeout(1000);
      }
      
      // Test Settings link
      const settingsLink = this.page.getByText('Settings').first();
      if (await settingsLink.count() > 0) {
        console.log('Testing Settings navigation');
        await settingsLink.click();
        await this.page.waitForTimeout(2000);
        await this.takeScreenshot('settings_page', 'Settings page after navigation');
        
        // Navigate back to home
        await this.page.goto('https://www.chatwithlexi.com');
        await this.page.waitForTimeout(1000);
      }
      
    } catch (error) {
      this.addFinding('HIGH', 'Navigation', 'Navigation test failed', `Error: ${error.message}`);
    }
  }

  async testAccessibility() {
    console.log('=== ACCESSIBILITY TESTING ===');
    
    try {
      // Test keyboard navigation
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(500);
      
      const focusedElement = await this.page.evaluate(() => {
        const focused = document.activeElement;
        return focused ? focused.tagName + (focused.className ? '.' + focused.className : '') : null;
      });
      
      if (focusedElement) {
        console.log(`First focusable element: ${focusedElement}`);
      } else {
        this.addFinding('MEDIUM', 'Accessibility', 'No keyboard focus', 'No element receives focus on Tab press');
      }
      
      // Check for alt text on images
      const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();
      if (imagesWithoutAlt > 0) {
        this.addFinding('MEDIUM', 'Accessibility', 'Missing alt text', `${imagesWithoutAlt} images found without alt text`);
      }
      
      // Check for proper headings structure
      const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').count();
      if (headings === 0) {
        this.addFinding('MEDIUM', 'Accessibility', 'No heading structure', 'Page appears to lack proper heading hierarchy');
      }
      
    } catch (error) {
      this.addFinding('MEDIUM', 'Accessibility', 'Accessibility test failed', `Error: ${error.message}`);
    }
  }

  async generateReport() {
    console.log('=== GENERATING REPORT ===');
    
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>ChatWithLexi Production QA Assessment</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .finding { margin: 15px 0; padding: 15px; border-left: 4px solid #ccc; }
        .finding.CRITICAL { border-left-color: #ff0000; background-color: #fff5f5; }
        .finding.HIGH { border-left-color: #ff6600; background-color: #fffaf0; }
        .finding.MEDIUM { border-left-color: #ffcc00; background-color: #fffef0; }
        .finding.LOW { border-left-color: #00cc00; background-color: #f0fff0; }
        .screenshot { margin: 10px 0; }
        .performance { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
        .summary { background-color: #e6f3ff; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ChatWithLexi Production QA Assessment</h1>
        <p><strong>Site:</strong> ${this.results.site}</p>
        <p><strong>Assessment Date:</strong> ${new Date(this.results.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h2>Executive Summary</h2>
        <p><strong>Total Findings:</strong> ${this.results.findings.length}</p>
        <p><strong>Critical Issues:</strong> ${this.results.findings.filter(f => f.severity === 'CRITICAL').length}</p>
        <p><strong>High Priority Issues:</strong> ${this.results.findings.filter(f => f.severity === 'HIGH').length}</p>
        <p><strong>Medium Priority Issues:</strong> ${this.results.findings.filter(f => f.severity === 'MEDIUM').length}</p>
    </div>

    <div class="section">
        <h2>Performance Metrics</h2>
        <div class="performance">
            <p><strong>Initial Load Time:</strong> ${this.results.performance.initialLoad || 'N/A'}ms</p>
        </div>
    </div>

    <div class="section">
        <h2>Findings</h2>
        ${this.results.findings.map(finding => `
            <div class="finding ${finding.severity}">
                <h3>[${finding.severity}] ${finding.category}: ${finding.title}</h3>
                <p>${finding.description}</p>
                <small>Detected at: ${new Date(finding.timestamp).toLocaleString()}</small>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Screenshots</h2>
        ${this.results.screenshots.map(screenshot => `
            <div class="screenshot">
                <h4>${screenshot.name}</h4>
                <p>${screenshot.description}</p>
                <p><strong>File:</strong> ${screenshot.filename}</p>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;

    const reportPath = path.join(__dirname, 'qa_assessment_report.html');
    fs.writeFileSync(reportPath, reportHTML);
    
    // Also save raw results as JSON
    const resultsPath = path.join(__dirname, 'qa_assessment_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    console.log(`Report generated: ${reportPath}`);
    console.log(`Raw results: ${resultsPath}`);
    
    return { reportPath, resultsPath };
  }

  async runAssessment() {
    try {
      await this.init();
      
      await this.assessInitialLoad();
      await this.testChatFunctionality();
      await this.testNavigation();
      await this.testAccessibility();
      
      const { reportPath, resultsPath } = await this.generateReport();
      
      return { success: true, reportPath, resultsPath };
      
    } catch (error) {
      console.error('Assessment failed:', error);
      return { success: false, error: error.message };
      
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run assessment
const assessment = new QAAssessment();
assessment.runAssessment().then(result => {
  console.log('Assessment completed:', result);
  process.exit(0);
}).catch(error => {
  console.error('Assessment error:', error);
  process.exit(1);
});