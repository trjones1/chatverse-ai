// app/api/admin/user-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { authenticateRequest } from '@/lib/auth-headers';
import { isAdminUser } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await authenticateRequest(req, { requireAuth: true });
    const { user, isAuthenticated } = authResult;
    
    if (!isAuthenticated || !user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, character } = await req.json();
    
    if (!email || !character) {
      return NextResponse.json({ 
        error: 'Email and character are required' 
      }, { status: 400 });
    }

    const supabase = await makeServerSupabase(req);
    const adminSupabase = getSupabaseAdmin();
    
    // Get the session for API calls
    const { data: { session } } = await supabase.auth.getSession();

    // Get user by email using admin client
    const { data: users, error: userError } = await adminSupabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Admin listUsers error:', userError);
      return NextResponse.json({ 
        error: `Failed to fetch users: ${userError.message}` 
      }, { status: 500 });
    }

    const targetUser = users?.users?.find(u => u.email === email);
    
    if (!targetUser) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Get subscription status
    const { data: subscriptions } = await adminSupabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', targetUser.id)
      .eq('character_key', character);

    // Get voice credit balance
    const { data: voiceCredits } = await adminSupabase
      .from('voice_credits')
      .select('*')
      .eq('user_id', targetUser.id)
      .single();

    // Get relationship/emotional stats
    const { data: emotionalState } = await adminSupabase
      .from('emotional_states')
      .select('*')
      .eq('user_id', targetUser.id)
      .eq('character_key', character)
      .single();

    // Get entitlements from the entitlements API
    const entitlementsResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/entitlements?character=${character}`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token || ''}`,
        'X-User-ID': targetUser.id,
        'Content-Type': 'application/json'
      }
    });

    let entitlements = null;
    if (entitlementsResponse.ok) {
      entitlements = await entitlementsResponse.json();
    }

    // Get user activity
    const { data: recentActivity } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', targetUser.id)
      .eq('character_key', character)
      .order('created_at', { ascending: false })
      .limit(10);

    const userStatus = {
      user: {
        id: targetUser.id,
        email: targetUser.email,
        created_at: targetUser.created_at,
        last_sign_in_at: targetUser.last_sign_in_at
      },
      character: character,
      subscription: {
        active: subscriptions && subscriptions.length > 0,
        details: subscriptions?.[0] || null,
        tier: entitlements?.tier || 'free'
      },
      voiceCredits: {
        balance: voiceCredits?.balance || 0,
        total_earned: voiceCredits?.total_earned || 0,
        total_spent: voiceCredits?.total_spent || 0
      },
      relationship: {
        emotional_state: emotionalState?.current_state || null,
        relationship_score: emotionalState?.relationship_score || 0,
        total_conversations: emotionalState?.total_conversations || 0,
        last_interaction: emotionalState?.last_interaction || null
      },
      entitlements: entitlements,
      recentActivity: recentActivity || [],
      features: {
        hasPremium: entitlements?.tier === 'sfw' || entitlements?.tier === 'nsfw',
        hasNSFW: entitlements?.tier === 'nsfw',
        hasVoiceCredits: (voiceCredits?.balance || 0) > 0
      }
    };

    return NextResponse.json({
      success: true,
      data: userStatus
    });

  } catch (error) {
    console.error('User status check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}