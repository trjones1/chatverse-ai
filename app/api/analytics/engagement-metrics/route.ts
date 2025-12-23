// app/api/analytics/engagement-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('[EngagementMetrics] Starting request...');
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days_back') || '7');

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    console.log('[EngagementMetrics] Fetching message data from interaction_log...');
    // Get total messages and unique users who sent messages
    const { data: messageData, error: messageError } = await supabase
      .from('interaction_log')
      .select('user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user'); // Only count user messages, not assistant responses

    if (messageError) {
      console.error('[EngagementMetrics] Error fetching message data:', messageError);
      throw new Error(`Interaction log query failed: ${messageError.message}`);
    }

    console.log(`[EngagementMetrics] Found ${messageData?.length || 0} user messages`);

    // Calculate total messages
    const totalMessages = messageData?.length || 0;

    // Get unique users who sent messages (filter out null user_ids)
    const uniqueUsers = new Set(
      messageData?.filter(m => m.user_id).map(m => m.user_id) || []
    ).size;

    // Calculate average messages per user
    const avgMessagesPerUser = uniqueUsers > 0 ? totalMessages / uniqueUsers : 0;
    console.log(`[EngagementMetrics] Avg messages per user: ${avgMessagesPerUser}`);

    console.log('[EngagementMetrics] Fetching session data from page_views...');
    // Get session data for duration calculation using time_on_page_seconds
    const { data: sessionData, error: sessionError } = await supabase
      .from('page_views')
      .select('time_on_page_seconds')
      .gte('created_at', startDate.toISOString())
      .not('time_on_page_seconds', 'is', null);

    if (sessionError) {
      console.error('[EngagementMetrics] Error fetching session data:', sessionError);
      throw new Error(`Page views query failed: ${sessionError.message}`);
    }

    console.log(`[EngagementMetrics] Found ${sessionData?.length || 0} page views with time data`);

    // Calculate average session duration from time_on_page_seconds
    const totalSessions = sessionData?.length || 0;
    const totalDuration = sessionData?.reduce((sum, view) => {
      return sum + (view.time_on_page_seconds || 0);
    }, 0) || 0;

    const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Get return visitor rate (users with more than one page view on different days)
    const { data: userData, error: userError } = await supabase
      .from('page_views')
      .select('visitor_id, created_at')
      .gte('created_at', startDate.toISOString());

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw userError;
    }

    // Count unique days per visitor
    const visitorDays: Record<string, Set<string>> = {};
    userData?.forEach(view => {
      const dateOnly = new Date(view.created_at).toISOString().split('T')[0];
      if (!visitorDays[view.visitor_id]) {
        visitorDays[view.visitor_id] = new Set();
      }
      visitorDays[view.visitor_id].add(dateOnly);
    });

    const totalVisitors = Object.keys(visitorDays).length;
    const returningUsers = Object.values(visitorDays).filter(days => days.size > 1).length;
    const returnVisitorRate = totalVisitors > 0 ? (returningUsers / totalVisitors) * 100 : 0;

    console.log('[EngagementMetrics] Fetching anonymous message data...');
    // Get message limit hit rate (users who hit the anonymous message limit)
    // Anonymous users have limit of 5 messages
    // Query the anonymous_interactions table (not interaction_log)
    const { data: anonymousMessages, error: anonError } = await supabase
      .from('anonymous_interactions')
      .select('anonymous_id')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user'); // Only count user messages

    if (anonError) {
      console.error('[EngagementMetrics] Error fetching anonymous message data:', anonError);
      throw new Error(`Anonymous messages query failed: ${anonError.message}`);
    }

    console.log(`[EngagementMetrics] Found ${anonymousMessages?.length || 0} anonymous messages`);

    // Count messages per anonymous user
    const anonMessageCounts: Record<string, number> = {};
    anonymousMessages?.forEach(msg => {
      if (msg.anonymous_id) {
        anonMessageCounts[msg.anonymous_id] = (anonMessageCounts[msg.anonymous_id] || 0) + 1;
      }
    });

    const totalAnonUsers = Object.keys(anonMessageCounts).length;
    const limitHits = Object.values(anonMessageCounts).filter(count => count >= 5).length;
    const messageLimitHitRate = totalAnonUsers > 0 ? (limitHits / totalAnonUsers) * 100 : 0;

    console.log(`[EngagementMetrics] ${limitHits} out of ${totalAnonUsers} anonymous users hit message limit`);

    return NextResponse.json({
      success: true,
      data: {
        avgMessagesPerUser: Math.round(avgMessagesPerUser * 10) / 10,
        avgSessionDuration: Math.round(avgSessionDuration),
        returnVisitorRate: Math.round(returnVisitorRate * 10) / 10,
        messageLimitHitRate: Math.round(messageLimitHitRate * 10) / 10,
        totalMessages,
        totalSessions,
        returningUsers,
        limitHits,
      }
    });

  } catch (error) {
    console.error('Error in engagement-metrics API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch engagement metrics';
    const errorDetails = error instanceof Error ? error.stack : String(error);

    console.error('Detailed error:', {
      message: errorMessage,
      details: errorDetails,
      error
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
