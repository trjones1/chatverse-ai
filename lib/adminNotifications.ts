// lib/adminNotifications.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface NewUserData {
  userId: string;
  email: string;
  signupMethod: 'email' | 'google' | 'oauth';
  characterKey?: string;
  timestamp: string;
}

export interface NewPurchaseData {
  userId: string;
  userEmail: string;
  purchaseType: 'subscription' | 'voice_credits' | 'versecoins';
  amount: number; // in cents or VerseCoins
  currency?: string;
  productName: string;
  characterKey?: string;
  timestamp: string;
  orderId?: string;
}

export class AdminNotificationService {
  private static instance: AdminNotificationService;

  static getInstance(): AdminNotificationService {
    if (!AdminNotificationService.instance) {
      AdminNotificationService.instance = new AdminNotificationService();
    }
    return AdminNotificationService.instance;
  }

  private get adminEmails(): string[] {
    const emails = [
      'tramel.jones@gmail.com',
      'tramel.jones@icloud.com'
    ];

    // Add additional email from env if configured
    if (process.env.ADMIN_NOTIFICATION_EMAIL && !emails.includes(process.env.ADMIN_NOTIFICATION_EMAIL)) {
      emails.push(process.env.ADMIN_NOTIFICATION_EMAIL);
    }

    return emails;
  }

  private get fromEmail(): string {
    // Use verified Resend domain
    return process.env.RESEND_FROM_EMAIL || 'notifications@mail.chatwithlexi.com';
  }

  /**
   * Send notification when a new user signs up
   */
  async notifyNewSignup(userData: NewUserData): Promise<boolean> {
    try {
      const { userId, email, signupMethod, characterKey, timestamp } = userData;

      const subject = `🎉 New User Signup: ${email}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b5cf6;">🎉 Hey Boss, New User Signup!</h2>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>User Email:</strong> ${email}</p>
            <p style="margin: 8px 0;"><strong>User ID:</strong> <code>${userId}</code></p>
            <p style="margin: 8px 0;"><strong>Signup Method:</strong> ${signupMethod}</p>
            ${characterKey ? `<p style="margin: 8px 0;"><strong>Character:</strong> ${characterKey}</p>` : ''}
            <p style="margin: 8px 0;"><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;">
              <strong>Action Items:</strong><br>
              • Monitor for first message engagement<br>
              • Check for immediate bounce or continued activity<br>
              • Consider follow-up retention email in 24 hours
            </p>
          </div>

          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            View user in admin dashboard: <a href="https://supabase.com/dashboard/project/copjpqtwdqrclfrwoaeb/auth/users">Supabase Auth</a>
          </p>
        </div>
      `;

      const text = `
New User Signup!

User Email: ${email}
User ID: ${userId}
Signup Method: ${signupMethod}
${characterKey ? `Character: ${characterKey}\n` : ''}
Timestamp: ${new Date(timestamp).toLocaleString()}

Action Items:
• Monitor for first message engagement
• Check for immediate bounce or continued activity
• Consider follow-up retention email in 24 hours
      `;

      const result = await resend.emails.send({
        from: `Lexi Bot Notifications <${this.fromEmail}>`,
        to: this.adminEmails,
        subject,
        html,
        text,
      });

      if (result.error) {
        console.error('Failed to send admin signup notification:', result.error);
        return false;
      }

      console.log('✅ Admin signup notification sent:', result.data?.id);
      return true;

    } catch (error) {
      console.error('Error sending admin signup notification:', error);
      return false;
    }
  }

