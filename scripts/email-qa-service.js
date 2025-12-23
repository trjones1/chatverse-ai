#!/usr/bin/env node

/**
 * Email QA Service
 * Handles email verification for automated testing
 */

const fetch = require('node-fetch');
const { ImapFlow } = require('imapflow');

class EmailQAService {
  constructor(provider = 'tempmail') {
    this.provider = provider;
    this.currentEmail = null;
  }

  /**
   * Generate a temporary email for testing
   */
  async generateTestEmail() {
    switch (this.provider) {
      case 'tempmail':
        return await this.generateTempMailEmail();
      case '10minutemail':
        return await this.generate10MinuteEmail();
      case 'gmail':
        return await this.generateGmailTestEmail();
      default:
        throw new Error(`Unknown email provider: ${this.provider}`);
    }
  }

  async generateTempMailEmail() {
    try {
      // Get available domains
      const domainsResponse = await fetch('https://www.1secmail.com/api/v1/?action=getDomainList');
      const domains = await domainsResponse.json();
      
      // Generate random username
      const username = `claude-qa-${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const domain = domains[0];
      
      this.currentEmail = `${username}@${domain}`;
      
      console.log(`📧 Generated test email: ${this.currentEmail}`);
      return this.currentEmail;
    } catch (error) {
      throw new Error(`Failed to generate temp email: ${error.message}`);
    }
  }

  async generate10MinuteEmail() {
    try {
      // 10MinuteMail API integration
      const response = await fetch('https://10minutemail.com/10MinuteMail/resources/session/address', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      this.currentEmail = data.address;
      
      console.log(`📧 Generated 10-minute email: ${this.currentEmail}`);
      return this.currentEmail;
    } catch (error) {
      throw new Error(`Failed to generate 10-minute email: ${error.message}`);
    }
  }

  async generateGmailTestEmail() {
    // For Gmail, we'd use a dedicated test account with aliases
    const baseEmail = process.env.TEST_GMAIL || 'claude-qa-test@gmail.com';
    const alias = `${Date.now()}`;
    this.currentEmail = baseEmail.replace('@', `+${alias}@`);
    
    console.log(`📧 Generated Gmail test email: ${this.currentEmail}`);
    return this.currentEmail;
  }

  /**
   * Check for verification email and extract link
   */
  async waitForVerificationEmail(timeout = 60000) {
    const startTime = Date.now();
    
    console.log(`🔍 Waiting for verification email to ${this.currentEmail}...`);
    
    while (Date.now() - startTime < timeout) {
      try {
        const emails = await this.fetchEmails();
        
        for (const email of emails) {
          const verificationLink = this.extractVerificationLink(email);
          if (verificationLink) {
            console.log(`✅ Found verification email!`);
            console.log(`🔗 Verification link: ${verificationLink}`);
            return {
              success: true,
              verificationLink,
              email: email
            };
          }
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`⏳ Still waiting... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
      }
    }
    
    throw new Error(`Verification email not received within ${timeout/1000}s`);
  }

  async fetchEmails() {
    switch (this.provider) {
      case 'tempmail':
        return await this.fetchTempMailEmails();
      case '10minutemail':
        return await this.fetch10MinuteEmails();
      case 'gmail':
        return await this.fetchGmailEmails();
      default:
        throw new Error(`Unknown email provider: ${this.provider}`);
    }
  }

  async fetchTempMailEmails() {
    if (!this.currentEmail) {
      throw new Error('No current email address');
    }
    
    const [username, domain] = this.currentEmail.split('@');
    
    const response = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${username}&domain=${domain}`);
    const emails = await response.json();
    
    // Fetch full email content for each message
    const fullEmails = [];
    for (const email of emails) {
      const fullResponse = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${username}&domain=${domain}&id=${email.id}`);
      const fullEmail = await fullResponse.json();
      fullEmails.push(fullEmail);
    }
    
    return fullEmails;
  }

  async fetch10MinuteEmails() {
    const response = await fetch('https://10minutemail.com/10MinuteMail/resources/messages/messagesAfter/0', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    return data.messages || [];
  }

  async fetchGmailEmails() {
    // Gmail API integration would go here
    // For now, return empty array
    return [];
  }

  extractVerificationLink(email) {
    const content = email.body || email.textBody || email.htmlBody || '';
    
    // Common patterns for verification links
    const patterns = [
      /https?:\/\/[^\s]+\/verify[^\s]*/gi,
      /https?:\/\/[^\s]+\/confirm[^\s]*/gi,
      /https?:\/\/[^\s]+\/auth\/callback[^\s]*/gi,
      /https?:\/\/[^\s]+token=[a-zA-Z0-9_-]+/gi,
      /https?:\/\/[^\s]+verification[^\s]*/gi
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Clean up the URL (remove any trailing characters)
        let link = matches[0];
        link = link.replace(/[">)\]}\s]+$/, '');
        return link;
      }
    }
    
    return null;
  }

  /**
   * Clean up - delete temporary email if supported
   */
  async cleanup() {
    console.log(`🧹 Cleaning up email: ${this.currentEmail}`);
    // Most temp email services auto-delete, so this is mainly for logging
  }
}

// Playwright integration helper
class PlaywrightEmailIntegration {
  constructor(page, emailService = new EmailQAService()) {
    this.page = page;
    this.emailService = emailService;
  }

  async createAccountWithEmailVerification(signupData) {
    console.log('👤 Creating account with email verification...');
    
    // Generate test email
    const testEmail = await this.emailService.generateTestEmail();
    
    // Fill signup form
    await this.page.fill('input[type="email"], input[name="email"]', testEmail);
    await this.page.fill('input[type="password"], input[name="password"]', signupData.password || 'TestPass123!');
    
    if (signupData.name) {
      await this.page.fill('input[name="name"], input[name="firstName"]', signupData.name);
    }
    
    // Submit form
    await this.page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create")');
    
    console.log(`📧 Account creation submitted for: ${testEmail}`);
    
    // Wait for verification email
    const emailResult = await this.emailService.waitForVerificationEmail(60000);
    
    if (emailResult.success) {
      // Navigate to verification link
      console.log('🔗 Clicking verification link...');
      await this.page.goto(emailResult.verificationLink);
      
      // Wait for verification success
      await this.page.waitForLoadState('networkidle');
      
      return {
        success: true,
        email: testEmail,
        verificationLink: emailResult.verificationLink
      };
    }
    
    throw new Error('Email verification failed');
  }

  async cleanup() {
    await this.emailService.cleanup();
  }
}

module.exports = { EmailQAService, PlaywrightEmailIntegration };

// Test the email service if run directly
if (require.main === module) {
  async function testEmailService() {
    const emailService = new EmailQAService('tempmail');
    
    try {
      const email = await emailService.generateTestEmail();
      console.log(`Generated email: ${email}`);
      
      // In a real test, we'd trigger an email and then wait
      // const result = await emailService.waitForVerificationEmail(30000);
      // console.log('Verification result:', result);
      
    } catch (error) {
      console.error('Email service test failed:', error.message);
    }
  }
  
  testEmailService();
}