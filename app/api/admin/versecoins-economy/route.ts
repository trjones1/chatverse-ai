import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { filterTestUsers, filterTestUserOrders, isAnalyticsFilteringEnabled, getTestUserExclusionCondition } from '@/lib/analytics-filters';

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

    // Check if user is admin (you might want to add proper admin check)
    const adminSupabase = getSupabaseAdmin();

    console.log('📊 Generating VerseCoins economy report...');

    // Get economy metrics in parallel
    const [
      mintingData,
      spendingData,
      circulationData,
      topProductsData,
      recentActivityData,
      userStatsData
    ] = await Promise.all([
      getMintingMetrics(adminSupabase),
      getSpendingMetrics(adminSupabase),
      getCirculationMetrics(adminSupabase),
      getTopProducts(adminSupabase),
      getRecentActivity(adminSupabase),
      getUserStats(adminSupabase)
    ]);

    const economyReport = {
      timestamp: new Date().toISOString(),
      summary: {
        total_minted: mintingData.total_minted,
        total_spent: spendingData.total_spent,
        in_circulation: circulationData.total_in_circulation,
        active_users: userStatsData.active_users,
        transactions_today: recentActivityData.transactions_today,
        revenue_today_cents: recentActivityData.revenue_today_cents
      },
      minting: mintingData,
      spending: spendingData,
      circulation: circulationData,
      top_products: topProductsData,
      recent_activity: recentActivityData,
      user_stats: userStatsData
    };

    console.log('✅ Economy report generated:', {
      total_minted: economyReport.summary.total_minted,
      total_spent: economyReport.summary.total_spent,
      in_circulation: economyReport.summary.in_circulation
    });

    return NextResponse.json(economyReport);

  } catch (error) {
    console.error('❌ Economy report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate economy report' },
      { status: 500 }
    );
  }
}