  /**
   * Send notification when a purchase is made
   */
  async notifyNewPurchase(purchaseData: NewPurchaseData): Promise<boolean> {
    try {
      const {
        userId,
        userEmail,
        purchaseType,
        amount,
        currency = 'USD',
        productName,
        characterKey,
        timestamp,
        orderId
      } = purchaseData;

      // Format amount based on purchase type
      let formattedAmount: string;
      if (purchaseType === 'versecoins') {
        formattedAmount = `${amount} VerseCoins`;
      } else {
        formattedAmount = `$${(amount / 100).toFixed(2)} ${currency}`;
      }

      const subject = `💰 NEW PURCHASE: ${formattedAmount} from ${userEmail}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">💰 New Purchase!</h2>

          <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="margin: 0; font-size: 36px;">${formattedAmount}</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">${productName}</p>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Customer:</strong> ${userEmail}</p>
            <p style="margin: 8px 0;"><strong>User ID:</strong> <code>${userId}</code></p>
            <p style="margin: 8px 0;"><strong>Purchase Type:</strong> ${purchaseType}</p>
            <p style="margin: 8px 0;"><strong>Product:</strong> ${productName}</p>
            ${characterKey ? `<p style="margin: 8px 0;"><strong>Character:</strong> ${characterKey}</p>` : ''}
            ${orderId ? `<p style="margin: 8px 0;"><strong>Order ID:</strong> <code>${orderId}</code></p>` : ''}
            <p style="margin: 8px 0;"><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Next Steps:</strong><br>
              • Celebrate! 🎉<br>
              • Monitor user satisfaction and engagement<br>
              • Consider personalized thank you message<br>
              • Track for repeat purchases
            </p>
          </div>

          <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
            View order details: <a href="https://www.chatwithlexi.com/admin">Admin Dashboard</a>
          </p>
        </div>
      `;

      const text = `
NEW PURCHASE!

Amount: ${formattedAmount}
Product: ${productName}

Customer: ${userEmail}
User ID: ${userId}
Purchase Type: ${purchaseType}
${characterKey ? `Character: ${characterKey}\n` : ''}
${orderId ? `Order ID: ${orderId}\n` : ''}
Timestamp: ${new Date(timestamp).toLocaleString()}

Next Steps:
• Celebrate! 🎉
• Monitor user satisfaction and engagement
• Consider personalized thank you message
• Track for repeat purchases
      `;

      const result = await resend.emails.send({
        from: `Lexi Bot Notifications <${this.fromEmail}>`,
        to: this.adminEmails,
        subject,
        html,
        text,
      });

      if (result.error) {
        console.error('Failed to send admin purchase notification:', result.error);
        return false;
      }

      console.log('✅ Admin purchase notification sent:', result.data?.id);
      return true;

    } catch (error) {
      console.error('Error sending admin purchase notification:', error);
      return false;
    }
  }

  /**
   * Test notification to verify email setup
   */
  async sendTestNotification(): Promise<boolean> {
    try {
      const subject = '🧪 Test Notification - Lexi Bot Admin Alerts';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b5cf6;">🧪 Test Notification</h2>
          <p>This is a test notification to verify your admin email alerts are working correctly.</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Admin Emails:</strong> ${this.adminEmails.join(', ')}</p>
            <p style="margin: 8px 0;"><strong>From Email:</strong> ${this.fromEmail}</p>
            <p style="margin: 8px 0;"><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px;">
            <p style="margin: 0; color: #065f46;">
              ✅ If you're reading this, your admin notifications are set up correctly!
            </p>
          </div>
        </div>
      `;

      const text = `
Test Notification - Lexi Bot Admin Alerts

This is a test notification to verify your admin email alerts are working correctly.

Admin Emails: ${this.adminEmails.join(', ')}
From Email: ${this.fromEmail}
Test Time: ${new Date().toLocaleString()}

✅ If you're reading this, your admin notifications are set up correctly!
      `;

      const result = await resend.emails.send({
        from: `Lexi Bot Notifications <${this.fromEmail}>`,
        to: this.adminEmails,
        subject,
        html,
        text,
      });

      if (result.error) {
        console.error('Failed to send test notification:', result.error);
        return false;
      }

      console.log('✅ Test notification sent:', result.data?.id);
      return true;

    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }
}

// Export singleton instance
export const adminNotifications = AdminNotificationService.getInstance();
