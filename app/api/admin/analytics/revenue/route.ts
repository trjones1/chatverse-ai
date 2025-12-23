import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

interface RevenueData {
  month: string;
  revenue: number;
  sfwRevenue: number;
  nsfwRevenue: number;
  voiceRevenue: number;
  tipsRevenue: number;
  projection?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    // Check admin environment flag
    if (!process.env.ENABLE_ADMIN_TOOLS) {
      return NextResponse.json({ error: 'Admin tools not enabled' }, { status: 403 });
    }

    // Use unified authentication pattern
    const authResult = await authenticateRequest(req, { requireAuth: true });
    const { user, userId, isAuthenticated } = authResult;

    if (!isAuthenticated || !user) {
      return createAuthRequiredResponse();
    }

    requireAdmin(user);

    // Create Supabase client
    const supabase = await createClient();

    const revenueData: RevenueData[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Generate data for past 6 months + current month + 5 future months
    for (let i = -6; i <= 5; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const isProjection = i > 0;
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });

      if (isProjection) {
        // Calculate projections based on growth trends
        const baseRevenue = revenueData.length > 0 ? revenueData[revenueData.length - 1].revenue : 1000;
        const growthRate = 1.15; // 15% monthly growth assumption
        const projectedRevenue = baseRevenue * Math.pow(growthRate, i);
        
        revenueData.push({
          month: monthName,
          revenue: Math.round(projectedRevenue * 100) / 100,
          sfwRevenue: Math.round(projectedRevenue * 0.6 * 100) / 100, // 60% SFW
          nsfwRevenue: Math.round(projectedRevenue * 0.35 * 100) / 100, // 35% NSFW
          voiceRevenue: Math.round(projectedRevenue * 0.03 * 100) / 100, // 3% Voice packs
          tipsRevenue: Math.round(projectedRevenue * 0.02 * 100) / 100, // 2% Tips
          projection: true
        });
      } else {
        // Calculate actual revenue for historical months
        let sfwRevenue = 0;
        let nsfwRevenue = 0;

        // Get active subscriptions for this month (excluding admin grants)
        const { data: subscriptions } = await supabase
          .from('user_subscriptions')
          .select('tier, created_at, stripe_subscription_id')
          .eq('subscription_status', 'active')
          .lte('created_at', monthEnd.toISOString())
          .not('stripe_subscription_id', 'like', 'admin_granted_%');

        // Calculate subscription revenue (simplified - assumes subscriptions are active for full month)
        subscriptions?.forEach(sub => {
          if (new Date(sub.created_at) <= monthEnd) {
            switch (sub.tier) {
              case 'sfw':
                sfwRevenue += 9.99;
                break;
              case 'nsfw':
                nsfwRevenue += 29.99;
                break;
            }
          }
        });

        // Get voice pack revenue (from credits_grants which tracks voice purchases)
        const { data: voiceGrants } = await supabase
          .from('credits_grants')
          .select('credits, created_at')
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString())
          .like('reason', '%Credit pack%');

        let voiceRevenue = 0;
        voiceGrants?.forEach(grant => {
          // Estimate revenue based on credit amount (rough pricing: 10 credits = $5, 25 = $10, etc.)
          const credits = grant.credits;
          if (credits === 10) voiceRevenue += 5;
          else if (credits === 25) voiceRevenue += 10;
          else if (credits === 50) voiceRevenue += 18;
          else if (credits === 100) voiceRevenue += 35;
        });

        // Get tips revenue for this month
        const { data: tips } = await supabase
          .from('tips')
          .select('amount_cents')
          .eq('status', 'completed')
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString());

        const tipsRevenue = tips?.reduce((sum, tip) => sum + (tip.amount_cents / 100), 0) || 0;

        const totalRevenue = sfwRevenue + nsfwRevenue + voiceRevenue + tipsRevenue;

        revenueData.push({
          month: monthName,
          revenue: Math.round(totalRevenue * 100) / 100,
          sfwRevenue: Math.round(sfwRevenue * 100) / 100,
          nsfwRevenue: Math.round(nsfwRevenue * 100) / 100,
          voiceRevenue: Math.round(voiceRevenue * 100) / 100,
          tipsRevenue: Math.round(tipsRevenue * 100) / 100,
          projection: false
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: revenueData,
      generatedAt: now.toISOString(),
      note: 'Revenue data from subscriptions, voice packs, and tips. Future months are projections.'
    });

  } catch (error: any) {
    console.error('❌ Analytics revenue error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch revenue analytics', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}