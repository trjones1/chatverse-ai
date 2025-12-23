'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface UnifiedRevenueData {
  // VerseCoins Economy Data
  versecoins: {
    total_minted: number;
    total_spent: number;
    in_circulation: number;
    revenue_today_cents: number;
    minting_sources: Record<string, number>;
    spending_categories: Record<string, number>;
    daily_minting_30d: Record<string, number>;
    daily_spending_30d: Record<string, number>;
    balance_distribution: Record<string, number>;
    top_products: Array<{
      name: string;
      type: string;
      count: number;
      total_versecoins: number;
      avg_versecoins: number;
    }>;
  };

  // Subscription Metrics (VerseCoins-based)
  subscriptions: {
    active_sfw: number;
    active_nsfw: number;
    total_active: number;
    monthly_renewals: number;
    renewal_rate: number;
    avg_subscription_value: number;
    churn_rate: number;
    subscription_revenue_30d: number;
    subscription_purchases_30d: Array<{
      date: string;
      sfw_purchases: number;
      nsfw_purchases: number;
      total_versecoins: number;
      revenue_cents: number;
    }>;
  };

  // Revenue Analytics
  revenue: {
    monthly_data: Array<{
      month: string;
      total_revenue: number;
      versecoins_purchased: number;
      subscriptions_revenue: number;
      voice_revenue: number;
      tips_revenue: number;
      projection?: boolean;
    }>;
    kpis: {
      arpu: number; // Average Revenue Per User
      ltv: number;  // Lifetime Value
      cac: number;  // Customer Acquisition Cost
      credit_utilization_rate: number;
    };
  };
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4'
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function UnifiedRevenueDashboard() {
  const [data, setData] = useState<UnifiedRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'versecoins' | 'analytics'>('overview');

  useEffect(() => {
    fetchUnifiedData();
  }, []);

  const fetchUnifiedData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/unified-revenue');

      if (!response.ok) {
        throw new Error('Failed to fetch unified revenue data');
      }

      const unifiedData = await response.json();
      setData(unifiedData);
    } catch (error) {
      console.error('Error fetching unified revenue data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    // Use a simple formatting approach to avoid server/client hydration differences
    const dollars = value / 100;
    if (dollars >= 1000000) {
      return `$${(dollars / 1000000).toFixed(1)}M`;
    } else if (dollars >= 1000) {
      return `$${(dollars / 1000).toFixed(1)}K`;
    }
    return `$${dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatNumber = (value: number): string => {
    // Use a simple formatting approach to avoid server/client hydration differences
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading unified revenue dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-red-300">{error || 'Failed to load data'}</p>
          <button
            onClick={fetchUnifiedData}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(data.revenue.monthly_data.find(m => !m.projection)?.total_revenue || 0)}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Premium Users</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatNumber(data.subscriptions.total_active)}
              </p>
              <p className="text-xs text-gray-500">
                Users with active premium access
              </p>
            </div>
            <div className="text-3xl">👑</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">VerseCoins in Circulation</p>
              <p className="text-2xl font-bold text-purple-400">
                {formatNumber(data.versecoins.in_circulation)}
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(data.versecoins.revenue_today_cents)} today
              </p>
            </div>
            <div className="text-3xl">💎</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Credit Utilization</p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatPercentage(data.revenue.kpis.credit_utilization_rate)}
              </p>
              <p className="text-xs text-gray-500">
                VerseCoins spent vs purchased
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>
      </div>

      {/* VerseCoins Purchase Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">VerseCoins Purchase Trends (6 Month)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenue.monthly_data.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelStyle={{ color: '#1f2937' }}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="total_revenue"
                stroke={COLORS.primary}
                fill={COLORS.primary}
                name="Total Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Average Revenue Per User</p>
            <p className="text-xl font-bold text-green-400">
              {formatCurrency(data.revenue.kpis.arpu)}
            </p>
            <p className="text-xs text-gray-500">Monthly ARPU</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Credit Utilization Rate</p>
            <p className="text-xl font-bold text-purple-400">
              {formatPercentage(data.revenue.kpis.credit_utilization_rate)}
            </p>
            <p className="text-xs text-gray-500">Spending efficiency</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Conversion Rate</p>
            <p className="text-xl font-bold text-blue-400">
              {data.subscriptions.total_active > 0 ? formatPercentage(data.subscriptions.total_active / 100) : '0.0%'}
            </p>
            <p className="text-xs text-gray-500">Free to premium</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVerseCoinsTab = () => (
    <div className="space-y-6">
      {/* VerseCoins Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4 text-green-400">💰 Minted</h4>
          <p className="text-2xl font-bold">{formatNumber(data.versecoins.total_minted)}</p>
          <div className="mt-4 space-y-2">
            {Object.entries(data.versecoins.minting_sources).map(([source, amount]) => (
              <div key={source} className="flex justify-between text-sm">
                <span className="text-gray-400">{source}:</span>
                <span>{formatNumber(amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4 text-blue-400">💎 In Circulation</h4>
          <p className="text-2xl font-bold">{formatNumber(data.versecoins.in_circulation)}</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Utilization Rate:</span>
              <span>{formatPercentage(data.revenue.kpis.credit_utilization_rate)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4 text-red-400">🔥 Spent</h4>
          <p className="text-2xl font-bold">{formatNumber(data.versecoins.total_spent)}</p>
          <div className="mt-4 space-y-2">
            {Object.entries(data.versecoins.spending_categories).map(([category, amount]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="text-gray-400">{category}:</span>
                <span>{formatNumber(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Top Products by VerseCoins Volume</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Type</th>
                <th className="text-right p-2">Purchases</th>
                <th className="text-right p-2">Total VerseCoins</th>
                <th className="text-right p-2">Avg Price</th>
              </tr>
            </thead>
            <tbody>
              {data.versecoins.top_products.map((product, index) => (
                <tr key={index} className="border-b border-gray-700/50">
                  <td className="p-2 font-medium">{product.name}</td>
                  <td className="p-2 text-gray-400">{product.type}</td>
                  <td className="p-2 text-right">{formatNumber(product.count)}</td>
                  <td className="p-2 text-right text-purple-400">{formatNumber(product.total_versecoins)}</td>
                  <td className="p-2 text-right">{formatNumber(product.avg_versecoins)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Purchase Behavior Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Avg Purchase Value</p>
            <p className="text-2xl font-bold text-green-400">
              {formatNumber(data.subscriptions.avg_subscription_value)} VC
            </p>
            <p className="text-xs text-gray-500">Per transaction</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Monthly Purchases</p>
            <p className="text-2xl font-bold text-blue-400">
              {formatCurrency(data.subscriptions.subscription_revenue_30d)}
            </p>
            <p className="text-xs text-gray-500">Last 30 days</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Repeat Customers</p>
            <p className="text-2xl font-bold text-purple-400">
              {formatPercentage(data.subscriptions.renewal_rate)}
            </p>
            <p className="text-xs text-gray-500">Return purchasers</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Premium Users</p>
            <p className="text-2xl font-bold text-yellow-400">
              {formatNumber(data.subscriptions.total_active)}
            </p>
            <p className="text-xs text-gray-500">Currently active</p>
          </div>
        </div>
      </div>

      {/* User Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Premium Tier Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Premium Pass (SFW)', value: data.subscriptions.active_sfw },
                    { name: 'Premium+ All Access (NSFW)', value: data.subscriptions.active_nsfw }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, value, percent}) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {[
                    { name: 'Premium Pass (SFW)', value: data.subscriptions.active_sfw },
                    { name: 'Premium+ All Access (NSFW)', value: data.subscriptions.active_nsfw }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Daily Purchase Trend (14 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.subscriptions.subscription_purchases_30d.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  labelStyle={{ color: '#1f2937' }}
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue_cents"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  name="Daily Revenue"
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Business Model Insights */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-purple-400">💡 VerseCoins Business Model</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-white">🔄 Prepaid Credits</p>
            <p className="text-gray-400">Users purchase VerseCoins upfront, then spend on premium access</p>
          </div>
          <div>
            <p className="font-medium text-white">💰 Revenue Recognition</p>
            <p className="text-gray-400">Revenue captured immediately when VerseCoins are purchased</p>
          </div>
          <div>
            <p className="font-medium text-white">🎯 User Control</p>
            <p className="text-gray-400">No auto-billing, users decide when and what to purchase</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Unified Revenue Dashboard</h1>
            <p className="text-gray-400">VerseCoins Economy & Subscription Analytics</p>
          </div>
          <button
            onClick={fetchUnifiedData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800 rounded-lg p-1">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'versecoins', label: '💎 VerseCoins Economy', icon: '💎' },
            { id: 'analytics', label: '📈 Purchase Analytics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'versecoins' && renderVerseCoinsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </div>
    </div>
  );
}