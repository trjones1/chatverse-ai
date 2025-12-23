// app/api/tips/webhook/route.ts
// Handle Stripe webhooks for tip payments

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { emailService, ReceiptData, PurchaseItem } from '@/lib/emailService';
import { ordersService, type OrderData } from '@/lib/ordersService';
import { processSelfieForMessage } from '@/lib/selfieSystem';

// Server-side analytics tracking for GA4 Measurement Protocol
async function trackServerSideEvent(eventName: string, eventParams: Record<string, any>) {
  try {
    const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;
    
    if (!measurementId || !apiSecret) {
      console.log('[analytics] Missing GA4 credentials for server-side tracking');
      return;
    }
    
    const clientId = eventParams.user_id || 'server-side-' + Date.now();
    
    const payload = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: {
          ...eventParams,
          engagement_time_msec: '1000', // Required for GA4
        }
      }]
    };
    
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    
    if (response.ok) {
      console.log(`[analytics] Tracked server-side event: ${eventName}`);
    } else {
      console.error(`[analytics] Failed to track server-side event: ${eventName}`, response.statusText);
    }
  } catch (error) {
    console.error('[analytics] Server-side tracking error:', error);
  }
}

// NOTE: Immediate tip acknowledgment functions moved to main webhook (api/webhook/route.ts)
// to consolidate all Stripe webhook processing in one location

const supabase = getSupabaseAdmin();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Payment intent succeeded:', paymentIntent.id);

    // Get tip details for analytics tracking
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (tipError || !tip) {
      console.error('Failed to fetch tip details:', tipError);
      return;
    }

    // Update tip status to completed
    const { error } = await supabase
      .from('tips')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Failed to update tip status:', error);
      return;
    }

    // Track tip purchase for analytics
    await trackServerSideEvent('purchase', {
      transaction_id: paymentIntent.id,
      value: (paymentIntent.amount || 0) / 100, // Convert from cents to dollars
      currency: (paymentIntent.currency || 'usd').toUpperCase(),
      item_category: 'tip',
      character: tip.character_key,
      user_id: tip.user_id,
      has_message: !!tip.message,
    });

    console.log(`[analytics] Tracked tip purchase: $${(paymentIntent.amount || 0) / 100} for ${tip.character_key}`);

    // Send receipt email for the tip
    try {
      // Get user email from Supabase auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(tip.user_id);
      
      if (!userError && userData?.user?.email) {
        const receiptItems: PurchaseItem[] = [{
          description: tip.message 
            ? `Tip to ${tip.character_key.charAt(0).toUpperCase() + tip.character_key.slice(1)} with message: "${tip.message}"`
            : `Tip to ${tip.character_key.charAt(0).toUpperCase() + tip.character_key.slice(1)}`,
          quantity: 1,
          price: (paymentIntent.amount || 0) / 100,
          total: (paymentIntent.amount || 0) / 100
        }];
        
        const receiptData: ReceiptData = {
          purchaseId: paymentIntent.id,
          customerEmail: userData.user.email,
          purchaseDate: new Date(),
          items: receiptItems,
          subtotal: (paymentIntent.amount || 0) / 100,
          total: (paymentIntent.amount || 0) / 100,
          currency: (paymentIntent.currency || 'USD').toUpperCase(),
          character: tip.character_key,
          characterDisplayName: tip.character_key.charAt(0).toUpperCase() + tip.character_key.slice(1)
        };
        
        const receiptResult = await emailService.sendReceiptEmail(tip.user_id, receiptData);
        
        if (receiptResult.success) {
          console.log(`✅ Tip receipt email sent to ${userData.user.email} for tip ${paymentIntent.id}`);
        } else {
          console.error(`❌ Failed to send tip receipt email:`, receiptResult.error);
        }
      } else {
        console.log(`⚠️ Could not send tip receipt - user email not found for user ${tip.user_id}`);
      }
    } catch (receiptError) {
      console.error(`❌ Tip receipt email error:`, receiptError);
      // Don't fail the webhook if receipt email fails
    }

    // ✅ CREATE ORDER RECORD - Track tip in centralized orders table
    try {
      console.log(`📝 Creating order record for tip payment: ${paymentIntent.id}`);
      
      const orderData: OrderData = {
        stripe_payment_intent_id: paymentIntent.id,
        user_id: tip.user_id,
        email: tip.customer_email || '', // Use the email from tip record
        character_key: tip.character_key,
        
        order_type: 'tip',
        status: 'completed',
        
        product_type: 'tip',
        product_name: `Tip to ${tip.character_key.charAt(0).toUpperCase() + tip.character_key.slice(1)}`,
        
        amount_cents: paymentIntent.amount || 0,
        currency: paymentIntent.currency || 'usd',
        
        tip_amount_cents: paymentIntent.amount || 0,
        tip_character: tip.character_key,
        
        stripe_metadata: { tip_message: tip.message },
        webhook_event_id: `tip_${paymentIntent.id}`, // Use payment intent ID as event ID
        completed_at: new Date()
      };
      
      const orderResult = await ordersService.createOrder(orderData);
      
      if (orderResult.success) {
        console.log(`📝 ✅ Tip order record created successfully: ${orderResult.order_id}`);
      } else {
        console.error(`📝 ❌ Tip order record creation failed:`, orderResult.error);
        // Don't fail the webhook if order record fails - the tip was still processed
      }
    } catch (orderError) {
      console.error(`📝 ❌ Tip order tracking error:`, orderError);
      // Don't fail the webhook - order tracking is supplementary
    }

    // NOTE: Immediate tip acknowledgment is now handled in main webhook (api/webhook/route.ts)
    // to consolidate all Stripe webhook processing in one location

    console.log(`Tip payment completed: ${paymentIntent.id}`);

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Payment intent failed:', paymentIntent.id);

    // Update tip status to failed
    const { error } = await supabase
      .from('tips')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Failed to update tip status:', error);
      return;
    }

    console.log(`Tip payment failed: ${paymentIntent.id}`);

  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}