// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';
import { protectPaymentEndpoint } from '@/lib/payment-rate-limiting';
import { getCharacterGender } from '@/lib/character-gender';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Use character-specific price mapping 
function getPriceMap(characterKey: string): Record<string, string> {
  // Character-specific SFW pricing
  const getSfwPrice = () => {
    if (characterKey === 'lexi') return process.env.LEXI_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'nyx') return process.env.NYX_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'dom') return process.env.DOM_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'aiko') return process.env.AIKO_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'chase') return process.env.CHASE_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'zaria') return process.env.ZARIA_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'chloe') return process.env.CHLOE_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'nova') return process.env.NOVA_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'ethan') return process.env.ETHAN_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'jayden') return process.env.JAYDEN_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    if (characterKey === 'miles') return process.env.MILES_STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_SFW || '';
    return process.env.STRIPE_PRICE_SFW || '';
  };
  
  // Character-specific NSFW pricing
  const getNsfwPrice = () => {
    if (characterKey === 'lexi') return process.env.LEXI_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'nyx') return process.env.NYX_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'dom') return process.env.DOM_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'aiko') return process.env.AIKO_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'chase') return process.env.CHASE_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'zaria') return process.env.ZARIA_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'chloe') return process.env.CHLOE_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'nova') return process.env.NOVA_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'ethan') return process.env.ETHAN_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'jayden') return process.env.JAYDEN_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    if (characterKey === 'miles') return process.env.MILES_STRIPE_PRICE_NSFW_PREMIUM || process.env.STRIPE_PRICE_NSFW || '';
    return process.env.STRIPE_PRICE_NSFW || '';
  };
  
  return {
    sub_sfw: getSfwPrice(),
    sub_nsfw: getNsfwPrice(),
    voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || '',
    voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || '',
    voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || '',
    voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || '',
  };
}

async function getOrCreateStripeCustomer(user: { id: string; email: string | null }) {
  const supabase = await makeServerSupabase();
  // try to find an existing mapping
  const { data: existing, error } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!error && existing?.stripe_customer_id) {
    return existing.stripe_customer_id as string;
  }

  // else, create a customer and persist
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: { user_id: user.id },
  });

  await supabase.from('stripe_customers').insert({
    user_id: user.id,
    stripe_customer_id: customer.id,
  });

  return customer.id;
}

export async function POST(req: NextRequest) {
  try {
    // Apply payment-specific rate limiting with fraud detection
    const rateLimitResponse = await protectPaymentEndpoint(req, 'checkout', true);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await req.json().catch(() => ({} as any));
    const { tier, character_key } = body as { 
      tier?: 'sub_sfw' | 'sub_nsfw' | 'voice_pack_10' | 'voice_pack_25' | 'voice_pack_50' | 'voice_pack_100';
      character_key?: string;
    };

    console.log('💳 Checkout API: Request received (rate limited)', { tier, character_key, hasBody: !!body, bodyKeys: Object.keys(body || {}) });
    
    // Determine character from request or environment
    const characterKey = character_key || 
      (process.env.NEXT_PUBLIC_CHARACTER_KEY ?? process.env.CHARACTER_KEY) || 
      'lexi';
      
    // Get gender-specific price map
    const PRICE_MAP = getPriceMap(characterKey);
    
    if (!tier || !PRICE_MAP[tier]) {
      console.log('🔐 Checkout API: Invalid tier', { tier, characterKey, availableTiers: Object.keys(PRICE_MAP), priceMap: PRICE_MAP });
      return NextResponse.json({ 
        error: 'Invalid or missing tier',
        availableTiers: Object.keys(PRICE_MAP),
        receivedTier: tier,
        characterKey: characterKey
      }, { status: 400 });
    }

    // Check if the price ID is actually set
    if (!PRICE_MAP[tier]) {
      const gender = getCharacterGender(characterKey);
      const prefix = gender === 'male' ? 'M_STRIPE_PRICE' : 'F_STRIPE_PRICE';
      console.log('🔐 Checkout API: Missing price ID for tier', { tier, characterKey, gender, prefix, priceId: PRICE_MAP[tier] });
      return NextResponse.json({ 
        error: `Missing Stripe price ID for tier: ${tier}`,
        hint: `Check environment variable: ${prefix}_${tier.toUpperCase().replace('_PACK', '')}`,
        characterKey,
        gender
      }, { status: 500 });
    }

    // Require authentication for all purchases
    const authResult = await authenticateRequest(req, { requireAuth: true });
    const { user, userId, isAuthenticated } = authResult;
    
    console.log('🔐 Checkout API: Auth check results', {
      hasUser: !!user,
      userId: userId,
      isAuthenticated: isAuthenticated,
      userEmail: user?.email,
      authHeader: req.headers.get('authorization') ? 'present' : 'missing'
    });
    
    if (!isAuthenticated || !user) {
      console.log('🔐 Checkout API: Authentication required');
      return createAuthRequiredResponse();
    }

    console.log('🔐 Checkout API: User authenticated', { userId: user.id, email: user.email, characterKey, gender: getCharacterGender(characterKey) });
    
    // Get or create stripe customer for authenticated user
    const customerId = await getOrCreateStripeCustomer({ id: user.id, email: user.email ?? null });
    
    // Use the current request origin for success/cancel URLs to preserve character domain
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || SITE_URL;
    
    console.log('🔐 Checkout API: URL determination', {
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
      finalOrigin: origin,
      successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&character=${characterKey}`
    });
    
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: tier.includes('voice') ? 'payment' :'subscription',
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      line_items: [{ price: PRICE_MAP[tier], quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&character=${characterKey}`,
      cancel_url: `${origin}/chat`,
      client_reference_id: user.id, // Always set for authenticated users
      customer: customerId, // Always use mapped stripe customer
      metadata: {
        character_key: characterKey,
        tier,
      },
    };

    const sessionCreated = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ 
      id: sessionCreated.id, 
      url: sessionCreated.url,
      fallbackMessage: 'If payment window does not open, please disable content blockers and try again.'
    });
  } catch (err: any) {
    console.error('[Checkout] error', err);
    
    // Enhanced error handling for common Stripe issues
    let errorMessage = err.message ?? 'Checkout failed';
    let statusCode = 500;
    
    if (err.type === 'StripeCardError') {
      errorMessage = 'Payment failed. Please check your card details.';
      statusCode = 400;
    } else if (err.type === 'StripeRateLimitError') {
      errorMessage = 'Too many requests. Please try again later.';
      statusCode = 429;
    } else if (err.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment request. Please try again.';
      statusCode = 400;
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMessage = 'Payment service unavailable. Please disable content blockers and try again.';
      statusCode = 503;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      troubleshooting: 'If this error persists, try disabling browser extensions and content blockers.'
    }, { status: statusCode });
  }
}
