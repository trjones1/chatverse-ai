import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import Stripe from 'stripe';

const supabase = getSupabaseAdmin();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    // Check if user is admin (basic auth check)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== 'Bearer dev') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all pending tips
    const { data: pendingTips, error } = await supabase
      .from('tips')
      .select('*')
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch pending tips' }, { status: 500 });
    }

    console.log(`Found ${pendingTips?.length || 0} pending tips`);

    const results = [];

    for (const tip of pendingTips || []) {
      try {
        // Check the payment intent status in Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(tip.stripe_payment_intent_id);
        
        console.log(`Payment Intent ${tip.stripe_payment_intent_id}: ${paymentIntent.status}`);
        
        let newStatus = tip.status;
        if (paymentIntent.status === 'succeeded') {
          newStatus = 'completed';
        } else if (paymentIntent.status === 'canceled') {
          newStatus = 'failed';
        }

        if (newStatus !== tip.status) {
          // Update the tip status
          const { error: updateError } = await supabase
            .from('tips')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', tip.id);

          if (updateError) {
            console.error(`Failed to update tip ${tip.id}:`, updateError);
            results.push({
              tipId: tip.id,
              paymentIntentId: tip.stripe_payment_intent_id,
              stripeStatus: paymentIntent.status,
              updated: false,
              error: updateError.message
            });
          } else {
            console.log(`Updated tip ${tip.id} from ${tip.status} to ${newStatus}`);
            results.push({
              tipId: tip.id,
              paymentIntentId: tip.stripe_payment_intent_id,
              stripeStatus: paymentIntent.status,
              oldStatus: tip.status,
              newStatus: newStatus,
              updated: true
            });
          }
        } else {
          results.push({
            tipId: tip.id,
            paymentIntentId: tip.stripe_payment_intent_id,
            stripeStatus: paymentIntent.status,
            currentStatus: tip.status,
            updated: false,
            reason: 'Status already correct'
          });
        }
      } catch (stripeError) {
        console.error(`Failed to check Stripe status for tip ${tip.id}:`, stripeError);
        results.push({
          tipId: tip.id,
          paymentIntentId: tip.stripe_payment_intent_id,
          updated: false,
          error: 'Failed to check Stripe status'
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalPendingTips: pendingTips?.length || 0,
      results
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}