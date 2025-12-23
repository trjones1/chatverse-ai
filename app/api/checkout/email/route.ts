import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id');
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

  const session = await stripe.checkout.sessions.retrieve(session_id);
  const email = session.customer_details?.email || (session.customer as any)?.email || null;

  return NextResponse.json({ email });
}
