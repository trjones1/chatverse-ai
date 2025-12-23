// Coinbase Commerce webhook handler for crypto payment confirmations
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

const supabase = getSupabaseAdmin();

// Webhook events we care about
const RELEVANT_EVENTS = [
  'charge:confirmed',    // Payment confirmed (what we want!)
  'charge:failed',       // Payment failed
  'charge:delayed',      // Payment delayed (might confirm later)
  'charge:pending',      // Payment pending (initial state)
  'charge:resolved'      // Payment resolved (final confirmation)
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-cc-webhook-signature');

    console.log('🔄 Coinbase Commerce webhook received');

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('📨 Webhook event:', {
      id: event.id,
      type: event.type,
      created_at: event.created_at
    });

    // Only process relevant events
    if (!RELEVANT_EVENTS.includes(event.type)) {
      console.log('⏭️ Ignoring irrelevant event type:', event.type);
      return NextResponse.json({ received: true });
    }

    const charge = event.data;
    const chargeId = charge.id;

    console.log('🎯 Processing charge event:', {
      chargeId,
      type: event.type,
      timeline: charge.timeline?.length || 0
    });

    // Find the charge in our database
    const { data: cryptoCharge, error: findError } = await supabase
      .from('crypto_charges')
      .select('*')
      .eq('coinbase_charge_id', chargeId)
      .single();

    if (findError || !cryptoCharge) {
      console.error('❌ Charge not found in database:', chargeId);
      return NextResponse.json({ error: 'Charge not found' }, { status: 404 });
    }

    console.log('💰 Found charge in database:', {
      id: cryptoCharge.id,
      userId: cryptoCharge.user_id.substring(0, 8) + '...',
      character: cryptoCharge.character_key,
      tier: cryptoCharge.tier_name,
      currentStatus: cryptoCharge.status
    });

    // Handle different event types
    switch (event.type) {
      case 'charge:confirmed':
      case 'charge:resolved':
        await handleChargeConfirmed(cryptoCharge, charge);
        break;

      case 'charge:failed':
        await handleChargeFailed(cryptoCharge, charge);
        break;

      case 'charge:delayed':
      case 'charge:pending':
        await updateChargeStatus(cryptoCharge.id, event.type.split(':')[1]);
        break;

      default:
        console.log('🤷 Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleChargeConfirmed(cryptoCharge: any, coinbaseCharge: any) {
  try {
    const tierType = cryptoCharge.metadata?.tier_type || 'subscription';
    const quantity = cryptoCharge.metadata?.quantity;

    console.log('🎉 Payment confirmed!', {
      chargeId: cryptoCharge.id,
      userId: cryptoCharge.user_id.substring(0, 8) + '...',
      character: cryptoCharge.character_key,
      type: tierType,
      quantity
    });

    // Handle different product types
    switch (tierType) {
      case 'subscription':
        await handleSubscriptionPurchase(cryptoCharge, coinbaseCharge);
        break;
      case 'voice_pack':
        await handleVoicePackPurchase(cryptoCharge, coinbaseCharge, quantity);
        break;
      case 'tip':
        await handleTipPurchase(cryptoCharge, coinbaseCharge, quantity);
        break;
      default:
        console.error('❌ Unknown tier type:', tierType);
        throw new Error(`Unknown tier type: ${tierType}`);
    }

    // Update charge status
    await updateChargeStatus(cryptoCharge.id, 'confirmed', new Date());

    console.log('✅ Purchase processed successfully:', {
      type: tierType,
      quantity
    });

    // TODO: Send confirmation email
    // TODO: Track analytics event

  } catch (error) {
    console.error('❌ Failed to handle charge confirmation:', error);
    throw error;
  }
}

async function handleSubscriptionPurchase(cryptoCharge: any, coinbaseCharge: any) {
  // Calculate subscription expiry
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + cryptoCharge.duration_days);

  // Determine features based on tier
  const isBasic = cryptoCharge.tier_id.includes('basic');
  const features = {
    nsfw_enabled: !isBasic,
    voice_enabled: !isBasic,
    priority_enabled: !isBasic
  };

  // Create active subscription
  const { data: subscription, error: subError } = await supabase
    .from('crypto_subscriptions')
    .upsert({
      user_id: cryptoCharge.user_id,
      character_key: cryptoCharge.character_key,
      tier_id: cryptoCharge.tier_id,
      tier_name: cryptoCharge.tier_name,
      crypto_charge_id: cryptoCharge.id,
      coinbase_charge_id: cryptoCharge.coinbase_charge_id,
      started_at: startDate.toISOString(),
      expires_at: endDate.toISOString(),
      status: 'active',
      ...features,
      metadata: {
        payment_confirmed_at: new Date().toISOString(),
        coinbase_timeline: coinbaseCharge.timeline,
        pricing: {
          usd_amount: cryptoCharge.usd_amount,
          crypto_discount: cryptoCharge.metadata?.crypto_discount
        }
      }
    })
    .select()
    .single();

  if (subError) {
    console.error('❌ Failed to create subscription:', subError);
    throw new Error('Failed to create subscription');
  }

  console.log('✅ Subscription created:', subscription.id);
}

async function handleVoicePackPurchase(cryptoCharge: any, coinbaseCharge: any, quantity: number) {
  // Add voice credits to user's account
  const { data: currentCredits } = await supabase
    .from('user_voice_credits')
    .select('credits')
    .eq('user_id', cryptoCharge.user_id)
    .eq('character_key', cryptoCharge.character_key)
    .single();

  const newCreditTotal = (currentCredits?.credits || 0) + quantity;

  const { error: creditsError } = await supabase
    .from('user_voice_credits')
    .upsert({
      user_id: cryptoCharge.user_id,
      character_key: cryptoCharge.character_key,
      credits: newCreditTotal,
      updated_at: new Date().toISOString(),
      metadata: {
        last_purchase: {
          amount: quantity,
          purchase_date: new Date().toISOString(),
          crypto_charge_id: cryptoCharge.id,
          usd_amount: cryptoCharge.usd_amount
        }
      }
    });

  if (creditsError) {
    console.error('❌ Failed to add voice credits:', creditsError);
    throw new Error('Failed to add voice credits');
  }

  console.log('✅ Voice credits added:', { quantity, newTotal: newCreditTotal });
}

async function handleTipPurchase(cryptoCharge: any, coinbaseCharge: any, tipAmount: number) {
  // Record the tip
  const { error: tipError } = await supabase
    .from('crypto_tips')
    .insert({
      user_id: cryptoCharge.user_id,
      character_key: cryptoCharge.character_key,
      amount_usd: tipAmount,
      crypto_charge_id: cryptoCharge.id,
      coinbase_charge_id: cryptoCharge.coinbase_charge_id,
      created_at: new Date().toISOString(),
      metadata: {
        payment_confirmed_at: new Date().toISOString(),
        coinbase_timeline: coinbaseCharge.timeline,
        pricing: {
          usd_amount: cryptoCharge.usd_amount,
          crypto_discount: cryptoCharge.metadata?.crypto_discount
        }
      }
    });

  if (tipError) {
    console.error('❌ Failed to record tip:', tipError);
    throw new Error('Failed to record tip');
  }

  // Update relationship score (boost based on tip amount)
  const relationshipBoost = tipAmount >= 25 ? 0.15 : tipAmount >= 10 ? 0.10 : 0.05;

  const { error: relationshipError } = await supabase.rpc('boost_relationship_score', {
    user_id: cryptoCharge.user_id,
    character_key: cryptoCharge.character_key,
    boost_amount: relationshipBoost
  });

  if (relationshipError) {
    console.error('❌ Failed to boost relationship:', relationshipError);
    // Don't throw - tip was recorded successfully
  }

  console.log('✅ Tip recorded:', { amount: tipAmount, boost: relationshipBoost });
}

async function handleChargeFailed(cryptoCharge: any, coinbaseCharge: any) {
  try {
    console.log('💸 Payment failed:', {
      chargeId: cryptoCharge.id,
      userId: cryptoCharge.user_id.substring(0, 8) + '...'
    });

    await updateChargeStatus(cryptoCharge.id, 'failed');

    // TODO: Send failure notification email
    // TODO: Track analytics event

  } catch (error) {
    console.error('❌ Failed to handle charge failure:', error);
    throw error;
  }
}

async function updateChargeStatus(chargeId: string, status: string, confirmedAt?: Date) {
  const updateData: any = { status };
  if (confirmedAt) {
    updateData.confirmed_at = confirmedAt.toISOString();
  }

  const { error } = await supabase
    .from('crypto_charges')
    .update(updateData)
    .eq('id', chargeId);

  if (error) {
    console.error('❌ Failed to update charge status:', error);
    throw error;
  }

  console.log('📝 Updated charge status:', { chargeId, status });
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) {
    console.error('❌ No webhook signature provided');
    return false;
  }

  const webhookSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ No webhook secret configured');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );

    if (!isValid) {
      console.error('❌ Webhook signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
}