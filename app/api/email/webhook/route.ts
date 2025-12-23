import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/emailService';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    // Verify webhook signature from Resend
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('resend-signature');
      if (!signature) {
        console.error('Missing webhook signature');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      // Verify the signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      
      const providedSignature = signature.replace('sha256=', '');
      
      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    const { type, data } = body;

    if (!type || !data || !data.message_id) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    switch (type) {
      case 'email.delivered':
        // Email was successfully delivered
        await emailService.markEmailOpened(data.message_id);
        break;

      case 'email.opened':
        // Email was opened by recipient
        await emailService.markEmailOpened(data.message_id);
        break;

      case 'email.clicked':
        // Link in email was clicked
        await emailService.markEmailClicked(data.message_id);
        break;

      case 'email.bounced':
      case 'email.complained':
        // Email bounced or recipient marked as spam
        // Could implement automatic unsubscribe here
        console.warn(`Email ${type} for message ${data.message_id}`);
        break;

      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing email webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}