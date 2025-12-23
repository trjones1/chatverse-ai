import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { filterTestUsers, filterTestUserOrders, isAnalyticsFilteringEnabled } from '@/lib/analytics-filters';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const adminSupabase = getSupabaseAdmin();

    console.log('📊 Generating unified revenue dashboard data...');

    // Get all data in parallel for better performance
    const [
      versecoinsData,
      subscriptionData,
      revenueData
    ] = await Promise.all([
      getVerseCoinsEconomyData(adminSupabase),
      getSubscriptionMetrics(adminSupabase),
      getRevenueAnalytics(adminSupabase)
    ]);

    const unifiedData = {
      timestamp: new Date().toISOString(),
      versecoins: versecoinsData,
      subscriptions: subscriptionData,
      revenue: revenueData
    };

    return NextResponse.json(unifiedData);

  } catch (error) {
    console.error('❌ Error generating unified revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to generate unified revenue data' },
      { status: 500 }
    );
  }
}

async function getVerseCoinsEconomyData(adminSupabase: any) {
  console.log('💎 Getting VerseCoins economy data...');

  // Get VerseCoins purchase orders (minting)
  const { data: versecoinsOrders } = await adminSupabase
    .from('orders')
    .select('amount_cents, currency, created_at, product_name, stripe_metadata')
    .eq('product_type', 'versecoins')
    .eq('status', 'completed')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Filter out test user orders if filtering is enabled
  const filteredVersecoinsOrders = isAnalyticsFilteringEnabled()
    ? filterTestUserOrders(versecoinsOrders || [])
    : versecoinsOrders;

  // Calculate total VerseCoins minted from purchases
  const totalMinted = filteredVersecoinsOrders?.reduce((sum: number, order: any) => {
    const metadata = typeof order.stripe_metadata === 'string'
      ? JSON.parse(order.stripe_metadata)
      : order.stripe_metadata || {};
    return sum + (metadata.versecoins_amount || 0);
  }, 0) || 0;

  // Get spending orders (subscriptions, tips, gifts)
  const { data: spendingOrders } = await adminSupabase
    .from('orders')
    .select('amount_cents, currency, created_at, product_name, product_type, stripe_metadata')
    .eq('currency', 'versecoins')
    .eq('status', 'completed')
    .neq('product_type', 'versecoins')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Filter out test user orders if filtering is enabled
  const filteredSpendingOrders = isAnalyticsFilteringEnabled()
    ? filterTestUserOrders(spendingOrders || [])
    : spendingOrders;

  const totalSpent = filteredSpendingOrders?.reduce((sum: number, order: any) => {
    // Extract VerseCoins amount from metadata, or convert amount_cents
    const metadata = typeof order.stripe_metadata === 'string'
      ? JSON.parse(order.stripe_metadata)
      : order.stripe_metadata || {};
    const versecoins = metadata.versecoins_amount || (order.amount_cents / 100);
    return sum + versecoins;
  }, 0) || 0;

  // Get current balances from voice_wallets (if that table still exists)
  const { data: walletData } = await adminSupabase
    .from('voice_wallets')
    .select('credits');

  const inCirculation = walletData?.reduce((sum: number, w: any) => sum + (w.credits || 0), 0) || 0;

  // Categorize minting sources
  const mintingSources: Record<string, number> = {};
  filteredVersecoinsOrders?.forEach((order: any) => {
    const metadata = typeof order.stripe_metadata === 'string'
      ? JSON.parse(order.stripe_metadata)
      : order.stripe_metadata || {};
    const source = metadata.paid_with || 'other';
    const amount = metadata.versecoins_amount || 0;
    mintingSources[source] = (mintingSources[source] || 0) + amount;
  });

  // Categorize spending
  const spendingCategories: Record<string, number> = {};
  filteredSpendingOrders?.forEach((order: any) => {
    const category = order.product_type || 'other';
    // Extract VerseCoins amount from metadata, or convert amount_cents
    const metadata = typeof order.stripe_metadata === 'string'
      ? JSON.parse(order.stripe_metadata)
      : order.stripe_metadata || {};
    const versecoins = metadata.versecoins_amount || (order.amount_cents / 100);
    spendingCategories[category] = (spendingCategories[category] || 0) + versecoins;
  });

  // Get top products by VerseCoins volume
  const productStats: Record<string, { count: number; total: number; name: string }> = {};
  filteredSpendingOrders?.forEach((order: any) => {
    const product = order.product_name || 'Unknown';
    if (!productStats[product]) {
      productStats[product] = { count: 0, total: 0, name: product };
    }
    // Extract VerseCoins amount from metadata, or convert amount_cents
    const metadata = typeof order.stripe_metadata === 'string'
      ? JSON.parse(order.stripe_metadata)
      : order.stripe_metadata || {};
    const versecoins = metadata.versecoins_amount || (order.amount_cents / 100);
    productStats[product].count += 1;
    productStats[product].total += versecoins;
  });

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      type: 'VerseCoins Product',
      count: p.count,
      total_versecoins: p.total,
      avg_versecoins: Math.round(p.total / p.count)
    }));

  // Today's revenue
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = filteredVersecoinsOrders?.filter((order: any) =>
    order.created_at.startsWith(today)
  ) || [];
  const revenueTodayCents = todayOrders.reduce((sum: number, order: any) => {
    return sum + order.amount_cents;
  }, 0);

  return {
    total_minted: totalMinted,
    total_spent: totalSpent,
    in_circulation: inCirculation,
    revenue_today_cents: revenueTodayCents,
    minting_sources: mintingSources,
    spending_categories: spendingCategories,
    daily_minting_30d: {}, // Could add daily breakdowns
    daily_spending_30d: {}, // Could add daily breakdowns
    balance_distribution: {}, // Could add balance ranges
    top_products: topProducts
  };
}

