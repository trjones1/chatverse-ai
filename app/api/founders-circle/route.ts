// app/api/founders-circle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { makeServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Get founder status for current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(req.url);
    const character = url.searchParams.get('character');
    
    if (!character) {
      return NextResponse.json({ error: 'Character parameter required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    
    // Get user's founder status for this character
    const { data: founderStatus, error: founderError } = await admin
      .from('founders_circle')
      .select('founder_number, subscription_created_at, bonus_versecoins')
      .eq('user_id', user.id)
      .eq('character_key', character.toLowerCase())
      .single();

    if (founderError && founderError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking founder status:', founderError);
      return NextResponse.json({ error: 'Failed to check founder status' }, { status: 500 });
    }

    // Get general stats for this character
    const { data: stats, error: statsError } = await admin.rpc('get_founder_stats', {
      p_character_key: character.toLowerCase()
    });

    if (statsError) {
      console.error('Error getting founder stats:', statsError);
      return NextResponse.json({ error: 'Failed to get founder stats' }, { status: 500 });
    }

    return NextResponse.json({
      is_founder: !!founderStatus,
      founder_number: founderStatus?.founder_number || null,
      subscription_created_at: founderStatus?.subscription_created_at || null,
      bonus_versecoins: founderStatus?.bonus_versecoins || 500,
      character_stats: stats
    });

  } catch (error) {
    console.error('Founders Circle API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add user to founders circle (called during subscription creation)
export async function POST(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { character_key, subscription_data = {} } = body;
    
    if (!character_key) {
      return NextResponse.json({ error: 'Character key required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    
    // Try to add user as founder
    const { data: result, error } = await admin.rpc('add_founder_if_eligible', {
      p_user_id: user.id,
      p_character_key: character_key.toLowerCase(),
      p_subscription_data: subscription_data
    });

    if (error) {
      console.error('Error adding founder:', error);
      return NextResponse.json({ error: 'Failed to process founder status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      founder_info: result
    });

  } catch (error) {
    console.error('Founders Circle POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}