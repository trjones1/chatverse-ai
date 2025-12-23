// app/api/checkout/sync/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCharacterGender } from '@/lib/character-gender';
const sb = getSupabaseAdmin();
export const dynamic = 'force-dynamic';

// --- Stripe ---
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string;
if (!STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY');

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Dynamic price mapping based on character gender
function getPriceMap(characterKey: string): Record<string, string> {
  const gender = getCharacterGender(characterKey);
  const prefix = gender === 'male' ? 'M_STRIPE_PRICE' : 'F_STRIPE_PRICE';
  
  return {
    sub_sfw: process.env[`${prefix}_SFW`] || '',
    sub_nsfw: process.env[`${prefix}_NSFW`] || '',
    voice_pack_10: process.env[`${prefix}_VOICE_10`] || '',
    voice_pack_25: process.env[`${prefix}_VOICE_25`] || '',
    voice_pack_50: process.env[`${prefix}_VOICE_50`] || '',
    voice_pack_100: process.env[`${prefix}_VOICE_100`] || '',
  };
}

// --- Supabase (server/admin) ---

type Ok = { ok: true; customerEmail: string | null; character?: string };
type Err = { ok: false; error: string };
type Json = Ok | Err;

export async function GET(req: Request) { return handleSync(req); }
export async function POST(req: Request) { return handleSync(req); }

async function handleSync(req: Request) {
  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    let sessionId: string | null = null;
    let character: string | undefined;

    if (method === 'GET') {
      sessionId = url.searchParams.get('session_id');
      character = url.searchParams.get('character') || undefined;
    } else {
      const body = await safeJson(req);
      sessionId = body?.session_id ?? null;
      character = body?.character ?? undefined;
    }

    if (!sessionId) {
      return NextResponse.json<Json>({ ok: false, error: 'Missing session_id' }, { status: 400 });
    }

    // 1) Retrieve the Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription', 'line_items.data.price'],
    });

    // 2) Extract buyer email
    let customerEmail: string | null =
      (session.customer_details?.email as string | null | undefined) ??
      ((typeof session.customer !== 'string' && session.customer && 'email' in session.customer)
        ? ((session.customer as Stripe.Customer).email ?? null)
        : null) ??
      (session.customer_email as string | null) ??
      null;

    if (!customerEmail && typeof session.customer === 'string') {
      const cust = await stripe.customers.retrieve(session.customer);
      if (!('deleted' in cust)) {
        customerEmail = cust.email ?? null;
      }
    }

    // 3) IDs we use in DB
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? '';

    const subscriptionId =
      (typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id) ?? null;

    // derive tier from session metadata and price ID
    const li = (session as any).line_items?.data?.[0];
    const priceId = li?.price?.id || null;
    
    const characterKey = character || 'lexi';
    const PRICE = getPriceMap(characterKey);
    
    // First try session metadata (set during checkout)
    let tier = session.metadata?.tier || null;
    
    // If no metadata tier, derive from price ID
    if (!tier && priceId) {
      if (priceId === PRICE.sub_nsfw) {
        tier = 'nsfw';
      } else if (priceId === PRICE.sub_sfw) {
        tier = 'sfw';
      } else if ([
        PRICE.voice_pack_10,
        PRICE.voice_pack_25,
        PRICE.voice_pack_50,
        PRICE.voice_pack_100
      ].includes(priceId)) {
        tier = 'voice';
      }
    }
    
    // Final fallback
    if (!tier) {
      tier = 'unknown';
    }
    
    console.log('[sync] Tier detection:', {
      sessionTier: session.metadata?.tier,
      priceId,
      finalTier: tier,
      characterKey,
      priceMapping: PRICE
    });

    // 4) Link to user account and upsert into user_subscriptions (entitlements)
    if (customerId) {
      // First, try to find the user ID from stripe_customers mapping
      let userId: string | null = null;
      
      const { data: customerMapping } = await sb
        .from('stripe_customers')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      
      userId = customerMapping?.user_id || null;
      
      console.log('[sync] Customer mapping found:', { customerId, userId, customerEmail });
      
      await sb.from('user_subscriptions').upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          character_key: characterKey,
          price_id: priceId,
          tier,
          status: 'active',
          stripe_subscription_id: subscriptionId,
        },
        { onConflict: 'stripe_customer_id,character_key' }
      );
      
      console.log('[sync] Subscription created/updated:', { userId, tier, characterKey });
    }

    // 5) Response with email
    const res = NextResponse.json<Json>({ ok: true, customerEmail, character: characterKey });

    // Set scid cookie (1 year)
    // Use VERCEL_ENV or fallback to check if we're on localhost
    const isSecure = process.env.VERCEL_ENV === 'production' || 
                     (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production') ||
                     (typeof window === 'undefined' && process.env.NEXT_PUBLIC_SITE_URL?.includes('https://'));
    
    if (customerId) {
      res.cookies.set('scid', customerId, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
      console.log('[sync] set scid for', customerId, 'tier', tier);
    }

    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err: any) {
    console.error('[checkout/sync] error:', err);
    return NextResponse.json<Json>(
      { ok: false, error: err?.message ?? 'Sync failed' },
      { status: 500 }
    );
  }
}

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}