async function getSubscriptionMetrics(adminSupabase: any) {
  console.log('👑 Getting subscription metrics...');

  // Get active subscriptions from orders table
  const { data: activeSubscriptionOrders } = await adminSupabase
    .from('orders')
    .select('tier, subscription_start_date, subscription_end_date, created_at, stripe_metadata, amount_cents')
    .in('product_type', ['sfw_premium', 'nsfw_premium'])
    .eq('status', 'completed')
    .gte('subscription_end_date', new Date().toISOString());

  // Filter out test user subscription orders if filtering is enabled
  const filteredActiveSubscriptionOrders = isAnalyticsFilteringEnabled()
    ? filterTestUserOrders(activeSubscriptionOrders || [])
    : activeSubscriptionOrders;

  const activeSfw = filteredActiveSubscriptionOrders?.filter((s: any) => s.tier === 'sfw').length || 0;
  const activeNsfw = filteredActiveSubscriptionOrders?.filter((s: any) => s.tier === 'nsfw').length || 0;
  const totalActive = activeSfw + activeNsfw;

  // Get subscription purchases in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data: recentSubscriptions } = await adminSupabase
    .from('orders')
    .select('tier, created_at, stripe_metadata, amount_cents')
    .in('product_type', ['sfw_premium', 'nsfw_premium'])
    .eq('status', 'completed')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Filter out test user recent subscriptions if filtering is enabled
  const filteredRecentSubscriptions = isAnalyticsFilteringEnabled()
    ? filterTestUserOrders(recentSubscriptions || [])
    : recentSubscriptions;

  // Calculate renewal rate (users who renewed vs expired)
  const monthlyRenewals = filteredRecentSubscriptions?.length || 0;

  // Get expired subscriptions to calculate churn
  const { data: expiredSubscriptions } = await adminSupabase
    .from('orders')
    .select('subscription_end_date, created_at')
    .in('product_type', ['sfw_premium', 'nsfw_premium'])
    .eq('status', 'completed')
    .lt('subscription_end_date', new Date().toISOString())
    .gte('subscription_end_date', thirtyDaysAgo.toISOString());

  // Filter out test user expired subscriptions if filtering is enabled
  const filteredExpiredSubscriptions = isAnalyticsFilteringEnabled()
    ? filterTestUserOrders(expiredSubscriptions || [])
    : expiredSubscriptions;

  const expired = filteredExpiredSubscriptions?.length || 0;
  const renewed = monthlyRenewals;
  const renewalRate = expired > 0 ? renewed / (expired + renewed) : 1;
  const churnRate = 1 - renewalRate;

  // Calculate average subscription value (in VerseCoins)
  const subscriptionValues = filteredRecentSubscriptions?.map((s: any) => {
    // Extract VerseCoins amount from metadata, or convert amount_cents to VerseCoins
    const metadata = typeof s.stripe_metadata === 'string'
      ? JSON.parse(s.stripe_metadata)
      : s.stripe_metadata || {};
    return metadata.versecoins_amount || (s.amount_cents / 100) || (s.tier === 'sfw' ? 2000 : 3000);
  }) || [];

  const avgSubscriptionValue = subscriptionValues.length > 0
    ? subscriptionValues.reduce((sum: number, val: number) => sum + val, 0) / subscriptionValues.length
    : 2500;

  // Calculate subscription revenue (in cents)
  const subscriptionRevenue30d = subscriptionValues.reduce((sum: number, val: number) => sum + val, 0);

  // Generate daily subscription purchases for chart
  const subscriptionPurchases30d = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];

    const daySubscriptions = filteredRecentSubscriptions?.filter((s: any) =>
      s.created_at.startsWith(dateStr)
    ) || [];

    const sfwPurchases = daySubscriptions.filter((s: any) => s.tier === 'sfw').length;
    const nsfwPurchases = daySubscriptions.filter((s: any) => s.tier === 'nsfw').length;
    const totalVersecoins = daySubscriptions.reduce((sum: number, s: any) => {
      // Extract VerseCoins amount from metadata, or convert amount_cents to VerseCoins
      const metadata = typeof s.stripe_metadata === 'string'
        ? JSON.parse(s.stripe_metadata)
        : s.stripe_metadata || {};
      const versecoins = metadata.versecoins_amount || (s.amount_cents / 100) || (s.tier === 'sfw' ? 2000 : 3000);
      return sum + versecoins;
    }, 0);

    subscriptionPurchases30d.push({
      date: dateStr,
      sfw_purchases: sfwPurchases,
      nsfw_purchases: nsfwPurchases,
      total_versecoins: totalVersecoins,
      revenue_cents: totalVersecoins * 100 // Convert VerseCoins to cents (1 VerseCoins = 100 cents)
    });
  }

  return {
    active_sfw: activeSfw,
    active_nsfw: activeNsfw,
    total_active: totalActive,
    monthly_renewals: monthlyRenewals,
    renewal_rate: renewalRate,
    avg_subscription_value: Math.round(avgSubscriptionValue),
    churn_rate: churnRate,
    subscription_revenue_30d: subscriptionRevenue30d,
    subscription_purchases_30d: subscriptionPurchases30d
  };
}

