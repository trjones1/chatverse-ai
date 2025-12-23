'use client';

import { useState, useEffect } from 'react';
import { IoTimeSharp, IoCalendarSharp, IoTrendingUpSharp } from 'react-icons/io5';

interface HourlyStats {
  hour: number;
  hourLabel: string;
  visitors: number;
  messages: number;
}

interface DailyStats {
  day: number;
  dayName: string;
  visitors: number;
  messages: number;
}

interface TimeBasedData {
  hourly: HourlyStats[];
  daily: DailyStats[];
  peaks: {
    hour: {
      hour: number;
      label: string;
      visitors: number;
      messages: number;
    };
    day: {
      day: number;
      name: string;
      visitors: number;
      messages: number;
    };
  };
  averages: {
    hourlyVisitors: number;
    dailyVisitors: number;
  };
}

export default function TimeBasedAnalyticsWidget() {
  const [data, setData] = useState<TimeBasedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);
  const [viewMode, setViewMode] = useState<'hourly' | 'daily'>('hourly');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/analytics/time-based?days_back=${daysBack}`);
      if (!res.ok) throw new Error('Failed to fetch time-based analytics');

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching time-based analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysBack]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <p className="text-red-800">❌ {error || 'No data available'}</p>
      </div>
    );
  }

  const maxVisitors = viewMode === 'hourly'
    ? Math.max(...data.hourly.map(h => h.visitors))
    : Math.max(...data.daily.map(d => d.visitors));

  const stats = viewMode === 'hourly' ? data.hourly : data.daily;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Time-Based Analytics</h3>
            <p className="text-sm text-cyan-100">Discover peak hours and days</p>
          </div>
          <div className="flex gap-2">
            {/* View mode toggle */}
            <div className="flex bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('hourly')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'hourly'
                    ? 'bg-white text-cyan-600 font-semibold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Hourly
              </button>
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-white text-cyan-600 font-semibold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Daily
              </button>
            </div>
            {/* Time range */}
            {[7, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setDaysBack(days)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  daysBack === days
                    ? 'bg-white text-cyan-600 font-semibold'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Peak Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Peak Hour */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <IoTimeSharp className="w-5 h-5" />
              <span className="font-semibold">Peak Hour</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {data.peaks.hour.label}
            </div>
            <div className="text-sm text-gray-600">
              {data.peaks.hour.visitors.toLocaleString()} visitors · {data.peaks.hour.messages.toLocaleString()} messages
            </div>
          </div>

          {/* Peak Day */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <IoCalendarSharp className="w-5 h-5" />
              <span className="font-semibold">Peak Day</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {data.peaks.day.name}
            </div>
            <div className="text-sm text-gray-600">
              {data.peaks.day.visitors.toLocaleString()} visitors · {data.peaks.day.messages.toLocaleString()} messages
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">
              {viewMode === 'hourly' ? 'Hourly Traffic' : 'Daily Traffic'}
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <IoTrendingUpSharp className="w-4 h-4" />
              <span>
                Avg: {viewMode === 'hourly' ? data.averages.hourlyVisitors : data.averages.dailyVisitors} visitors
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {stats.map((stat, index) => {
              const width = maxVisitors > 0 ? (stat.visitors / maxVisitors) * 100 : 0;
              const isPeak = viewMode === 'hourly'
                ? (stat as HourlyStats).hour === data.peaks.hour.hour
                : (stat as DailyStats).day === data.peaks.day.day;

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-gray-700 text-right">
                    {viewMode === 'hourly' ? (stat as HourlyStats).hourLabel : (stat as DailyStats).dayName}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 bg-gray-200 rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg transition-all ${
                          isPeak
                            ? 'bg-gradient-to-r from-orange-400 to-red-500'
                            : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                        }`}
                        style={{ width: `${width}%` }}
                      >
                        {width > 15 && (
                          <div className="flex items-center justify-between px-3 h-full text-white text-sm font-semibold">
                            <span>{stat.visitors.toLocaleString()} visitors</span>
                            {isPeak && <span>🔥</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    {width <= 15 && width > 0 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                        {stat.visitors.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="w-24 text-sm text-gray-600 text-right">
                    {stat.messages.toLocaleString()} msgs
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-lg p-4">
          <h4 className="font-semibold text-cyan-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            <span>Timing Insights</span>
          </h4>
          <div className="space-y-2 text-sm text-cyan-800">
            <div className="flex items-start gap-2">
              <span>🔥</span>
              <span>
                Peak activity is at <strong>{data.peaks.hour.label} UTC</strong> with{' '}
                {data.peaks.hour.visitors.toLocaleString()} visitors
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span>📅</span>
              <span>
                <strong>{data.peaks.day.name}s</strong> are your busiest days with{' '}
                {data.peaks.day.visitors.toLocaleString()} visitors on average
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span>💡</span>
              <span>
                Consider scheduling promotions or new content releases during peak hours for maximum impact
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
