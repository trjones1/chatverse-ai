import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { protectAdminEndpoint } from '@/lib/admin-rate-limiting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Apply admin rate limiting
    const rateLimitResponse = await protectAdminEndpoint(req, 'analytics');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check admin environment flag
    if (!process.env.ENABLE_ADMIN_TOOLS) {
      return NextResponse.json({ error: 'Admin tools not enabled' }, { status: 403 });
    }

    // Verify admin access
    const clientSupabase = await createClient();
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAdmin(user);

    // Use admin client for queries
    const admin = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const characterKey = searchParams.get('character') || null;
    const daysBack = parseInt(searchParams.get('days_back') || '7', 10);

    // Call the SQL function to get page view analytics
    const { data, error } = await admin.rpc('get_page_view_analytics', {
      p_character_key: characterKey,
      p_days_back: daysBack
    });

    if (error) {
      console.error('Error fetching page view analytics:', error);
      return NextResponse.json({ error: 'Failed to fetch page view analytics' }, { status: 500 });
    }

    // The function returns a single row with all metrics
    const analytics = data?.[0] || {
      total_page_views: 0,
      unique_visitors: 0,
      engaged_visitors: 0,
      true_bounce_rate: 0,
      avg_time_on_page: 0,
      authenticated_views: 0,
      anonymous_views: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        totalPageViews: analytics.total_page_views,
        uniqueVisitors: analytics.unique_visitors,
        engagedVisitors: analytics.engaged_visitors,
        trueBounceRate: parseFloat(analytics.true_bounce_rate || '0'),
        avgTimeOnPage: parseFloat(analytics.avg_time_on_page || '0'),
        authenticatedViews: analytics.authenticated_views,
        anonymousViews: analytics.anonymous_views,
        daysBack,
        characterKey
      }
    });

  } catch (error: any) {
    console.error('❌ Page view analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page view analytics', details: error.message },
      { status: 500 }
    );
  }
}
