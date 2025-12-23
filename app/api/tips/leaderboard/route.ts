// app/api/tips/leaderboard/route.ts
// Get monthly tip leaderboard for a specific character
// Each character has their own independent leaderboard showing only tips sent to that character

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdmin();

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const characterKey = searchParams.get('character') || 'lexi';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate parameters
    if (limit > 50) {
      return NextResponse.json({ error: 'Limit cannot exceed 50' }, { status: 400 });
    }

    const validCharacters = ['lexi', 'nyx', 'chloe', 'aiko', 'zaria', 'nova', 'dom', 'chase', 'ethan', 'jayden', 'miles'];
    if (!validCharacters.includes(characterKey.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid character' }, { status: 400 });
    }

    // Get leaderboard data
    const { data: leaderboard, error } = await supabase.rpc('get_monthly_leaderboard', {
      p_character_key: characterKey.toLowerCase(),
      p_year: year,
      p_month: month,
      p_limit: limit
    });

    if (error) {
      console.error('Leaderboard query error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Format the response - keep as VerseCoins (cents) since 1 VerseCoins = 1 cent
    const formattedLeaderboard = leaderboard?.map((entry: any) => ({
      rank: entry.rank,
      displayName: entry.display_name,
      totalAmount: entry.total_amount_cents, // Keep as VerseCoins
      tipCount: entry.tip_count
    })) || [];

    return NextResponse.json({
      characterKey: characterKey.toLowerCase(),
      year,
      month,
      leaderboard: formattedLeaderboard
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

// Also allow POST for authenticated users to get their position
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Use unified authentication from lib/auth-headers
    const { authenticateRequest } = await import('@/lib/auth-headers');
    const authResult = await authenticateRequest(req, { debug: false });
    const { user, isAuthenticated } = authResult;

    const body = await req.json();
    const { 
      characterKey = 'lexi',
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1
    } = body;

    // Get public leaderboard
    console.log('🔍 LEADERBOARD API: Calling database function with params:', {
      p_character_key: characterKey.toLowerCase(),
      p_year: year,
      p_month: month,
      p_limit: 10
    });

    const { data: leaderboard, error: leaderboardError } = await supabase.rpc('get_monthly_leaderboard', {
      p_character_key: characterKey.toLowerCase(),
      p_year: year,
      p_month: month,
      p_limit: 10
    });

    console.log('📦 LEADERBOARD API: Database function returned:', {
      leaderboard,
      error: leaderboardError
    });

    if (leaderboardError) {
      console.error('Leaderboard query error:', leaderboardError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    let userPosition = null;

    // Get user's position if authenticated
    if (user && isAuthenticated) {
      const { data: position, error: positionError } = await supabase.rpc('get_user_leaderboard_position', {
        p_user_id: user.id,
        p_character_key: characterKey.toLowerCase(),
        p_year: year,
        p_month: month
      });

      if (!positionError && position && position.length > 0) {
        userPosition = {
          rank: position[0].rank,
          totalAmount: position[0].total_amount_cents, // Keep as VerseCoins
          tipCount: position[0].tip_count
        };
      }
    }

    // Format the response - keep as VerseCoins (cents) since 1 VerseCoins = 1 cent
    const formattedLeaderboard = leaderboard?.map((entry: any) => ({
      rank: entry.rank,
      displayName: entry.display_name,
      totalAmount: entry.total_amount_cents, // Keep as VerseCoins
      tipCount: entry.tip_count
    })) || [];

    return NextResponse.json({
      characterKey: characterKey.toLowerCase(),
      year,
      month,
      leaderboard: formattedLeaderboard,
      userPosition
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}