// lib/ordersService.ts
// Centralized service for writing order data from Stripe webhooks

import { getSupabaseAdmin } from './supabaseAdmin';
import Stripe from 'stripe';

export interface OrderData {
  // Stripe identifiers
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  stripe_subscription_id?: string;
  stripe_invoice_id?: string;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  
  // User and character
  user_id: string;
  email: string;
  character_key: string;
  
  // Order classification
  order_type: 'subscription' | 'voice_pack' | 'tip' | 'one_time';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  
  // Product information
  product_type: string; // sfw_premium, nsfw_premium, voice_10, etc.
  product_name: string;
  tier?: string; // For legacy compatibility
  
  // Financial
  amount_cents: number;
  currency?: string;
  quantity?: number;
  
  // Voice pack specific
  voice_credits?: number;
  
  // Subscription specific
  subscription_start_date?: Date;
  subscription_end_date?: Date;
  subscription_status?: string;
  
  // Tip specific
  tip_amount_cents?: number;
  tip_character?: string;
  
  // Metadata
  stripe_metadata?: Record<string, any>;
  webhook_event_id?: string;
  completed_at?: Date;
}

export class OrdersService {
  private supabase = getSupabaseAdmin();

  /**
   * Create a new order record from Stripe webhook data
   */
  async createOrder(orderData: OrderData): Promise<{ success: boolean; order_id?: string; error?: string }> {
    try {
      console.log(`📝 Creating order record:`, {
        order_type: orderData.order_type,
        product_type: orderData.product_type,
        amount: orderData.amount_cents / 100,
        user_id: orderData.user_id,
        character_key: orderData.character_key
      });

      const { data, error } = await this.supabase
        .from('orders')
        .insert([{
          ...orderData,
          currency: orderData.currency || 'usd',
          quantity: orderData.quantity || 1,
          created_at: new Date().toISOString(),
          completed_at: orderData.completed_at?.toISOString() || (orderData.status === 'completed' ? new Date().toISOString() : null)
        }])
        .select('id')
        .single();

      if (error) {
        console.error(`❌ Error creating order record:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Order record created successfully: ${data.id}`);
      return { success: true, order_id: data.id };

    } catch (error) {
      console.error(`❌ Exception creating order record:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update an existing order (for status changes, refunds, etc.)
   */
  async updateOrder(
    orderId: string, 
    updates: Partial<OrderData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('orders')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          ...(updates.status === 'refunded' && { refunded_at: new Date().toISOString() })
        })
        .eq('id', orderId);

      if (error) {
        console.error(`❌ Error updating order ${orderId}:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Order ${orderId} updated successfully`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Exception updating order ${orderId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Find order by Stripe session ID (for webhook deduplication)
   */
  async findOrderBySessionId(sessionId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error(`❌ Error finding order by session ID ${sessionId}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`❌ Exception finding order by session ID ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Find order by webhook event ID (for idempotency)
   */
  async findOrderByWebhookEventId(eventId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('webhook_event_id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ Error finding order by webhook event ID ${eventId}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`❌ Exception finding order by webhook event ID ${eventId}:`, error);
      return null;
    }
  }

  /**
   * Create order from Stripe Checkout Session
   */
  static createOrderFromCheckoutSession(
    session: Stripe.Checkout.Session,
    userId: string,
    characterKey: string,
    webhookEventId?: string,
    additionalData?: Partial<OrderData>
  ): OrderData {
    const amount = session.amount_total || 0;
    const email = session.customer_details?.email || session.customer_email || '';
    
    // Determine order type and product info from metadata
    const metadata = session.metadata || {};
    const tier = metadata.tier as string;
    
    let orderType: 'subscription' | 'voice_pack' | 'tip' | 'one_time' = 'one_time';
    let productType = tier || 'unknown';
    let productName = 'Unknown Product';
    let voiceCredits = 0;

    // Classify the order type based on tier/metadata
    if (tier?.startsWith('voice_pack_')) {
      orderType = 'voice_pack';
      const creditsMatch = tier.match(/voice_pack_(\d+)/);
      voiceCredits = creditsMatch ? parseInt(creditsMatch[1]) : 0;
      productType = tier.replace('voice_pack_', 'voice_');
      productName = `Voice Pack (${voiceCredits} credits)`;
    } else if (tier === 'sub_sfw') {
      orderType = 'subscription';
      productType = 'sfw_premium';
      productName = 'SFW Premium Subscription';
    } else if (tier === 'sub_nsfw') {
      orderType = 'subscription';
      productType = 'nsfw_premium';
      productName = 'NSFW Premium Subscription';
    }

    return {
      stripe_session_id: session.id,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripe_price_id: metadata.price_id as string,
      
      user_id: userId,
      email: email.trim().toLowerCase(),
      character_key: characterKey.toLowerCase(),
      
      order_type: orderType,
      status: 'completed', // Checkout sessions are completed when webhook fires
      
      product_type: productType,
      product_name: productName,
      tier,
      
      amount_cents: amount,
      currency: session.currency || 'usd',
      quantity: 1,
      
      voice_credits: voiceCredits > 0 ? voiceCredits : undefined,
      
      stripe_metadata: metadata,
      webhook_event_id: webhookEventId,
      completed_at: new Date(),
      
      ...additionalData
    };
  }

  /**
   * Create order from Stripe Invoice (for subscriptions)
   */
  static createOrderFromInvoice(
    invoice: Stripe.Invoice,
    userId: string,
    characterKey: string,
    webhookEventId?: string,
    additionalData?: Partial<OrderData>
  ): OrderData {
    const amount = invoice.amount_paid || 0;
    const email = invoice.customer_email || '';
    
    return {
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: (invoice as any).subscription ? 
        (typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : (invoice as any).subscription.id) : 
        undefined,
      stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
      
      user_id: userId,
      email: email.trim().toLowerCase(),
      character_key: characterKey.toLowerCase(),
      
      order_type: 'subscription',
      status: invoice.status === 'paid' ? 'completed' : 'pending',
      
      product_type: 'subscription_renewal',
      product_name: 'Subscription Renewal',
      
      amount_cents: amount,
      currency: invoice.currency || 'usd',
      
      stripe_metadata: invoice.metadata || {},
      webhook_event_id: webhookEventId,
      completed_at: invoice.status === 'paid' ? new Date() : undefined,
      
      ...additionalData
    };
  }
}

export const ordersService = new OrdersService();