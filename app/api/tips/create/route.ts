// app/api/tips/create/route.ts
// Create a new tip payment intent

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { getCharacterConfig } from '@/lib/characters.config';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';
import Stripe from 'stripe';

const admin = getSupabaseAdmin();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
    // Use unified authentication pattern
    const authResult = await authenticateRequest(req, { requireAuth: true });
    const { user, userId, isAuthenticated } = authResult;
    
    if (!isAuthenticated || !user) {
      return createAuthRequiredResponse();
    }

    const body = await req.json();
    const { 
      characterKey, 
      amount, // amount in dollars
      message = ''
    } = body;

    // Validation
    if (!characterKey || !amount) {
      return NextResponse.json({ error: 'Character and amount are required' }, { status: 400 });
    }

    if (amount < 1 || amount > 500) {
      return NextResponse.json({ error: 'Tip amount must be between $1 and $500' }, { status: 400 });
    }

    if (message && message.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400 });
    }

    // Get character config to validate character exists
    const host = req.headers.get('host') || 'chatwithlexi.com';
    const config = getCharacterConfig(host);
    
    // For now, just validate that the character key is valid
    const validCharacters = ['lexi', 'nyx', 'chloe', 'aiko', 'zaria', 'nova', 'dom', 'chase', 'ethan', 'jayden', 'miles'];
    if (!validCharacters.includes(characterKey.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid character' }, { status: 400 });
    }

    const amountCents = Math.round(amount * 100);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        user_id: user.id,
        character_key: characterKey.toLowerCase(),
        tip_message: message || ''
      },
      description: `Tip for ${characterKey}${message ? `: ${message.substring(0, 100)}` : ''}`,
    });

    // Store tip in database - use admin client for data operations
    const { data: tip, error: tipError } = await admin
      .from('tips')
      .insert({
        user_id: user.id,
        character_key: characterKey.toLowerCase(),
        amount_cents: amountCents,
        message: message || null,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending'
      })
      .select()
      .single();

    if (tipError) {
      console.error('Tip creation error:', tipError);
      return NextResponse.json({ error: 'Failed to create tip' }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      tipId: tip.id,
      amount: amount,
      characterKey: characterKey.toLowerCase()
    });

  } catch (error) {
    console.error('Tip creation error:', error);
    return NextResponse.json({ error: 'Failed to create tip' }, { status: 500 });
  }
}