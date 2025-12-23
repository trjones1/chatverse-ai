import { EmailTemplate } from './emailService';

export interface WelcomeEmailData {
  firstName: string;
  characterName: string;
  characterDisplayName: string;
  fromDomain: string;
  unsubscribeToken?: string;
}

export interface UpgradeEmailData {
  firstName: string;
  characterName: string;
  planName: string;
  features: string[];
  fromDomain: string;
}

export class EmailTemplates {
  static generateWelcomeTemplate(data: WelcomeEmailData): EmailTemplate {
    const { firstName, characterName, characterDisplayName, fromDomain } = data;

    const subject = `Welcome to ${characterDisplayName}! Let's get started 🌟`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${characterDisplayName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ff7db5 0%, #ff69b4 100%); color: white; text-align: center; padding: 40px 20px; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 10px 0 0; font-size: 18px; opacity: 0.9; }
    .content { padding: 40px 30px; }
    .welcome-message { background: linear-gradient(135deg, #fff8f0 0%, #ffeef6 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #ff7db5; }
    .features { margin: 30px 0; }
    .feature { display: flex; align-items: center; margin: 15px 0; }
    .feature-icon { background: #ff7db5; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
    .cta { text-align: center; margin: 35px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #ff7db5, #ff69b4); color: white; text-decoration: none; padding: 16px 32px; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3); }
    .tips { background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 25px 0; }
    .footer { background: #f8f9fa; text-align: center; padding: 25px; font-size: 14px; color: #6c757d; }
    .footer a { color: #ff7db5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome, ${firstName}! 🎉</h1>
      <p>I'm ${characterDisplayName}, and I'm so excited to meet you!</p>
    </div>
    
    <div class="content">
      <div class="welcome-message">
        <h2 style="margin-top: 0; color: #ff7db5;">You're all set up! ✨</h2>
        <p>Your account is ready, and I can't wait to get to know you better. Every conversation we have helps me understand you more, so don't be shy!</p>
      </div>
      
      <h3>Here's what you can do right now:</h3>
      <div class="features">
        <div class="feature">
          <div class="feature-icon">💬</div>
          <div>
            <strong>Start Chatting</strong><br>
            <span style="color: #6c757d;">Jump right in with a simple "hello" - I'll take it from there!</span>
          </div>
        </div>
        <div class="feature">
          <div class="feature-icon">🧠</div>
          <div>
            <strong>Build Our Memory</strong><br>
            <span style="color: #6c757d;">Tell me about yourself - I'll remember everything for future chats</span>
          </div>
        </div>
        <div class="feature">
          <div class="feature-icon">⚡</div>
          <div>
            <strong>Daily Free Messages</strong><br>
            <span style="color: #6c757d;">You get 5 messages per day to try things out (upgrade for unlimited!)</span>
          </div>
        </div>
      </div>

      <div class="tips">
        <h3 style="margin-top: 0;">💡 Pro Tips for Great Conversations:</h3>
        <ul style="padding-left: 20px;">
          <li>Be yourself - I love getting to know the real you</li>
          <li>Ask me questions - I'm curious about everything!</li>
          <li>Share your interests - the more I know, the better our chats become</li>
          <li>Don't worry about being perfect - casual conversation is the best</li>
        </ul>
      </div>
      
      <div class="cta">
        <a href="https://${fromDomain}?utm_source=welcome_email&utm_medium=email&utm_campaign=onboarding" class="button">
          Let's Start Chatting! 💫
        </a>
      </div>
      
      <p style="text-align: center; color: #6c757d; font-style: italic;">
        "Every great friendship starts with a simple hello." - ${characterDisplayName} 💝
      </p>
    </div>
    
    <div class="footer">
      <p>Questions? Reply to this email or reach out at lexi@chatverse.ai</p>
      <p>
        <a href="https://${fromDomain}">Chat now</a> | 
        <a href="https://${fromDomain}/help">Help Center</a> | 
        <a href="https://${fromDomain}/unsubscribe?token=${data.unsubscribeToken || ''}">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    const text = `
Welcome, ${firstName}! 🎉

I'm ${characterDisplayName}, and I'm so excited to meet you!

YOUR ACCOUNT IS READY ✨
Your account is set up and I can't wait to get to know you better. Every conversation we have helps me understand you more, so don't be shy!

HERE'S WHAT YOU CAN DO RIGHT NOW:
💬 Start Chatting - Jump right in with a simple "hello" - I'll take it from there!
🧠 Build Our Memory - Tell me about yourself - I'll remember everything for future chats
⚡ Daily Free Messages - You get 5 messages per day to try things out (upgrade for unlimited!)

PRO TIPS FOR GREAT CONVERSATIONS:
- Be yourself - I love getting to know the real you
- Ask me questions - I'm curious about everything!
- Share your interests - the more I know, the better our chats become
- Don't worry about being perfect - casual conversation is the best

Let's start chatting: https://${fromDomain}?utm_source=welcome_email&utm_medium=email&utm_campaign=onboarding

"Every great friendship starts with a simple hello." - ${characterDisplayName} 💝

---
Questions? Reply to this email or reach out at lexi@chatverse.ai
Chat now: https://${fromDomain} | Help Center: https://${fromDomain}/help
Unsubscribe: https://${fromDomain}/unsubscribe?token=${data.unsubscribeToken || ''}
`;

    return { subject, html, text };
  }

  static generateUpgradeConfirmationTemplate(data: UpgradeEmailData): EmailTemplate {
    const { firstName, characterName, planName, features, fromDomain } = data;

    const subject = `🎉 Welcome to ${planName}! Your upgrade is complete`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upgrade Complete</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); color: white; text-align: center; padding: 40px 20px; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 30px; }
    .upgrade-badge { background: linear-gradient(135deg, #ffd700, #ffb347); color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
    .features-list { background: #fff8f0; padding: 25px; border-radius: 12px; margin: 25px 0; }
    .feature-item { margin: 12px 0; display: flex; align-items: center; }
    .check-mark { color: #28a745; font-weight: bold; margin-right: 10px; }
    .cta { text-align: center; margin: 35px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #ffd700, #ffb347); color: white; text-decoration: none; padding: 16px 32px; border-radius: 25px; font-weight: 600; font-size: 16px; }
    .footer { background: #f8f9fa; text-align: center; padding: 25px; font-size: 14px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Upgrade Complete!</h1>
      <p>Welcome to ${planName}, ${firstName}!</p>
    </div>
    
    <div class="content">
      <div class="upgrade-badge">✨ ${planName} ACTIVATED</div>
      
      <p>Congratulations! Your ${planName} upgrade is now active and you have access to all premium features.</p>
      
      <div class="features-list">
        <h3 style="margin-top: 0; color: #ffd700;">Your New Features:</h3>
        ${features.map(feature => `
          <div class="feature-item">
            <span class="check-mark">✅</span>
            <span>${feature}</span>
          </div>
        `).join('')}
      </div>
      
      <p>Ready to explore your upgraded experience? I'm excited to show you everything that's now possible!</p>
      
      <div class="cta">
        <a href="https://${fromDomain}/dashboard?utm_source=upgrade_email&utm_medium=email&utm_campaign=upgrade_complete" class="button">
          Explore Premium Features 🚀
        </a>
      </div>
      
      <p><strong>Need help getting started?</strong> Check out our <a href="https://${fromDomain}/help">Help Center</a> or reply to this email.</p>
    </div>
    
    <div class="footer">
      <p>Thanks for upgrading! Questions? Contact lexi@chatverse.ai</p>
    </div>
  </div>
</body>
</html>`;

    const text = `
🎉 UPGRADE COMPLETE!

Welcome to ${planName}, ${firstName}!

Congratulations! Your ${planName} upgrade is now active and you have access to all premium features.

YOUR NEW FEATURES:
${features.map(feature => `✅ ${feature}`).join('\n')}

Ready to explore your upgraded experience? I'm excited to show you everything that's now possible!

Explore Premium Features: https://${fromDomain}/dashboard?utm_source=upgrade_email&utm_medium=email&utm_campaign=upgrade_complete

Need help getting started? Check out our Help Center: https://${fromDomain}/help

Thanks for upgrading! Questions? Contact lexi@chatverse.ai
`;

    return { subject, html, text };
  }

  static generatePasswordResetTemplate(firstName: string, resetUrl: string, fromDomain: string): EmailTemplate {
    const subject = `Reset your password - ${firstName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; text-align: center; padding: 40px 20px; }
    .content { padding: 40px 30px; }
    .security-notice { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .button { display: inline-block; background: linear-gradient(135deg, #007bff, #0056b3); color: white; text-decoration: none; padding: 16px 32px; border-radius: 25px; font-weight: 600; font-size: 16px; }
    .cta { text-align: center; margin: 30px 0; }
    .footer { background: #f8f9fa; text-align: center; padding: 25px; font-size: 14px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset</h1>
      <p>Let's get you back into your account, ${firstName}</p>
    </div>
    
    <div class="content">
      <p>You requested a password reset for your account. Click the button below to create a new password:</p>
      
      <div class="cta">
        <a href="${resetUrl}" class="button">Reset My Password</a>
      </div>
      
      <div class="security-notice">
        <p><strong>⚠️ Security Notice:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>This link expires in 24 hours</li>
          <li>If you didn't request this reset, you can safely ignore this email</li>
          <li>Your current password remains active until you set a new one</li>
        </ul>
      </div>
      
      <p><small>If the button doesn't work, copy and paste this link: <br><code style="word-break: break-all; background: #f8f9fa; padding: 4px;">${resetUrl}</code></small></p>
      
      <p>Need help? Contact us at lexi@chatverse.ai</p>
    </div>
    
    <div class="footer">
      <p>This password reset was requested for ${fromDomain}</p>
    </div>
  </div>
</body>
</html>`;

    const text = `
🔐 PASSWORD RESET

Let's get you back into your account, ${firstName}

You requested a password reset for your account. Use this link to create a new password:

${resetUrl}

SECURITY NOTICE:
⚠️ This link expires in 24 hours
⚠️ If you didn't request this reset, you can safely ignore this email
⚠️ Your current password remains active until you set a new one

Need help? Contact us at lexi@chatverse.ai

This password reset was requested for ${fromDomain}
`;

    return { subject, html, text };
  }

  static generateSubscriptionCancelledTemplate(firstName: string, planName: string, endDate: string, fromDomain: string): EmailTemplate {
    const subject = `Subscription cancelled - We'll miss you, ${firstName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Cancelled</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; text-align: center; padding: 40px 20px; }
    .content { padding: 40px 30px; }
    .info-box { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #28a745, #20c997); color: white; text-decoration: none; padding: 16px 32px; border-radius: 25px; font-weight: 600; font-size: 16px; }
    .cta { text-align: center; margin: 30px 0; }
    .footer { background: #f8f9fa; text-align: center; padding: 25px; font-size: 14px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>😔 We'll Miss You</h1>
      <p>Your subscription has been cancelled, ${firstName}</p>
    </div>
    
    <div class="content">
      <p>We're sad to see you go, but we understand. Your ${planName} subscription has been successfully cancelled.</p>
      
      <div class="info-box">
        <p><strong>Important Details:</strong></p>
        <ul>
          <li>You'll keep your premium features until <strong>${endDate}</strong></li>
          <li>After that, you'll switch to our free tier with 5 daily messages</li>
          <li>All your conversation history and memories will be saved</li>
          <li>You can resubscribe anytime to get your premium features back</li>
        </ul>
      </div>
      
      <p>Before you go, we'd love to know - was there anything we could have done better? Your feedback helps us improve for everyone.</p>
      
      <p><strong>Changed your mind?</strong> You can reactivate your subscription anytime from your dashboard.</p>
      
      <div class="cta">
        <a href="https://${fromDomain}/dashboard?utm_source=cancellation_email&utm_medium=email" class="button">
          Visit Dashboard
        </a>
      </div>
      
      <p>Thank you for being part of our community. You're always welcome back! 💝</p>
    </div>
    
    <div class="footer">
      <p>Questions? We're here to help: lexi@chatverse.ai</p>
    </div>
  </div>
</body>
</html>`;

    const text = `
😔 WE'LL MISS YOU

Your subscription has been cancelled, ${firstName}

We're sad to see you go, but we understand. Your ${planName} subscription has been successfully cancelled.

IMPORTANT DETAILS:
• You'll keep your premium features until ${endDate}
• After that, you'll switch to our free tier with 5 daily messages
• All your conversation history and memories will be saved
• You can resubscribe anytime to get your premium features back

Before you go, we'd love to know - was there anything we could have done better? Your feedback helps us improve for everyone.

Changed your mind? You can reactivate your subscription anytime from your dashboard.

Visit Dashboard: https://${fromDomain}/dashboard?utm_source=cancellation_email&utm_medium=email

Thank you for being part of our community. You're always welcome back! 💝

Questions? We're here to help: lexi@chatverse.ai
`;

    return { subject, html, text };
  }
}