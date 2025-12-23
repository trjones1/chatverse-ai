// app/api/analytics/quick-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Get today's signups
    const { count: todaySignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    // Get yesterday's signups
    const { count: yesterdaySignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString());

    // Get today's purchases
    const { data: todayPurchases } = await supabase
      .from('orders')
      .select('user_id, total_amount_cents')
      .gte('created_at', todayStart.toISOString())
      .in('status', ['completed', 'active']);

    // Get yesterday's purchases
    const { data: yesterdayPurchases } = await supabase
      .from('orders')
      .select('user_id, total_amount_cents')
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString())
      .in('status', ['completed', 'active']);

    // Calculate revenue in cents
    const todayRevenue = todayPurchases?.reduce((sum, p) => sum + (p.total_amount_cents || 0), 0) || 0;
    const yesterdayRevenue = yesterdayPurchases?.reduce((sum, p) => sum + (p.total_amount_cents || 0), 0) || 0;

    // Get current active users
    const { data: activeUsersData } = await supabase
      .rpc('get_current_active_users');

    const todayActiveUsers = activeUsersData?.[0]?.total_active || 0;

    // Calculate percentage changes
    const calculateChange = (today: number, yesterday: number) => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return ((today - yesterday) / yesterday) * 100;
    };

    return NextResponse.json({
      success: true,
      data: {
        today: {
          signups: todaySignups || 0,
          purchases: todayPurchases?.length || 0,
          revenue: todayRevenue,
          activeUsers: todayActiveUsers,
        },
        yesterday: {
          signups: yesterdaySignups || 0,
          purchases: yesterdayPurchases?.length || 0,
          revenue: yesterdayRevenue,
          activeUsers: 0, // We don't have historical active users yet
        },
        changes: {
          signups: calculateChange(todaySignups || 0, yesterdaySignups || 0),
          purchases: calculateChange(todayPurchases?.length || 0, yesterdayPurchases?.length || 0),
          revenue: calculateChange(todayRevenue, yesterdayRevenue),
          activeUsers: 0, // Can't calculate without historical data
        },
      }
    });

  } catch (error) {
    console.error('Error in quick-stats API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quick stats'
      },
      { status: 500 }
    );
  }
}
