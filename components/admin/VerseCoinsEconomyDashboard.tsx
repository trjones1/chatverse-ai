'use client';

import React, { useState, useEffect } from 'react';

interface EconomyData {
  timestamp: string;
  summary: {
    total_minted: number;
    total_spent: number;
    in_circulation: number;
    active_users: number;
    transactions_today: number;
    revenue_today_cents: number;
  };
  minting: {
    total_minted: number;
    minting_sources: Record<string, number>;
    daily_minting_30d: Record<string, number>;
  };
  spending: {
    total_spent: number;
    spending_categories: Record<string, number>;
    daily_spending_30d: Record<string, number>;
  };
  circulation: {
    total_in_circulation: number;
    users_with_balance: number;
    average_balance: number;
    balance_distribution: Record<string, number>;
  };
  top_products: Array<{
    name: string;
    type: string;
    count: number;
    total_versecoins: number;
    avg_versecoins: number;
  }>;
  recent_activity: {
    transactions_today: number;
    orders_today: number;
    revenue_today_cents: number;
    recent_transactions: Array<any>;
  };
  user_stats: {
    active_users: number;
    users_with_balance: number;
    recently_active_7d: number;
    avg_earned: number;
    avg_spent: number;
  };
}

export default function VerseCoinsEconomyDashboard() {
  const [economyData, setEconomyData] = useState<EconomyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchEconomyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/versecoins-economy');
      if (!response.ok) {
        throw new Error(`Failed to fetch economy data: ${response.status}`);
      }

      const data = await response.json();
      setEconomyData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Economy data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load economy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEconomyData();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading economy data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ {error}</div>
          <button
            onClick={fetchEconomyData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!economyData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              💎 VerseCoins Economy Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Real-time insights into your virtual economy
            </p>
          </div>
          <div className="text-right">
            <button
              onClick={fetchEconomyData}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-2"
            >
              🔄 Refresh
            </button>
            {lastRefresh && (
              <p className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 text-sm font-medium">Total Minted</div>
          <div className="text-2xl font-bold text-green-900">
            {formatNumber(economyData.summary.total_minted)}
          </div>
          <div className="text-green-600 text-xs">VerseCoins created</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 text-sm font-medium">Total Spent</div>
          <div className="text-2xl font-bold text-red-900">
            {formatNumber(economyData.summary.total_spent)}
          </div>
          <div className="text-red-600 text-xs">VerseCoins consumed</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 text-sm font-medium">In Circulation</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatNumber(economyData.summary.in_circulation)}
          </div>
          <div className="text-blue-600 text-xs">User balances</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-purple-800 text-sm font-medium">Active Users</div>
          <div className="text-2xl font-bold text-purple-900">
            {formatNumber(economyData.summary.active_users)}
          </div>
          <div className="text-purple-600 text-xs">With VerseCoins activity</div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-orange-800 text-sm font-medium">Today's Activity</div>
          <div className="text-2xl font-bold text-orange-900">
            {formatNumber(economyData.summary.transactions_today)}
          </div>
          <div className="text-orange-600 text-xs">Transactions</div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800 text-sm font-medium">Today's Revenue</div>
          <div className="text-2xl font-bold text-yellow-900">
            {formatCurrency(economyData.summary.revenue_today_cents)}
          </div>
          <div className="text-yellow-600 text-xs">From VerseCoins</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Most Popular Items</h3>
          <div className="space-y-3">
            {economyData.top_products.slice(0, 8).map((product, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-600">{product.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatNumber(product.count)} sales</div>
                  <div className="text-sm text-gray-600">{formatNumber(product.avg_versecoins)} VC avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spending Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Spending Categories</h3>
          <div className="space-y-3">
            {Object.entries(economyData.spending.spending_categories)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-gray-700 capitalize">{category.replace('_', ' ')}</span>
                  <span className="font-semibold text-gray-900">{formatNumber(amount)} VC</span>
                </div>
              ))}
          </div>
        </div>

        {/* Balance Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Balance Distribution</h3>
          <div className="space-y-3">
            {Object.entries(economyData.circulation.balance_distribution).map(([range, count]) => (
              <div key={range} className="flex justify-between items-center">
                <span className="text-gray-700">{range} VerseCoins</span>
                <span className="font-semibold text-gray-900">{formatNumber(count)} users</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 User Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-900">{formatNumber(economyData.user_stats.users_with_balance)}</div>
              <div className="text-sm text-blue-700">With Balance</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-900">{formatNumber(economyData.user_stats.recently_active_7d)}</div>
              <div className="text-sm text-green-700">Active 7d</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-900">{formatNumber(economyData.user_stats.avg_earned)}</div>
              <div className="text-sm text-purple-700">Avg Earned</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <div className="text-2xl font-bold text-orange-900">{formatNumber(economyData.user_stats.avg_spent)}</div>
              <div className="text-sm text-orange-700">Avg Spent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Minting Sources */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏭 VerseCoins Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(economyData.minting.minting_sources)
            .sort(([,a], [,b]) => b - a)
            .map(([source, amount]) => (
              <div key={source} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-800 font-medium capitalize">{source.replace('_', ' ')}</div>
                <div className="text-2xl font-bold text-green-900">{formatNumber(amount)}</div>
                <div className="text-green-600 text-sm">VerseCoins minted</div>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Recent Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-900">{formatNumber(economyData.recent_activity.transactions_today)}</div>
            <div className="text-blue-700 text-sm">Transactions Today</div>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-900">{formatNumber(economyData.recent_activity.orders_today)}</div>
            <div className="text-green-700 text-sm">Orders Today</div>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-900">{formatCurrency(economyData.recent_activity.revenue_today_cents)}</div>
            <div className="text-purple-700 text-sm">Revenue Today</div>
          </div>
        </div>
      </div>
    </div>
  );
}