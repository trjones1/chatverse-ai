// API route to create Coinbase Commerce charges for crypto payments
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { coinbaseCommerce } from '@/lib/coinbaseCommerce';
import { getCryptoPricingTier } from '@/lib/cryptoPricing';

const supabase = getSupabaseAdmin();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, characterKey, tierId, userEmail } = body;

    console.log('🚀 Creating crypto charge request:', {
      userId: userId?.substring(0, 8) + '...',
      character: characterKey,
      tier: tierId
    });

    // Validate required fields
    if (!userId || !characterKey || !tierId) {
      return NextResponse.json({
        error: 'Missing required fields: userId, characterKey, tierId'
      }, { status: 400 });
    }

    // Get pricing tier information
    const tier = getCryptoPricingTier(tierId);
    if (!tier) {
      return NextResponse.json({
        error: 'Invalid pricing tier'
      }, { status: 400 });
    }

    // Verify user exists in auth
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      return NextResponse.json({
        error: 'Invalid user'
      }, { status: 400 });
    }

    // Check for existing active subscription only for subscription tiers
    if (tier.type === 'subscription') {
      const { data: existingSubscription } = await supabase
        .from('crypto_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('character_key', characterKey)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingSubscription) {
        return NextResponse.json({
          error: 'User already has an active subscription for this character',
          subscription: existingSubscription
        }, { status: 409 });
      }
    }

    // Create Coinbase Commerce charge
    const charge = await coinbaseCommerce.createCharge(
      userId,
      characterKey,
      tier,
      userEmail || user.user?.email
    );

    // Calculate expiry time (charges are valid for 1 hour by default)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store charge in database
    const { data: cryptoCharge, error: chargeError } = await supabase
      .from('crypto_charges')
      .insert({
        coinbase_charge_id: charge.id,
        coinbase_code: charge.code,
        hosted_url: charge.hosted_url,
        user_id: userId,
        character_key: characterKey,
        tier_id: tier.id,
        tier_name: tier.name,
        usd_amount: tier.price,
        duration_days: tier.durationDays || null,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        metadata: {
          ...charge.metadata,
          tier_features: tier.features,
          crypto_discount: tier.cryptoDiscount,
          tier_type: tier.type,
          quantity: tier.quantity || null
        }
      })
      .select()
      .single();

    if (chargeError) {
      console.error('❌ Failed to store crypto charge:', chargeError);
      return NextResponse.json({
        error: 'Failed to create payment record'
      }, { status: 500 });
    }

    console.log('✅ Crypto charge created successfully:', {
      chargeId: charge.id,
      code: charge.code,
      dbId: cryptoCharge.id
    });

    return NextResponse.json({
      success: true,
      charge: {
        id: charge.id,
        code: charge.code,
        hosted_url: charge.hosted_url,
        tier: tier,
        user_id: userId,
        character_key: characterKey,
        expires_at: expiresAt.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Crypto charge creation error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}