// Helper functions for different metrics
async function getMintingMetrics(supabase: any) {
  // Total VerseCoins minted (from all credit transactions)
  let query = supabase
    .from('versecoins_transactions')
    .select('amount, created_at, description, metadata, user_id')
    .eq('type', 'credit');

  // Add test user exclusion if filtering is enabled
  if (isAnalyticsFilteringEnabled()) {
    query = query.not('user_id', 'in', `(${getTestUserExclusionCondition().split(' NOT IN ')[1].slice(1, -1)})`);
  }

  const { data: mintingData, error: mintingError } = await query;

  if (mintingError) throw mintingError;

  const totalMinted = mintingData?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0;

  // Group by source
  const mintingSources = mintingData?.reduce((acc: any, tx: any) => {
    const source = tx.metadata?.source || tx.description || 'unknown';
    acc[source] = (acc[source] || 0) + tx.amount;
    return acc;
  }, {}) || {};

  // Daily minting for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyMinting = mintingData
    ?.filter((tx: any) => new Date(tx.created_at) >= thirtyDaysAgo)
    .reduce((acc: any, tx: any) => {
      const date = new Date(tx.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + tx.amount;
      return acc;
    }, {}) || {};

  return {
    total_minted: totalMinted,
    minting_sources: mintingSources,
    daily_minting_30d: dailyMinting
  };
}

async function getSpendingMetrics(supabase: any) {
  // Total VerseCoins spent (from all debit transactions)
  let query = supabase
    .from('versecoins_transactions')
    .select('amount, created_at, description, reference_type, metadata, user_id')
    .eq('type', 'debit');

  // Add test user exclusion if filtering is enabled
  if (isAnalyticsFilteringEnabled()) {
    query = query.not('user_id', 'in', `(${getTestUserExclusionCondition().split(' NOT IN ')[1].slice(1, -1)})`);
  }

  const { data: spendingData, error: spendingError } = await query;

  if (spendingError) throw spendingError;

  const totalSpent = Math.abs(spendingData?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0);

  // Group by spending category
  const spendingCategories = spendingData?.reduce((acc: any, tx: any) => {
    const category = tx.reference_type || 'unknown';
    acc[category] = (acc[category] || 0) + Math.abs(tx.amount);
    return acc;
  }, {}) || {};

  // Daily spending for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailySpending = spendingData
    ?.filter((tx: any) => new Date(tx.created_at) >= thirtyDaysAgo)
    .reduce((acc: any, tx: any) => {
      const date = new Date(tx.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + Math.abs(tx.amount);
      return acc;
    }, {}) || {};

  return {
    total_spent: totalSpent,
    spending_categories: spendingCategories,
    daily_spending_30d: dailySpending
  };
}

async function getCirculationMetrics(supabase: any) {
  // Current user balances
  let query = supabase
    .from('user_versecoins')
    .select('credits, user_id, updated_at');

  // Add test user exclusion if filtering is enabled
  if (isAnalyticsFilteringEnabled()) {
    query = query.not('user_id', 'in', `(${getTestUserExclusionCondition().split(' NOT IN ')[1].slice(1, -1)})`);
  }

  const { data: balanceData, error: balanceError } = await query;

  if (balanceError) throw balanceError;

  const totalInCirculation = balanceData?.reduce((sum: number, user: any) => sum + user.credits, 0) || 0;
  const usersWithBalance = balanceData?.filter((user: any) => user.credits > 0).length || 0;
  const averageBalance = usersWithBalance > 0 ? totalInCirculation / usersWithBalance : 0;

  // Distribution analysis
  const balanceRanges = {
    '0': 0,
    '1-100': 0,
    '101-500': 0,
    '501-1000': 0,
    '1001-2000': 0,
    '2001-5000': 0,
    '5000+': 0
  };

  balanceData?.forEach((user: any) => {
    const credits = user.credits;
    if (credits === 0) balanceRanges['0']++;
    else if (credits <= 100) balanceRanges['1-100']++;
    else if (credits <= 500) balanceRanges['101-500']++;
    else if (credits <= 1000) balanceRanges['501-1000']++;
    else if (credits <= 2000) balanceRanges['1001-2000']++;
    else if (credits <= 5000) balanceRanges['2001-5000']++;
    else balanceRanges['5000+']++;
  });

  return {
    total_in_circulation: totalInCirculation,
    users_with_balance: usersWithBalance,
    average_balance: Math.round(averageBalance),
    balance_distribution: balanceRanges
  };
}

async function getTopProducts(supabase: any) {
  // Most purchased items from orders table
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('product_name, product_type, amount_cents, currency, created_at, stripe_metadata')
    .eq('currency', 'versecoins')
    .eq('status', 'completed');

  if (ordersError) throw ordersError;

  // Filter out test user orders if filtering is enabled
  const filteredOrdersData = isAnalyticsFilteringEnabled()
    ? filterTestUserOrders(ordersData || [])
    : ordersData;

  // Group by product
  const productStats = filteredOrdersData?.reduce((acc: any, order: any) => {
    const product = order.product_name || order.product_type || 'unknown';
    if (!acc[product]) {
      acc[product] = {
        name: product,
        type: order.product_type,
        count: 0,
        total_versecoins: 0,
        avg_versecoins: 0
      };
    }
    acc[product].count++;
    // For VerseCoins orders, prefer versecoins_amount from metadata
    // If not available, amount_cents is stored as versecoins * 100, so divide by 100
    const versecoins = order.stripe_metadata?.versecoins_amount || (order.amount_cents / 100);
    acc[product].total_versecoins += versecoins;
    acc[product].avg_versecoins = Math.round(acc[product].total_versecoins / acc[product].count);
    return acc;
  }, {}) || {};

  // Sort by popularity
  const topProducts = Object.values(productStats)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  return topProducts;
}

async function getRecentActivity(supabase: any) {
  const today = new Date().toISOString().split('T')[0];

  // Transactions today
  let txQuery = supabase
    .from('versecoins_transactions')
    .select('type, amount, created_at, user_id')
    .gte('created_at', today + 'T00:00:00.000Z');

  // Add test user exclusion if filtering is enabled
  if (isAnalyticsFilteringEnabled()) {
    txQuery = txQuery.not('user_id', 'in', `(${getTestUserExclusionCondition().split(' NOT IN ')[1].slice(1, -1)})`);
  }

  const { data: todayTransactions, error: txError } = await txQuery;

  if (txError) throw txError;

  // Orders today
  const { data: todayOrders, error: ordersError } = await supabase
    .from('orders')
    .select('amount_cents, currency, created_at')
    .eq('currency', 'versecoins')
    .eq('status', 'completed')
    .gte('created_at', today + 'T00:00:00.000Z');

  if (ordersError) throw ordersError;

  // Filter out test user orders if filtering is enabled
  const filteredTodayOrders = isAnalyticsFilteringEnabled()
    ? filterTestUserOrders(todayOrders || [])
    : todayOrders;

  const transactionsToday = todayTransactions?.length || 0;
  const revenueTodayCents = filteredTodayOrders?.reduce((sum: number, order: any) => sum + order.amount_cents, 0) || 0;

  return {
    transactions_today: transactionsToday,
    orders_today: filteredTodayOrders?.length || 0,
    revenue_today_cents: revenueTodayCents,
    recent_transactions: todayTransactions?.slice(-10) || []
  };
}

async function getUserStats(supabase: any) {
  // Users with VerseCoins activity
  let query = supabase
    .from('user_versecoins')
    .select('user_id, credits, total_earned, total_spent, updated_at')
    .gt('total_earned', 0);

  // Add test user exclusion if filtering is enabled
  if (isAnalyticsFilteringEnabled()) {
    query = query.not('user_id', 'in', `(${getTestUserExclusionCondition().split(' NOT IN ')[1].slice(1, -1)})`);
  }

  const { data: activeUsers, error: usersError } = await query;

  if (usersError) throw usersError;

  const totalActiveUsers = activeUsers?.length || 0;
  const usersWithCurrentBalance = activeUsers?.filter((user: any) => user.credits > 0).length || 0;

  // Recent activity (users active in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyActive = activeUsers?.filter((user: any) =>
    new Date(user.updated_at) >= sevenDaysAgo
  ).length || 0;

  return {
    active_users: totalActiveUsers,
    users_with_balance: usersWithCurrentBalance,
    recently_active_7d: recentlyActive,
    avg_earned: totalActiveUsers > 0 ? Math.round(
      activeUsers.reduce((sum: number, user: any) => sum + user.total_earned, 0) / totalActiveUsers
    ) : 0,
    avg_spent: totalActiveUsers > 0 ? Math.round(
      activeUsers.reduce((sum: number, user: any) => sum + user.total_spent, 0) / totalActiveUsers
    ) : 0
  };
}