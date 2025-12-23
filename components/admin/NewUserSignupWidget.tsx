'use client';

import { useState, useEffect } from 'react';

interface NewUserStats {
  totalUsers: number;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
  growthRate24h: number;
  growthRate7d: number;
}

export default function NewUserSignupWidget() {
  const [stats, setStats] = useState<NewUserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/user-stats');
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error || 'Failed to fetch user stats');
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setError('Failed to load user statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUserStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-green-50/50 backdrop-blur px-6 py-6 shadow-lg">
        <header className="mb-6">
          <h2 className="text-xl font-semibold text-emerald-900">👥 New User Signups</h2>
          <p className="text-emerald-700 mt-1">
            Real user registrations excluding test accounts and internal emails
          </p>
        </header>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-green-50/50 backdrop-blur px-6 py-6 shadow-lg">
        <header className="mb-6">
          <h2 className="text-xl font-semibold text-emerald-900">👥 New User Signups</h2>
          <p className="text-emerald-700 mt-1">
            Real user registrations excluding test accounts and internal emails
          </p>
        </header>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">⚠️ {error}</p>
          <button
            onClick={fetchUserStats}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-green-50/50 backdrop-blur px-6 py-6 shadow-lg">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-emerald-900">👥 New User Signups</h2>
        <p className="text-emerald-700 mt-1">
          Real user registrations excluding test accounts and internal emails
        </p>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users */}
        <div className="bg-white rounded-lg border border-emerald-200 p-4">
          <div className="text-emerald-600 font-semibold text-sm uppercase tracking-wide">Total Users</div>
          <div className="text-3xl font-bold text-emerald-900 mt-1">{stats.totalUsers.toLocaleString()}</div>
          <div className="text-xs text-emerald-600 mt-1">All time registrations</div>
        </div>

        {/* Last 24 Hours */}
        <div className="bg-white rounded-lg border border-emerald-200 p-4">
          <div className="text-emerald-600 font-semibold text-sm uppercase tracking-wide">Last 24h</div>
          <div className="text-3xl font-bold text-emerald-900 mt-1">{stats.last24Hours}</div>
          <div className="text-xs text-emerald-600 mt-1">
            {stats.growthRate24h > 0 ? '+' : ''}{stats.growthRate24h.toFixed(1)}% vs previous day
          </div>
        </div>

        {/* Last 7 Days */}
        <div className="bg-white rounded-lg border border-emerald-200 p-4">
          <div className="text-emerald-600 font-semibold text-sm uppercase tracking-wide">Last 7 Days</div>
          <div className="text-3xl font-bold text-emerald-900 mt-1">{stats.last7Days}</div>
          <div className="text-xs text-emerald-600 mt-1">
            {stats.growthRate7d > 0 ? '+' : ''}{stats.growthRate7d.toFixed(1)}% vs previous week
          </div>
        </div>

        {/* Last 30 Days */}
        <div className="bg-white rounded-lg border border-emerald-200 p-4">
          <div className="text-emerald-600 font-semibold text-sm uppercase tracking-wide">Last 30 Days</div>
          <div className="text-3xl font-bold text-emerald-900 mt-1">{stats.last30Days}</div>
          <div className="text-xs text-emerald-600 mt-1">Recent signups</div>
        </div>
      </div>

      {/* Growth Indicators */}
      <div className="bg-white/60 rounded-lg border border-emerald-200 p-4">
        <h3 className="font-semibold text-emerald-900 mb-3">📈 Growth Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${stats.growthRate24h >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-700">
              Daily Growth: {stats.growthRate24h >= 0 ? '↗️' : '↘️'} {Math.abs(stats.growthRate24h).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${stats.growthRate7d >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-700">
              Weekly Growth: {stats.growthRate7d >= 0 ? '↗️' : '↘️'} {Math.abs(stats.growthRate7d).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="mt-4 text-xs text-emerald-600/80">
        📊 Excludes: @chatverse.ai emails and test account IDs • Updates every 5 minutes
      </div>
    </div>
  );
}