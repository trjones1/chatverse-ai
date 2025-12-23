'use client';

import { useState, useEffect } from 'react';
import { IoPersonSharp, IoPeopleSharp, IoTrophySharp, IoTimeSharp } from 'react-icons/io5';

interface ActiveUsersData {
  current: {
    total: number;
    authenticated: number;
    anonymous: number;
    byCharacter: Record<string, number>;
  };
  peaks: {
    today: { count: number; time: string | null };
    thisWeek: { count: number; time: string | null };
    allTime: { count: number; time: string | null };
  };
}

export default function ActiveUsersWidget() {
  const [data, setData] = useState<ActiveUsersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const res = await fetch('/api/analytics/active-users');
      if (!res.ok) throw new Error('Failed to fetch active users');

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching active users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString();
  };

  if (isLoading && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <p className="text-red-800">❌ {error}</p>
      </div>
    );
  }

  const current = data?.current || { total: 0, authenticated: 0, anonymous: 0, byCharacter: {} };
  const peaks = data?.peaks || {
    today: { count: 0, time: null },
    thisWeek: { count: 0, time: null },
    allTime: { count: 0, time: null }
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <IoPeopleSharp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Real-Time Active Users</h3>
              <p className="text-sm text-green-100">
                Live · Updated {formatTime(lastUpdate.toISOString())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">LIVE</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Active Users - BIG */}
        <div className="text-center py-8 bg-white rounded-xl shadow-lg border-2 border-green-200">
          <div className="text-6xl font-bold text-green-600 mb-2">
            {current.total}
          </div>
          <div className="text-lg text-gray-600 font-medium">
            Active Users Right Now
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <IoPersonSharp className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">
                <strong className="text-blue-600">{current.authenticated}</strong> Logged In
              </span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <IoPersonSharp className="w-4 h-4 text-orange-500" />
              <span className="text-gray-600">
                <strong className="text-orange-600">{current.anonymous}</strong> Anonymous
              </span>
            </div>
          </div>
        </div>

        {/* Peak Concurrent Users */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's Peak */}
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <IoTrophySharp className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Today's Peak</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{peaks.today.count}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <IoTimeSharp className="w-3 h-3" />
              {formatTime(peaks.today.time)}
            </div>
          </div>

          {/* This Week's Peak */}
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <IoTrophySharp className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">This Week's Peak</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{peaks.thisWeek.count}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <IoTimeSharp className="w-3 h-3" />
              {formatTime(peaks.thisWeek.time)}
            </div>
          </div>

          {/* All-Time Peak */}
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <IoTrophySharp className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600">All-Time Peak</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{peaks.allTime.count}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <IoTimeSharp className="w-3 h-3" />
              {formatTime(peaks.allTime.time)}
            </div>
          </div>
        </div>

        {/* By Character Breakdown */}
        {Object.keys(current.byCharacter).length > 0 && (
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Active by Character</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(current.byCharacter)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([character, count]) => (
                  <div key={character} className="text-center">
                    <div className="text-2xl font-bold text-green-600">{count as number}</div>
                    <div className="text-xs text-gray-600 capitalize">{character}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-800">
            <strong>How it works:</strong> Users are counted as "active" if they've interacted with the site in the last 5 minutes.
            Stats update every 10 seconds. Peak counts are tracked throughout the day.
          </p>
        </div>
      </div>
    </div>
  );
}
