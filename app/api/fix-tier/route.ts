// app/api/fix-tier/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCharacterGender } from '@/lib/character-gender';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const admin = getSupabaseAdmin();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Dynamic price mapping based on character gender
function getPriceMap(characterKey: string): Record<string, string> {
  const gender = getCharacterGender(characterKey);
  const prefix = gender === 'male' ? 'M_STRIPE_PRICE' : 'F_STRIPE_PRICE';
  
  return {
    sub_sfw: process.env[`${prefix}_SFW`] || '',
    sub_nsfw: process.env[`${prefix}_NSFW`] || '',
  };
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await makeServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('[fix-tier] Fixing tier for user:', user.email);

    // Get character key and the user's subscription with Stripe customer ID
    const characterKey = 'lexi'; // Could be made dynamic based on request
    const { data: sub } = await admin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('character_key', characterKey)
      .maybeSingle();

    if (!sub || !sub.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    console.log('[fix-tier] Found subscription:', { 
      id: sub.id, 
      currentTier: sub.tier,
      customerId: sub.stripe_customer_id 
    });

    // Get recent successful payment sessions for this customer
    const sessions = await stripe.checkout.sessions.list({
      customer: sub.stripe_customer_id,
      status: 'complete',
      limit: 10,
    });

    console.log('[fix-tier] Found', sessions.data.length, 'completed sessions');

    // Find the most recent session with metadata
    let correctTier = null;
    for (const session of sessions.data) {
      if (session.metadata?.tier && session.metadata.tier !== 'unknown') {
        correctTier = session.metadata.tier;
        console.log('[fix-tier] Found tier from session metadata:', correctTier);
        break;
      }
    }

    // If no metadata, try to derive from the most recent session's line items
    if (!correctTier && sessions.data.length > 0) {
      const session = sessions.data[0];
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price'],
      });
      
      const priceId = (expandedSession as any).line_items?.data?.[0]?.price?.id;
      const PRICE = getPriceMap(characterKey);
      
      if (priceId === PRICE.sub_nsfw) {
        correctTier = 'nsfw';
      } else if (priceId === PRICE.sub_sfw) {
        correctTier = 'sfw';
      }
      
      console.log('[fix-tier] Derived tier from price ID:', { priceId, correctTier, characterKey });
    }

    if (!correctTier) {
      return NextResponse.json({ 
        error: 'Could not determine correct tier from payment history' 
      }, { status: 400 });
    }

    // Update the subscription with the correct tier
    const { error: updateError } = await admin
      .from('user_subscriptions')
      .update({ 
        tier: correctTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.id);

    if (updateError) {
      console.error('[fix-tier] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
    }

    console.log('[fix-tier] Successfully updated tier:', { 
      oldTier: sub.tier, 
      newTier: correctTier 
    });

    return NextResponse.json({ 
      success: true, 
      oldTier: sub.tier,
      newTier: correctTier,
      message: `Tier updated from ${sub.tier} to ${correctTier}`
    });

  } catch (error: any) {
    console.error('[fix-tier] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fix tier' 
    }, { status: 500 });
  }
}