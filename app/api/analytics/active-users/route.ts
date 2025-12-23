// app/api/analytics/active-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET - Get current active users and peak stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Get peak concurrent stats
    const { data: peakStats, error: peakError } = await supabase
      .rpc('get_peak_concurrent_stats');

    if (peakError) {
      console.error('Error fetching peak stats:', peakError);
      throw peakError;
    }

    // Get current active breakdown
    const { data: currentStats, error: currentError } = await supabase
      .rpc('get_current_active_users');

    if (currentError) {
      console.error('Error fetching current stats:', currentError);
      throw currentError;
    }

    const stats = peakStats?.[0] || {
      current_active: 0,
      peak_today: 0,
      peak_this_week: 0,
      peak_all_time: 0,
      peak_today_time: null,
      peak_week_time: null,
      peak_all_time_time: null
    };

    const current = currentStats?.[0] || {
      total_active: 0,
      authenticated: 0,
      anonymous: 0,
      by_character: {}
    };

    // Record a snapshot on every GET to ensure peaks are captured
    const { error: snapshotError } = await supabase.rpc('record_concurrent_users_snapshot');
    if (snapshotError) {
      console.error('Error recording snapshot on GET:', snapshotError);
      // Don't fail the request if snapshot fails
    }

    return NextResponse.json({
      success: true,
      data: {
        current: {
          total: current.total_active,
          authenticated: current.authenticated,
          anonymous: current.anonymous,
          byCharacter: current.by_character
        },
        peaks: {
          today: {
            count: stats.peak_today,
            time: stats.peak_today_time
          },
          thisWeek: {
            count: stats.peak_this_week,
            time: stats.peak_week_time
          },
          allTime: {
            count: stats.peak_all_time,
            time: stats.peak_all_time_time
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in active-users API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch active users'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Record session heartbeat
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, anonymousId, characterKey, pagePath } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Upsert active session
    const { error: upsertError } = await supabase
      .from('active_sessions')
      .upsert({
        session_id: sessionId,
        user_id: userId || null,
        anonymous_id: anonymousId || null,
        character_key: characterKey || null,
        page_path: pagePath || '/',
        user_agent: userAgent,
        last_heartbeat: new Date().toISOString(),
      }, {
        onConflict: 'session_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error upserting session:', upsertError);
      throw upsertError;
    }

    // Record snapshot on 50% of heartbeats to ensure peaks are captured
    const shouldRecordSnapshot = Math.random() < 0.5;
    if (shouldRecordSnapshot) {
      const { error: snapshotError } = await supabase.rpc('record_concurrent_users_snapshot');
      if (snapshotError) {
        console.error('Error recording snapshot:', snapshotError);
        // Don't fail the heartbeat if snapshot fails
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error recording heartbeat:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record heartbeat'
      },
      { status: 500 }
    );
  }
}
