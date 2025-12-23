import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { amount, character, message } = await request.json();

    if (!amount || amount < 100) { // Minimum $1.00
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      metadata: {
        type: 'tip',
        character: character || 'general',
        message: message || '',
      },
      description: `Tip ${character ? `for ${character}` : 'for support'}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error('Tip API error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}