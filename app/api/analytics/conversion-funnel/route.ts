// app/api/analytics/conversion-funnel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysBack = parseInt(searchParams.get('days_back') || '7');

    const supabase = getSupabaseAdmin();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // 1. Get total unique visitors (from page_views)
    const { data: visitorsData, error: visitorsError } = await supabase
      .from('page_views')
      .select('visitor_id', { count: 'exact', head: false })
      .gte('created_at', cutoffDate.toISOString());

    if (visitorsError) throw visitorsError;

    const uniqueVisitors = new Set(visitorsData?.map(v => v.visitor_id) || []).size;

    // 2. Get engaged users (sent at least one message)
    const { data: engagedData, error: engagedError } = await supabase
      .from('page_views')
      .select('visitor_id', { count: 'exact', head: false })
      .gte('created_at', cutoffDate.toISOString())
      .eq('engaged', true);

    if (engagedError) throw engagedError;

    const uniqueEngaged = new Set(engagedData?.map(v => v.visitor_id) || []).size;

    // 3. Get signups (new users created)
    const { count: signupsCount, error: signupsError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', cutoffDate.toISOString());

    if (signupsError) throw signupsError;

    // 4. Get purchases (from orders table)
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('orders')
      .select('user_id', { count: 'exact', head: false })
      .gte('created_at', cutoffDate.toISOString())
      .in('status', ['completed', 'active']);

    if (purchasesError) throw purchasesError;

    const uniquePurchasers = new Set(purchasesData?.map(p => p.user_id) || []).size;

    // Calculate rates
    const visitors = uniqueVisitors || 1; // Avoid division by zero
    const engaged = uniqueEngaged;
    const signups = signupsCount || 0;
    const purchases = uniquePurchasers;

    const engagementRate = (engaged / visitors) * 100;
    const signupRate = (signups / visitors) * 100;
    const purchaseRate = (purchases / visitors) * 100;
    const overallConversionRate = (purchases / visitors) * 100;

    return NextResponse.json({
      success: true,
      data: {
        visitors,
        engaged,
        signups,
        purchases,
        engagementRate,
        signupRate,
        purchaseRate,
        overallConversionRate,
      }
    });

  } catch (error) {
    console.error('Error in conversion-funnel API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversion funnel';
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
