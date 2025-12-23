import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';

// Character mapping for domain-based character detection
const CHARACTER_MAP: Record<string, { key: string; displayName: string }> = {
  'chatwithlexi.com': { key: 'lexi', displayName: 'Lexi' },
  'talktonyx.com': { key: 'nyx', displayName: 'Nyx' },
  'chatwithchloe.com': { key: 'chloe', displayName: 'Chloe' },
  'waifuwithaiko.com': { key: 'aiko', displayName: 'Aiko' },
  'chatwithzaria.com': { key: 'zaria', displayName: 'Zaria' },
  'chatwithnova.com': { key: 'nova', displayName: 'Nova' },
  'sirdominic.com': { key: 'dom', displayName: 'Dominic' },
  'fuckboychase.com': { key: 'chase', displayName: 'Chase' },
  'chatwithethan.com': { key: 'ethan', displayName: 'Ethan' },
  'chatwithjayden.com': { key: 'jayden', displayName: 'Jayden' },
  'chatwithmiles.com': { key: 'miles', displayName: 'Miles' },
};

function getCharacterFromHostname(hostname: string): string {
  // Try exact hostname match
  if (CHARACTER_MAP[hostname]) {
    return CHARACTER_MAP[hostname].key;
  }
  
  // Try without www prefix
  const withoutWww = hostname.replace(/^www\./, '');
  if (CHARACTER_MAP[withoutWww]) {
    return CHARACTER_MAP[withoutWww].key;
  }
  
  // Default fallback to Lexi
  return 'lexi';
}

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  // Use current authentication system
  const authResult = await authenticateRequest(req, { requireAuth: true });
  const { user, isAuthenticated } = authResult;
  
  if (!isAuthenticated || !user) {
    return NextResponse.redirect(new URL('/dashboard?err=notauth', req.url));
  }

  try {
    // Get current character from the domain
    const hostname = req.headers.get('host') || '';
    const characterKey = getCharacterFromHostname(hostname);
    
    // Get Stripe customer ID for the current character's subscription
    const supabase = await makeServerSupabase();
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, character_key')
      .eq('user_id', user.id)
      .eq('character_key', characterKey)
      .eq('status', 'active')
      .not('stripe_customer_id', 'is', null)
      .maybeSingle();

    if (error || !subscription?.stripe_customer_id) {
      console.error('Portal error - no customer ID found:', { 
        error, 
        user: user.id, 
        character: characterKey, 
        hostname 
      });
      return NextResponse.redirect(new URL('/dashboard?err=nocustomer', req.url));
    }

    // Use the request origin for return URL to support all character domains
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://chatwithlexi.com';
    
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.redirect(session.url, 302);
  } catch (error) {
    console.error('Portal redirect error:', error);
    return NextResponse.redirect(new URL('/dashboard?err=portal', req.url));
  }
}