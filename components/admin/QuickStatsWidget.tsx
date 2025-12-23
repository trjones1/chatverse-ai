'use client';

import { useState, useEffect } from 'react';
import { IoTrendingUpSharp, IoTrendingDownSharp, IoRemoveSharp } from 'react-icons/io5';

interface QuickStats {
  today: {
    signups: number;
    purchases: number;
    revenue: number;
    activeUsers: number;
  };
  yesterday: {
    signups: number;
    purchases: number;
    revenue: number;
    activeUsers: number;
  };
  changes: {
    signups: number;
    purchases: number;
    revenue: number;
    activeUsers: number;
  };
}

export default function QuickStatsWidget() {
  const [data, setData] = useState<QuickStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const res = await fetch('/api/analytics/quick-stats');
      if (!res.ok) throw new Error('Failed to fetch quick stats');

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching quick stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <IoTrendingUpSharp className="w-4 h-4" />
          <span className="text-sm font-semibold">+{value.toFixed(0)}%</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <IoTrendingDownSharp className="w-4 h-4" />
          <span className="text-sm font-semibold">{value.toFixed(0)}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <IoRemoveSharp className="w-4 h-4" />
        <span className="text-sm font-semibold">0%</span>
      </div>
    );
  };

  if (isLoading && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
        <p className="text-red-800 text-sm">❌ {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: 'New Signups Today',
      value: data.today.signups,
      change: data.changes.signups,
      icon: '👥',
      color: 'blue',
    },
    {
      label: 'Purchases Today',
      value: data.today.purchases,
      change: data.changes.purchases,
      icon: '💰',
      color: 'green',
    },
    {
      label: 'Revenue Today',
      value: `$${(data.today.revenue / 100).toFixed(2)}`,
      change: data.changes.revenue,
      icon: '💵',
      color: 'yellow',
    },
    {
      label: 'Active Now',
      value: data.today.activeUsers,
      change: data.changes.activeUsers,
      icon: '🔥',
      color: 'red',
    },
  ];

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className="space-y-3">
      {/* Header with last update */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Today's Quick Stats</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">
            Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md"
          >
            {/* Colored header */}
            <div className={`bg-gradient-to-r ${colorClasses[stat.color as keyof typeof colorClasses]} p-3 text-white`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{stat.icon}</span>
                <TrendIndicator value={stat.change} />
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-2">
                vs yesterday: {stat.change > 0 ? '+' : ''}{stat.change.toFixed(0)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="text-2xl">📊</div>
            <div>
              <div className="text-sm font-semibold text-purple-900">
                Today's Performance
              </div>
              <div className="text-xs text-purple-700">
                {data.today.signups} signups • {data.today.purchases} purchases • ${(data.today.revenue / 100).toFixed(2)} revenue
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.changes.signups > 0 && data.changes.purchases > 0 && data.changes.revenue > 0 ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                📈 All metrics up!
              </span>
            ) : data.changes.signups < 0 && data.changes.purchases < 0 ? (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                📉 Needs attention
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                ➡️ Mixed performance
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
