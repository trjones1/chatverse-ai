import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

interface PricingBreakdown {
  tier: string;
  price: number;
  subscribers: number;
  revenue: number;
  percentage: number;
  growth: number; // Month-over-month change
}

interface BreakdownData {
  subscriptions: PricingBreakdown[];
  voicePacks: {
    totalRevenue: number;
    breakdown: {
      pack10: { sales: number; revenue: number };
      pack25: { sales: number; revenue: number };
      pack50: { sales: number; revenue: number };
      pack100: { sales: number; revenue: number };
    };
  };
  tips: {
    totalRevenue: number;
    totalTips: number;
    averageTip: number;
    topCharacter: string;
  };
  summary: {
    totalRevenue: number;
    totalSubscribers: number;
    averageRevenuePerUser: number;
  };
}

export async function GET() {
  try {
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

    // 🆕 GET REVENUE DATA FROM ORDERS TABLE
    // This is much more accurate than trying to calculate from various sources
    
    // Current month revenue by order type
    const { data: currentOrders } = await supabase
      .from('orders')
      .select('order_type, product_type, amount_cents, voice_credits, character_key')
      .eq('status', 'completed')
      .gte('completed_at', currentMonth.toISOString())
      .lt('completed_at', now.toISOString());

    // Previous month revenue for growth calculation  
    const { data: previousOrders } = await supabase
      .from('orders')
      .select('order_type, product_type, amount_cents')
      .eq('status', 'completed')
      .gte('completed_at', previousMonth.toISOString())
      .lt('completed_at', currentMonth.toISOString());

    // Current active subscription counts (still need this for subscriber numbers)
    const { data: currentSubs } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('status', 'active')
      .not('user_id', 'is', null);

    // Group current orders by type
    const ordersByType = {
      sfw_subscription: currentOrders?.filter(o => 
        o.order_type === 'subscription' && (o.product_type === 'sfw_premium' || o.product_type?.includes('sfw'))
      ) || [],
      nsfw_subscription: currentOrders?.filter(o => 
        o.order_type === 'subscription' && (o.product_type === 'nsfw_premium' || o.product_type?.includes('nsfw'))
      ) || [],
      voice_packs: currentOrders?.filter(o => o.order_type === 'voice_pack') || [],
      tips: currentOrders?.filter(o => o.order_type === 'tip') || []
    };

    // Calculate actual revenue from completed orders
    const sfwRevenue = ordersByType.sfw_subscription.reduce((sum, order) => sum + (order.amount_cents / 100), 0);
    const nsfwRevenue = ordersByType.nsfw_subscription.reduce((sum, order) => sum + (order.amount_cents / 100), 0);
    const voicePackRevenue = ordersByType.voice_packs.reduce((sum, order) => sum + (order.amount_cents / 100), 0);
    const tipsRevenue = ordersByType.tips.reduce((sum, order) => sum + (order.amount_cents / 100), 0);

    // Get subscriber counts from active subscriptions
    const tierCounts = {
      sfw: currentSubs?.filter(s => s.tier === 'sfw').length || 0,
      nsfw: currentSubs?.filter(s => s.tier === 'nsfw').length || 0
    };

    // Get previous month subscriber counts for growth calculation
    const { data: previousSubs } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('status', 'active')
      .not('user_id', 'is', null)
      .gte('created_at', previousMonth.toISOString())
      .lt('created_at', currentMonth.toISOString());

    const prevTierCounts = {
      sfw: previousSubs?.filter(s => s.tier === 'sfw').length || 0,
      nsfw: previousSubs?.filter(s => s.tier === 'nsfw').length || 0
    };

    const totalSubscriptionRevenue = sfwRevenue + nsfwRevenue;

    const subscriptions: PricingBreakdown[] = [
      {
        tier: 'SFW',
        price: 9.99,
        subscribers: tierCounts.sfw,
        revenue: sfwRevenue,
        percentage: totalSubscriptionRevenue > 0 ? (sfwRevenue / totalSubscriptionRevenue) * 100 : 0,
        growth: prevTierCounts.sfw > 0 ? ((tierCounts.sfw - prevTierCounts.sfw) / prevTierCounts.sfw) * 100 : 0
      },
      {
        tier: 'NSFW',
        price: 29.99,
        subscribers: tierCounts.nsfw,
        revenue: nsfwRevenue,
        percentage: totalSubscriptionRevenue > 0 ? (nsfwRevenue / totalSubscriptionRevenue) * 100 : 0,
        growth: prevTierCounts.nsfw > 0 ? ((tierCounts.nsfw - prevTierCounts.nsfw) / prevTierCounts.nsfw) * 100 : 0
      }
    ];

    // ✅ Get voice pack data from orders table instead of credits_grants
    let voicePackBreakdown = {
      pack10: { sales: 0, revenue: 0 },
      pack25: { sales: 0, revenue: 0 },
      pack50: { sales: 0, revenue: 0 },
      pack100: { sales: 0, revenue: 0 }
    };

    // Process voice pack orders to get breakdown by pack size
    ordersByType.voice_packs?.forEach(order => {
      const credits = order.voice_credits || 0;
      const revenue = order.amount_cents / 100;

      switch (credits) {
        case 10:
          voicePackBreakdown.pack10.sales++;
          voicePackBreakdown.pack10.revenue += revenue;
          break;
        case 25:
          voicePackBreakdown.pack25.sales++;
          voicePackBreakdown.pack25.revenue += revenue;
          break;
        case 50:
          voicePackBreakdown.pack50.sales++;
          voicePackBreakdown.pack50.revenue += revenue;
          break;
        case 100:
          voicePackBreakdown.pack100.sales++;
          voicePackBreakdown.pack100.revenue += revenue;
          break;
      }
    });

    // Use the calculated voice pack revenue from orders table
    const totalVoiceRevenue = voicePackRevenue;

    // ✅ Get tips data from orders table instead of tips table
    const totalTipsCount = ordersByType.tips?.length || 0;
    const averageTip = totalTipsCount > 0 ? tipsRevenue / totalTipsCount : 0;

    // Find top character for tips using orders data
    const characterTips: Record<string, number> = {};
    ordersByType.tips?.forEach(order => {
      const char = order.character_key || 'unknown';
      characterTips[char] = (characterTips[char] || 0) + (order.amount_cents / 100);
    });

    const topCharacter = Object.entries(characterTips)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'lexi';

    // Calculate totals
    const totalRevenue = totalSubscriptionRevenue + totalVoiceRevenue + tipsRevenue;
    const totalSubscribers = tierCounts.sfw + tierCounts.nsfw;
    const averageRevenuePerUser = totalSubscribers > 0 ? totalRevenue / totalSubscribers : 0;

    const breakdown: BreakdownData = {
      subscriptions,
      voicePacks: {
        totalRevenue: totalVoiceRevenue,
        breakdown: voicePackBreakdown
      },
      tips: {
        totalRevenue: tipsRevenue,
        totalTips: totalTipsCount,
        averageTip: Math.round(averageTip * 100) / 100,
        topCharacter
      },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSubscribers,
        averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: breakdown,
      generatedAt: now.toISOString(),
      period: {
        month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        start: currentMonth.toISOString(),
        end: now.toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Analytics breakdown error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch revenue breakdown', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}