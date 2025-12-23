import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { claimPendingPurchases } from '@/lib/gumroad';

export const dynamic = 'force-dynamic';

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * Claim pending Gumroad purchases by providing the purchase email
 * This is for users who bought with a different email than their account
 */
export async function POST(req: NextRequest) {
  // Create Supabase client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: () => {}, // Not setting cookies in this route
        remove: () => {},
      },
    }
  );

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json(401, { error: 'Unauthorized' });
  }

  try {
    const body = await req.json();
    const { gumroadEmail } = body;

    if (!gumroadEmail || typeof gumroadEmail !== 'string') {
      return json(400, { error: 'gumroadEmail is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(gumroadEmail)) {
      return json(400, { error: 'Invalid email format' });
    }

    // Claim purchases for this email
    const claimedCount = await claimPendingPurchases(user.id, gumroadEmail);

    if (claimedCount === 0) {
      return json(404, { error: 'No pending purchases found for that email' });
    }

    // Get updated balance to return to user
    const { getSupabaseAdmin } = await import('@/lib/supabaseAdmin');
    const admin = getSupabaseAdmin();

    const { data: userCoins } = await admin
      .from('user_versecoins')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    // Calculate total credits from claimed purchases
    const { data: transactions } = await admin
      .from('versecoins_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('reference_type', 'gumroad_sale')
      .contains('metadata', { auto_claimed: true, purchase_email: gumroadEmail.toLowerCase().trim() });

    const totalCredits = transactions?.reduce((sum, txn) => sum + txn.amount, 0) || 0;

    return json(200, {
      success: true,
      claimed: claimedCount,
      totalCredits,
      newBalance: userCoins?.credits || 0,
    });

  } catch (error) {
    console.error('[Claim Purchase] Error:', error);
    return json(500, { error: 'Failed to claim purchase' });
  }
}
