import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCharacterGender } from '@/lib/character-gender';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Character-specific Premium+ pricing
function getCharacterPremiumPlusPrice(characterKey: string): string {
  // Use character-specific Premium+ price IDs
  const envKey = `${characterKey.toUpperCase()}_STRIPE_PRICE_NSFW_PREMIUM`;
  return process.env[envKey] || process.env.STRIPE_PRICE_NSFW || ''; // Fallback to legacy
}

export async function GET(req: NextRequest) {
  // Use current authentication system
  const authResult = await authenticateRequest(req, { requireAuth: true });
  const { user, isAuthenticated } = authResult;
  
  if (!isAuthenticated || !user) {
    return NextResponse.redirect(new URL('/dashboard?err=notauth', req.url));
  }

  try {
    // Get Stripe customer ID from user_subscriptions table
    const supabase = await makeServerSupabase();
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle();

    if (error || !subscription?.stripe_customer_id) {
      return NextResponse.redirect(new URL('/dashboard?err=nocustomer', req.url));
    }

    const subs = await stripe.subscriptions.list({ 
      customer: subscription.stripe_customer_id, 
      status: 'active', 
      limit: 1 
    });
    const sub = subs.data[0];
    if (!sub) return NextResponse.redirect(new URL('/dashboard?err=nosub', req.url));

    const characterKey = (process.env.NEXT_PUBLIC_CHARACTER_KEY ?? process.env.CHARACTER_KEY) || 'lexi';
    const premiumPlusPrice = getCharacterPremiumPlusPrice(characterKey);
    
    if (!premiumPlusPrice) {
      console.error('Missing Premium+ price for character:', characterKey);
      return NextResponse.redirect(new URL('/dashboard?err=noprice', req.url));
    }
    
    // Upgrade to character-specific Premium+ with automatic proration
    console.log('Upgrading subscription with proration:', {
      subscriptionId: sub.id,
      characterKey,
      newPrice: premiumPlusPrice,
      currentPrice: sub.items.data[0].price.id
    });
    
    await stripe.subscriptions.update(sub.id, {
      proration_behavior: 'always_invoice', // Automatically prorates: user pays only the difference
      items: [{ id: sub.items.data[0].id, price: premiumPlusPrice }],
      metadata: { 
        character_key: characterKey,
        upgraded_to: 'premium_plus',
        upgrade_timestamp: new Date().toISOString()
      },
    });

    return NextResponse.redirect(new URL('/dashboard?ok=upgraded', req.url));
  } catch (error) {
    console.error('Upgrade error:', error);
    return NextResponse.redirect(new URL('/dashboard?err=upgrade', req.url));
  }
}