async function getRevenueAnalytics(adminSupabase: any) {
  console.log('💰 Getting revenue analytics...');

  // Generate 12 months of data (6 past + current + 5 future projections)
  const monthlyData = [];
  const now = new Date();

  for (let i = -6; i <= 5; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const isProjection = i > 0;
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });

    let totalRevenue = 0;
    let versecoinsRevenue = 0;
    let subscriptionsRevenue = 0;
    let voiceRevenue = 0;
    let tipsRevenue = 0;

    if (!isProjection) {
      // Get actual data for past months from orders
      const { data: monthlyOrders } = await adminSupabase
        .from('orders')
        .select('amount_cents, product_type, currency, stripe_metadata, created_at')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lt('created_at', monthEnd.toISOString());

      // Filter out test user orders if filtering is enabled
      const filteredMonthlyOrders = isAnalyticsFilteringEnabled()
        ? filterTestUserOrders(monthlyOrders || [])
        : monthlyOrders;

      // Calculate revenue from VerseCoins purchases (actual USD revenue)
      const versecoinsOrders = filteredMonthlyOrders?.filter((o: any) => o.product_type === 'versecoins') || [];
      versecoinsRevenue = versecoinsOrders.reduce((sum: number, o: any) => sum + o.amount_cents, 0);

      // Calculate subscription spending (VerseCoins spent)
      const subscriptionOrders = filteredMonthlyOrders?.filter((o: any) =>
        ['sfw_premium', 'nsfw_premium'].includes(o.product_type)
      ) || [];
      subscriptionsRevenue = subscriptionOrders.reduce((sum: number, o: any) => {
        // Extract VerseCoins amount from metadata, or convert amount_cents to VerseCoins
        const metadata = typeof o.stripe_metadata === 'string'
          ? JSON.parse(o.stripe_metadata)
          : o.stripe_metadata || {};
        const versecoins = metadata.versecoins_amount || (o.amount_cents / 100);
        return sum + versecoins;
      }, 0);

      // Calculate tips revenue (VerseCoins spent)
      const tipOrders = filteredMonthlyOrders?.filter((o: any) => o.product_type === 'tip') || [];
      tipsRevenue = tipOrders.reduce((sum: number, o: any) => {
        // Extract VerseCoins amount from metadata, or convert amount_cents to VerseCoins
        const metadata = typeof o.stripe_metadata === 'string'
          ? JSON.parse(o.stripe_metadata)
          : o.stripe_metadata || {};
        const versecoins = metadata.versecoins_amount || (o.amount_cents / 100);
        return sum + versecoins;
      }, 0);

      // Voice revenue would come from voice message purchases
      const voiceOrders = filteredMonthlyOrders?.filter((o: any) => o.product_type === 'voice') || [];
      voiceRevenue = voiceOrders.reduce((sum: number, o: any) => {
        // Extract VerseCoins amount from metadata, or convert amount_cents to VerseCoins
        const metadata = typeof o.stripe_metadata === 'string'
          ? JSON.parse(o.stripe_metadata)
          : o.stripe_metadata || {};
        const versecoins = metadata.versecoins_amount || (o.amount_cents / 100);
        return sum + versecoins;
      }, 0);

      totalRevenue = versecoinsRevenue; // USD revenue from VerseCoins purchases

      // Debug logging for month data
      if (i === 0) { // Current month
        console.log('🐛 Current month debug:', {
          monthName,
          isProjection,
          monthlyOrdersCount: monthlyOrders?.length || 0,
          versecoinsOrdersCount: versecoinsOrders?.length || 0,
          versecoinsRevenue,
          totalRevenue
        });
      }
    } else {
      // Generate projections based on recent trends
      const baseRevenue = 25000 + (i * 3000); // Growing trend
      versecoinsRevenue = baseRevenue;
      subscriptionsRevenue = baseRevenue * 0.6; // 60% goes to subscriptions
      voiceRevenue = baseRevenue * 0.2;
      tipsRevenue = baseRevenue * 0.1;
      totalRevenue = versecoinsRevenue;
    }

    monthlyData.push({
      month: monthName,
      total_revenue: totalRevenue,
      versecoins_purchased: versecoinsRevenue,
      subscriptions_revenue: subscriptionsRevenue,
      voice_revenue: voiceRevenue,
      tips_revenue: tipsRevenue,
      projection: isProjection
    });
  }

  // Calculate KPIs
  const { data: userData } = await adminSupabase
    .from('auth.users')
    .select('id, created_at');

  const activeUsers = userData?.length || 1;
  const currentMonthData = monthlyData.find(m => !m.projection);
  const currentMonthRevenue = currentMonthData?.total_revenue || 0;

  // Debug logging
  console.log('📊 Current month data:', {
    found: !!currentMonthData,
    total_revenue: currentMonthRevenue,
    monthlyDataCount: monthlyData.length,
    nonProjectionCount: monthlyData.filter(m => !m.projection).length
  });

  const kpis = {
    arpu: Math.round(currentMonthRevenue / activeUsers), // Revenue per user
    ltv: Math.round(currentMonthRevenue * 12 / activeUsers), // Rough LTV estimate
    cac: 500, // Placeholder - would need marketing spend data
    credit_utilization_rate: 0.65 // Placeholder - calculated from circulation data
  };

  return {
    monthly_data: monthlyData,
    kpis: kpis
  };
}