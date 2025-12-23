import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCharacterCurrency } from '@/lib/verseCoins';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get character context from query params
    const url = new URL(request.url);
    const characterKey = url.searchParams.get('character') || 'default';

    // Get user balance
    const adminSupabase = getSupabaseAdmin();
    const { data: userCoins, error } = await adminSupabase
      .from('user_versecoins')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get active subscription for this character
    const { data: activeSubscription, error: subError } = await adminSupabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('character_key', characterKey)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .single();

    const credits = userCoins?.credits || 0;
    const totalEarned = userCoins?.total_earned || 0;
    const totalSpent = userCoins?.total_spent || 0;

    // Get character-themed currency display
    const characterCurrency = getCharacterCurrency(credits, characterKey);

    return NextResponse.json({
      success: true,
      user_id: user.id,
      credits,
      total_earned: totalEarned,
      total_spent: totalSpent,
      character_display: characterCurrency,
      last_updated: userCoins?.updated_at || null,
      subscription: activeSubscription ? {
        id: activeSubscription.id,
        tier: activeSubscription.tier,
        tier_name: activeSubscription.features?.tier_name ||
                  (activeSubscription.tier === 'nsfw' ? 'Premium+ All Access Pass' : 'Premium Pass'),
        status: activeSubscription.status,
        current_period_end: activeSubscription.current_period_end,
        started_at: activeSubscription.started_at
      } : null
    });

  } catch (error) {
    console.error('❌ Error fetching VerseCoins balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}