'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PageViewData {
  totalPageViews: number;
  uniqueVisitors: number;
  engagedVisitors: number;
  trueBounceRate: number;
  avgTimeOnPage: number;
  authenticatedViews: number;
  anonymousViews: number;
  daysBack: number;
  characterKey: string | null;
}

export default function PageViewAnalytics() {
  const [data, setData] = useState<PageViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(7);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/analytics/page-views?days_back=${daysBack}`);
        if (!res.ok) {
          throw new Error('Failed to fetch page view analytics');
        }

        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Error fetching page view analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [daysBack]);

  const formatTime = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading page view analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">❌ {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">No page view data available</p>
      </div>
    );
  }

  const engagementRate = data.uniqueVisitors > 0
    ? ((data.engagedVisitors / data.uniqueVisitors) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
        <div className="flex gap-2">
          {[7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setDaysBack(days)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                daysBack === days
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Page Views */}
        <div className="bg-white rounded-lg border border-teal-200 p-4 shadow-sm">
          <div className="text-teal-700 text-sm font-medium mb-1">Total Page Views</div>
          <div className="text-3xl font-bold text-teal-900">{data.totalPageViews.toLocaleString()}</div>
          <div className="text-xs text-gray-600 mt-1">
            Last {data.daysBack} days
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
          <div className="text-blue-700 text-sm font-medium mb-1">Unique Visitors</div>
          <div className="text-3xl font-bold text-blue-900">{data.uniqueVisitors.toLocaleString()}</div>
          <div className="text-xs text-gray-600 mt-1">
            {data.authenticatedViews} auth · {data.anonymousViews} anon
          </div>
        </div>

        {/* True Bounce Rate */}
        <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
          <div className="text-red-700 text-sm font-medium mb-1">True Bounce Rate</div>
          <div className="text-3xl font-bold text-red-900">{data.trueBounceRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-600 mt-1">
            Visitors who never engaged
          </div>
        </div>

        {/* Avg Time on Page */}
        <div className="bg-white rounded-lg border border-purple-200 p-4 shadow-sm">
          <div className="text-purple-700 text-sm font-medium mb-1">Avg Time on Page</div>
          <div className="text-3xl font-bold text-purple-900">{formatTime(data.avgTimeOnPage)}</div>
          <div className="text-xs text-gray-600 mt-1">
            Average session duration
          </div>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Engaged Visitors */}
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-green-700 text-sm font-medium mb-1">Engaged Visitors</div>
          <div className="text-2xl font-bold text-green-900">{data.engagedVisitors.toLocaleString()}</div>
          <div className="text-xs text-gray-600 mt-1">
            {engagementRate}% engagement rate
          </div>
        </div>

        {/* Authenticated Views */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-blue-700 text-sm font-medium mb-1">Authenticated Views</div>
          <div className="text-2xl font-bold text-blue-900">{data.authenticatedViews.toLocaleString()}</div>
          <div className="text-xs text-gray-600 mt-1">
            {((data.authenticatedViews / data.totalPageViews) * 100).toFixed(1)}% of total
          </div>
        </div>

        {/* Anonymous Views */}
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="text-orange-700 text-sm font-medium mb-1">Anonymous Views</div>
          <div className="text-2xl font-bold text-orange-900">{data.anonymousViews.toLocaleString()}</div>
          <div className="text-xs text-gray-600 mt-1">
            {((data.anonymousViews / data.totalPageViews) * 100).toFixed(1)}% of total
          </div>
        </div>
      </div>

      {/* View Chat History Link */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-teal-900 font-semibold mb-1">💬 View Individual Conversations</h3>
            <p className="text-teal-700 text-sm">
              See what users are saying in their chat sessions
            </p>
          </div>
          <Link
            href="/admin/chat-history"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
          >
            Chat History →
          </Link>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <h5 className="font-semibold text-teal-900 mb-2">📊 About These Metrics</h5>
        <div className="text-sm text-teal-800 space-y-1">
          <div>• <strong>True Bounce Rate:</strong> Percentage of visitors who never engaged (sent a message)</div>
          <div>• <strong>Engaged Visitors:</strong> Unique users who sent at least one message</div>
          <div>• <strong>Avg Time on Page:</strong> Average session duration across all visitors</div>
          <div>• <strong>Authenticated vs Anonymous:</strong> Breakdown of logged-in vs guest traffic</div>
        </div>
      </div>
    </div>
  );
}
