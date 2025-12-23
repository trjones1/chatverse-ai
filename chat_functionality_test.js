const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ChatFunctionalityTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      site: 'https://www.chatwithlexi.com',
      chatFindings: [],
      screenshots: [],
      chatFlowTests: {}
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
    const filename = `chat_${Date.now()}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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
    this.results.chatFindings.push({
      severity,
      title,
      description,
      evidence,
      timestamp: new Date().toISOString()
    });
    console.log(`[${severity.toUpperCase()}] ${title}: ${description}`);
  }

  async testChatPageAccess() {
    console.log('=== TESTING CHAT PAGE ACCESS ===');
    
    try {
      // First go to homepage
      await this.page.goto('https://www.chatwithlexi.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.takeScreenshot('homepage_before_chat', 'Homepage before accessing chat');
      
      // Try to access chat page directly
      console.log('Navigating to chat page...');
      await this.page.goto('https://www.chatwithlexi.com/chat', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.takeScreenshot('chat_page_initial', 'Chat page initial load');
      
      // Check page title and URL
      const url = this.page.url();
      const title = await this.page.title();
      console.log(`Chat page URL: ${url}`);
      console.log(`Chat page title: ${title}`);
      
      if (url.includes('/chat')) {
        this.addFinding('POSITIVE', 'Chat page accessible', 'Chat page loads successfully at /chat route');
      } else {
        this.addFinding('HIGH', 'Chat page redirect', 'Chat page redirects away from /chat route');
      }
      
    } catch (error) {
      this.addFinding('CRITICAL', 'Chat page access failed', `Cannot access chat page: ${error.message}`);
    }
  }

  async testChatInterface() {
    console.log('=== TESTING CHAT INTERFACE ELEMENTS ===');
    
    try {
      // Look for chat container
      const chatContainer = this.page.locator('[data-testid*="chat"], .chat-container, main').first();
      
      if (await chatContainer.count() > 0) {
        console.log('Chat container found');
        this.addFinding('POSITIVE', 'Chat container present', 'Main chat container element located');
      } else {
        this.addFinding('HIGH', 'Chat container missing', 'No main chat container found');
      }
      
      // Test for message input field
      const messageInput = this.page.locator('input[type="text"], textarea, [contenteditable="true"]').first();
      
      if (await messageInput.count() > 0) {
        console.log('Message input found');
        this.addFinding('POSITIVE', 'Message input present', 'Text input for messages located');
        
        // Test input interaction
        await messageInput.fill('Test message for QA assessment');
        await this.takeScreenshot('message_input_filled', 'Message input with test content');
        
        // Clear the input
        await messageInput.fill('');
        
      } else {
        this.addFinding('CRITICAL', 'Message input missing', 'No text input field for messages found');
      }
      
      // Test for send button
      const sendButton = this.page.locator('button').filter({ hasText: /send|submit|>|➤|arrow/i }).first();
      
      if (await sendButton.count() > 0) {
        console.log('Send button found');
        this.addFinding('POSITIVE', 'Send button present', 'Send button located');
        
        const isDisabled = await sendButton.isDisabled();
        if (isDisabled) {
          this.addFinding('MEDIUM', 'Send button disabled when empty', 'Send button properly disabled with no input');
        }
      } else {
        this.addFinding('HIGH', 'Send button missing', 'No send button found for message submission');
      }
      
      // Test for message history area
      const messageHistory = this.page.locator('.messages, .conversation, .chat-messages, [data-testid*="message"]').first();
      
      if (await messageHistory.count() > 0) {
        console.log('Message history area found');
        this.addFinding('POSITIVE', 'Message history present', 'Message display area located');
      } else {
        this.addFinding('HIGH', 'Message history missing', 'No message history display area found');
      }
      
    } catch (error) {
      this.addFinding('CRITICAL', 'Chat interface test failed', `Error testing chat interface: ${error.message}`);
    }
  }

  async testMessageSending() {
    console.log('=== TESTING MESSAGE SENDING FLOW ===');
    
    try {
      const messageInput = this.page.locator('input[type="text"], textarea, [contenteditable="true"]').first();
      const sendButton = this.page.locator('button').filter({ hasText: /send|submit|>|➤|arrow/i }).first();
      
      if (await messageInput.count() > 0 && await sendButton.count() > 0) {
        console.log('Attempting to send a test message...');
        
        // Fill in a test message
        const testMessage = 'Hello, this is a QA test message';
        await messageInput.fill(testMessage);
        
        await this.takeScreenshot('before_send_message', 'Before sending test message');
        
        // Click send button
        await sendButton.click();
        
        // Wait for potential response
        await this.page.waitForTimeout(3000);
        
        await this.takeScreenshot('after_send_message', 'After sending test message');
        
        // Check if message appeared in chat
        const sentMessage = this.page.locator('text=' + testMessage).first();
        
        if (await sentMessage.count() > 0) {
          this.addFinding('POSITIVE', 'Message sending works', 'Test message successfully sent and displayed');
        } else {
          this.addFinding('HIGH', 'Message sending failed', 'Test message not displayed after sending');
        }
        
        // Check for AI response
        await this.page.waitForTimeout(5000);
        
        const responseElements = this.page.locator('.message, .response, [data-testid*="message"]');
        const responseCount = await responseElements.count();
        
        if (responseCount > 1) {
          this.addFinding('POSITIVE', 'AI response received', 'AI generated response to test message');
          await this.takeScreenshot('ai_response_received', 'AI response visible in chat');
        } else {
          this.addFinding('HIGH', 'No AI response', 'No AI response received after sending message');
        }
        
      } else {
        this.addFinding('HIGH', 'Cannot test message sending', 'Required elements (input/send button) not available');
      }
      
    } catch (error) {
      this.addFinding('HIGH', 'Message sending test failed', `Error during message sending test: ${error.message}`);
    }
  }

  async testCharacterInteraction() {
    console.log('=== TESTING CHARACTER INTERACTION ===');
    
    try {
      // Look for character selector or avatar
      const characterElement = this.page.locator('[data-testid*="character"], .character, .avatar').first();
      
      if (await characterElement.count() > 0) {
        console.log('Character element found');
        this.addFinding('POSITIVE', 'Character element present', 'Character/avatar element located');
        await this.takeScreenshot('character_element', 'Character element visible');
      } else {
        this.addFinding('MEDIUM', 'Character element missing', 'No character/avatar element found');
      }
      
      // Check for character name or personality indicators
      const characterName = this.page.locator('text=/lexi/i, text=/character/i').first();
      
      if (await characterName.count() > 0) {
        const name = await characterName.textContent();
        console.log(`Character name found: ${name}`);
        this.addFinding('POSITIVE', 'Character identity present', `Character name/identity visible: ${name}`);
      }
      
    } catch (error) {
      this.addFinding('MEDIUM', 'Character interaction test failed', `Error testing character interaction: ${error.message}`);
    }
  }

  async testResponsiveDesign() {
    console.log('=== TESTING CHAT RESPONSIVE DESIGN ===');
    
    try {
      // Test mobile view
      await this.page.setViewportSize({ width: 375, height: 667 });
      await this.page.waitForTimeout(1000);
      
      await this.takeScreenshot('chat_mobile', 'Chat interface on mobile viewport');
      
      // Check if chat interface is still functional on mobile
      const mobileInput = this.page.locator('input[type="text"], textarea, [contenteditable="true"]').first();
      const mobileSend = this.page.locator('button').filter({ hasText: /send|submit|>|➤/i }).first();
      
      if (await mobileInput.count() > 0 && await mobileSend.count() > 0) {
        this.addFinding('POSITIVE', 'Mobile chat interface functional', 'Chat input and send button work on mobile');
      } else {
        this.addFinding('HIGH', 'Mobile chat interface broken', 'Chat interface not functional on mobile viewport');
      }
      
      // Test tablet view
      await this.page.setViewportSize({ width: 768, height: 1024 });
      await this.page.waitForTimeout(1000);
      
      await this.takeScreenshot('chat_tablet', 'Chat interface on tablet viewport');
      
      // Return to desktop
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      
    } catch (error) {
      this.addFinding('MEDIUM', 'Responsive design test failed', `Error testing responsive design: ${error.message}`);
    }
  }

  async generateChatReport() {
    console.log('=== GENERATING CHAT FUNCTIONALITY REPORT ===');
    
    const positiveFindings = this.results.chatFindings.filter(f => f.severity === 'POSITIVE').length;
    const criticalFindings = this.results.chatFindings.filter(f => f.severity === 'CRITICAL').length;
    const highFindings = this.results.chatFindings.filter(f => f.severity === 'HIGH').length;
    const mediumFindings = this.results.chatFindings.filter(f => f.severity === 'MEDIUM').length;
    
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>ChatWithLexi - Chat Functionality QA Report</title>
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
        <h1>ChatWithLexi - Chat Functionality QA Report</h1>
        <p><strong>Site:</strong> ${this.results.site}</p>
        <p><strong>Assessment Date:</strong> ${new Date(this.results.timestamp).toLocaleString()}</p>
        <p><strong>Focus:</strong> Chat System Testing and Functionality Validation</p>
    </div>
    
    <div class="summary">
        <h2>Chat Functionality Summary</h2>
        <p><strong>Positive Findings:</strong> ${positiveFindings} (working features)</p>
        <p><strong>Critical Issues:</strong> ${criticalFindings}</p>
        <p><strong>High Priority Issues:</strong> ${highFindings}</p>
        <p><strong>Medium Priority Issues:</strong> ${mediumFindings}</p>
        <p><strong>Total Screenshots:</strong> ${this.results.screenshots.length}</p>
    </div>

    <div class="section">
        <h2>Chat Functionality Findings</h2>
        ${this.results.chatFindings.map(finding => `
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

    const reportPath = path.join(__dirname, 'chat_functionality_report.html');
    fs.writeFileSync(reportPath, reportHTML);
    
    const resultsPath = path.join(__dirname, 'chat_functionality_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    console.log(`Chat functionality report generated: ${reportPath}`);
    console.log(`Raw results: ${resultsPath}`);
    
    return { reportPath, resultsPath };
  }

  async runChatTest() {
    try {
      await this.init();
      
      await this.testChatPageAccess();
      await this.testChatInterface();
      await this.testMessageSending();
      await this.testCharacterInteraction();
      await this.testResponsiveDesign();
      
      const { reportPath, resultsPath } = await this.generateChatReport();
      
      return { success: true, reportPath, resultsPath };
      
    } catch (error) {
      console.error('Chat functionality test failed:', error);
      return { success: false, error: error.message };
      
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run chat functionality test
const chatTest = new ChatFunctionalityTest();
chatTest.runChatTest().then(result => {
  console.log('Chat functionality test completed:', result);
  process.exit(0);
}).catch(error => {
  console.error('Chat functionality test error:', error);
  process.exit(1);
});