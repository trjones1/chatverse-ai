import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static instance: EmailService;
  
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendRetentionEmail(
    email: string, 
    template: EmailTemplate,
    userId: string,
    campaignType: string = 'retention',
    fromName?: string,
    fromEmail?: string
  ): Promise<EmailSendResult> {
    try {
      // Send email via Resend
      const fromAddress = fromEmail || 'noreply@mail.chatwithlexi.com';
      const fromDisplayName = fromName || 'Lexi';
      
      const result = await resend.emails.send({
        from: `${fromDisplayName} <${fromAddress}>`,
        to: [email],
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (result.error) {
        console.error('Resend error:', result.error);
        return { success: false, error: result.error.message };
      }

      // Log email sent to database
      await this.logEmailSent(userId, email, campaignType, template.subject, result.data?.id);

      return { 
        success: true, 
        messageId: result.data?.id 
      };

    } catch (error) {
      console.error('Failed to send retention email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async logEmailSent(
    userId: string, 
    email: string, 
    campaignType: string, 
    subject: string, 
    messageId?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      
      await supabase
        .from('email_logs')
        .insert({
          user_id: userId,
          email_address: email,
          campaign_type: campaignType,
          subject,
          message_id: messageId,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });
    } catch (error) {
      console.error('Failed to log email:', error);
      // Don't throw here - email was sent successfully
    }
  }

  async getUserMemories(userId: string): Promise<any[]> {
    try {
      const supabase = await createClient();
      
      const { data: memories, error } = await supabase
        .from('chat_memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to fetch memories:', error);
        return [];
      }

      return memories || [];
    } catch (error) {
      console.error('Error fetching memories:', error);
      return [];
    }
  }

  async markEmailOpened(messageId: string): Promise<void> {
    try {
      const supabase = await createClient();
      
      await supabase
        .from('email_logs')
        .update({ 
          status: 'opened',
          opened_at: new Date().toISOString()
        })
        .eq('message_id', messageId);
    } catch (error) {
      console.error('Failed to mark email as opened:', error);
    }
  }

  async markEmailClicked(messageId: string): Promise<void> {
    try {
      const supabase = await createClient();
      
      await supabase
        .from('email_logs')
        .update({ 
          status: 'clicked',
          clicked_at: new Date().toISOString()
        })
        .eq('message_id', messageId);
    } catch (error) {
      console.error('Failed to mark email as clicked:', error);
    }
  }

  async sendReceiptEmail(
    userId: string,
    receiptData: ReceiptData,
    fromName?: string,
    fromEmail?: string
  ): Promise<EmailSendResult> {
    try {
      const template = generateReceiptTemplate(receiptData);
      
      // Send email via Resend
      const fromAddress = fromEmail || 'receipts@mail.chatwithlexi.com';
      const fromDisplayName = fromName || (receiptData.characterDisplayName || receiptData.character.charAt(0).toUpperCase() + receiptData.character.slice(1));
      
      const result = await resend.emails.send({
        from: `${fromDisplayName} <${fromAddress}>`,
        to: [receiptData.customerEmail],
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (result.error) {
        console.error('Resend error for receipt:', result.error);
        return { success: false, error: result.error.message };
      }

      // Log receipt email sent to database
      await this.logEmailSent(userId, receiptData.customerEmail, 'receipt', template.subject, result.data?.id);

      return { 
        success: true, 
        messageId: result.data?.id 
      };

    } catch (error) {
      console.error('Failed to send receipt email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// User activity tracking function
export async function trackUserActivity(
  userId: string,
  activityType: string,
  characterId?: string,
  metadata?: any
): Promise<void> {
  try {
    const supabase = await createClient();
    
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        activity_type: activityType,
        character_id: characterId,
        metadata,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to track user activity:', error);
  }
}

// Email preferences creation function
export async function createEmailPreferences(
  userId: string,
  email: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Check if preferences already exist
    const { data: existing } = await supabase
      .from('email_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return; // Preferences already exist
    }

    // Create default email preferences
    await supabase
      .from('email_preferences')
      .insert({
        user_id: userId,
        email_address: email,
        retention_emails: true,
        product_updates: true,
        marketing_emails: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to create email preferences:', error);
  }
}

// Receipt email interfaces
export interface PurchaseItem {
  description: string;
  quantity: number;
  price: number; // in dollars
  total: number; // in dollars
}

export interface ReceiptData {
  purchaseId: string;
  customerEmail: string;
  customerName?: string;
  purchaseDate: Date;
  items: PurchaseItem[];
  subtotal: number; // in dollars
  tax?: number; // in dollars
  total: number; // in dollars
  currency: string;
  character: string;
  characterDisplayName?: string;
}

// Receipt email template generator
export function generateReceiptTemplate(receiptData: ReceiptData): EmailTemplate {
  const {
    purchaseId,
    customerEmail,
    purchaseDate,
    items,
    subtotal,
    tax,
    total,
    currency,
    character,
    characterDisplayName
  } = receiptData;

  const currencySymbol = currency === 'USD' ? '$' : currency;
  const formatPrice = (price: number) => `${currencySymbol}${price.toFixed(2)}`;
  const charName = characterDisplayName || character.charAt(0).toUpperCase() + character.slice(1);

  const subject = `Your purchase receipt from ${charName} - Order #${purchaseId.slice(-8)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #ff7db5 0%, #ff69b4 100%); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .receipt-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .order-info { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; }
    .order-info div { margin-bottom: 10px; }
    .items { border-collapse: collapse; width: 100%; margin: 20px 0; }
    .items th, .items td { text-align: left; padding: 12px; border-bottom: 1px solid #e9ecef; }
    .items th { background: #f8f9fa; font-weight: 600; }
    .totals { margin-top: 20px; text-align: right; }
    .totals div { margin: 5px 0; }
    .total-final { font-weight: bold; font-size: 1.1em; padding-top: 10px; border-top: 2px solid #ff7db5; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 0.9em; }
    .button { display: inline-block; background: linear-gradient(135deg, #ff7db5, #ff69b4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧾 Purchase Receipt</h1>
      <p>Thank you for your purchase from ${charName}!</p>
    </div>
    
    <div class="content">
      <div class="receipt-card">
        <div class="order-info">
          <div>
            <strong>Order ID:</strong><br>
            ${purchaseId}
          </div>
          <div>
            <strong>Date:</strong><br>
            ${purchaseDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div>
            <strong>Email:</strong><br>
            ${customerEmail}
          </div>
          <div>
            <strong>Character:</strong><br>
            ${charName}
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${formatPrice(item.price)}</td>
                <td>${formatPrice(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div>Subtotal: ${formatPrice(subtotal)}</div>
          ${tax ? `<div>Tax: ${formatPrice(tax)}</div>` : ''}
          <div class="total-final">Total: ${formatPrice(total)}</div>
        </div>
      </div>

      <p>Your purchase has been processed successfully. You now have access to your new features!</p>
      
      <div style="text-align: center;">
        <a href="https://${character === 'lexi' ? 'www.chatwithlexi.com' : `${character}.chatwithlexi.com`}/dashboard" class="button">
          View Your Dashboard
        </a>
      </div>
      
      <p><small><strong>Need help?</strong> Contact us at support@chatverse.ai</small></p>
    </div>
    
    <div class="footer">
      <p>This is an automated receipt from ${charName}.<br>
      Keep this email for your records.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
PURCHASE RECEIPT
================

Thank you for your purchase from ${charName}!

Order ID: ${purchaseId}
Date: ${purchaseDate.toLocaleDateString()}
Email: ${customerEmail}
Character: ${charName}

ITEMS PURCHASED:
${items.map(item => 
  `${item.description} x${item.quantity} - ${formatPrice(item.price)} = ${formatPrice(item.total)}`
).join('\n')}

Subtotal: ${formatPrice(subtotal)}
${tax ? `Tax: ${formatPrice(tax)}\n` : ''}Total: ${formatPrice(total)}

Your purchase has been processed successfully. You now have access to your new features!

Visit your dashboard: https://${character === 'lexi' ? 'www.chatwithlexi.com' : `${character}.chatwithlexi.com`}/dashboard

Need help? Contact us at support@chatverse.ai

This is an automated receipt from ${charName}. Keep this email for your records.
`;

  return {
    subject,
    html,
    text
  };
}

export const emailService = EmailService.getInstance();