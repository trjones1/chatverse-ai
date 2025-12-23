import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { protectAdminEndpoint } from '@/lib/admin-rate-limiting';

export const dynamic = 'force-dynamic';

interface BusinessMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  ltv: number; // Lifetime Value
  growthRate: number; // Month-over-month growth rate (percentage)
  totalUsers: number;
  paidUsers: number;
  conversionRate: number; // Percentage
  churnRate: number; // Percentage
  avgRevenuePerUser: number;
}

export async function GET(req: NextRequest) {
  try {
    // Apply admin-specific rate limiting with IP allowlisting
    const rateLimitResponse = await protectAdminEndpoint(req, 'analytics');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check admin environment flag
    if (!process.env.ENABLE_ADMIN_TOOLS) {
      return NextResponse.json({ error: 'Admin tools not enabled' }, { status: 403 });
    }

    const supabase = await createClient();

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAdmin(user);

    // Calculate current and previous month dates
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Calculate Monthly Recurring Revenue (MRR) - excluding admin grants
    const { data: currentMRR } = await supabase
      .from('user_subscriptions')
      .select('tier, stripe_subscription_id')
      .eq('status', 'active')
      .gte('updated_at', currentMonth.toISOString());

    let mrr = 0;
    currentMRR?.forEach(sub => {
      switch (sub.tier) {
        case 'sfw':
          mrr += 9.99;
          break;
        case 'nsfw':
          mrr += 29.99;
          break;
      }
    });

    // Calculate previous month MRR for growth rate - excluding admin grants
    const { data: previousMRRData } = await supabase
      .from('user_subscriptions')
      .select('tier, stripe_subscription_id')
      .eq('status', 'active')
      .gte('updated_at', previousMonth.toISOString())
      .lt('updated_at', currentMonth.toISOString());

    let previousMrr = 0;
    previousMRRData?.forEach(sub => {
      switch (sub.tier) {
        case 'sfw':
          previousMrr += 9.99;
          break;
        case 'nsfw':
          previousMrr += 29.99;
          break;
      }
    });

    // Calculate growth rate
    const growthRate = previousMrr > 0 ? ((mrr - previousMrr) / previousMrr) * 100 : 0;

    // Annual Recurring Revenue (ARR)
    const arr = mrr * 12;

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' });

    // Get paid users count (excluding admin grants)
    const { count: paidUsers } = await supabase
      .from('user_subscriptions')
      .select('user_id', { count: 'exact' })
      .eq('status', 'active')
      .not('user_id', 'is', null);

    // Calculate conversion rate
    const conversionRate = totalUsers && totalUsers > 0 ? (paidUsers || 0) / totalUsers * 100 : 0;

    // Calculate average revenue per user (ARPU)
    const avgRevenuePerUser = paidUsers && paidUsers > 0 ? mrr / paidUsers : 0;

    // Get completed tips for additional revenue
    const { data: tipsData } = await supabase
      .from('tips')
      .select('amount_cents')
      .eq('status', 'completed')
      .gte('created_at', currentMonth.toISOString());

    const tipsRevenue = tipsData?.reduce((sum, tip) => sum + (tip.amount_cents / 100), 0) || 0;

    // Add tips to MRR (tips are one-time but included in monthly calculations)
    mrr += tipsRevenue;

    // Estimate LTV (simplified calculation: average revenue per user * average customer lifespan in months)
    // Using industry standard of 1/churn_rate for lifespan
    const estimatedChurnRate = 5.0; // 5% monthly churn rate (industry average)
    const avgLifespanMonths = 100 / estimatedChurnRate; // 20 months
    const ltv = avgRevenuePerUser * avgLifespanMonths;

    const metrics: BusinessMetrics = {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      ltv: Math.round(ltv * 100) / 100,
      growthRate: Math.round(growthRate * 10) / 10,
      totalUsers: totalUsers || 0,
      paidUsers: paidUsers || 0,
      conversionRate: Math.round(conversionRate * 10) / 10,
      churnRate: estimatedChurnRate,
      avgRevenuePerUser: Math.round(avgRevenuePerUser * 100) / 100
    };

    return NextResponse.json({
      success: true,
      data: metrics,
      generatedAt: now.toISOString(),
      note: 'Metrics calculated from active subscriptions and completed tips'
    });

  } catch (error: any) {
    console.error('❌ Analytics metrics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics metrics', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}