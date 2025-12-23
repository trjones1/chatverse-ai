'use client';

import React, { useState, useEffect } from 'react';

interface UserActivityMetrics {
  totalUsers: number;
  freeUsers: number;
  anonymousUsers: number;
  messagingActivity: {
    totalMessages: number;
    messagesLast7Days: number;
    messagesLast30Days: number;
    avgMessagesPerUser: number;
    avgMessagesPerSession: number;
  };
  userEngagement: {
    bounceRate: number;
    lowEngagement: number;
    mediumEngagement: number;
    highEngagement: number;
  };
  sessionData: {
    avgSessionLength: number;
    totalSessions: number;
    returningUsers: number;
    newUsers: number;
  };
  characterPopularity: Array<{
    character: string;
    messageCount: number;
    uniqueUsers: number;
  }>;
}

interface ActivityResponse {
  success: boolean;
  data: UserActivityMetrics;
  generatedAt: string;
  note: string;
}

export default function UserActivityDashboard() {
  const [data, setData] = useState<UserActivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/user-activity');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ActivityResponse = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date(result.generatedAt).toLocaleString());
        setError(null);
      } else {
        throw new Error('Failed to fetch user activity data');
      }
    } catch (err) {
      console.error('Failed to fetch user activity data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-4">Error Loading User Activity</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchActivityData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const getEngagementColor = (bounceRate: number) => {
    if (bounceRate > 80) return 'text-red-600';
    if (bounceRate > 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">User Activity Overview</h3>
          <p className="text-gray-600">
            Free chat usage, bounce rates, and user engagement metrics
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
          <button
            onClick={fetchActivityData}
            disabled={loading}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Users</div>
          <div className="text-2xl font-bold text-gray-900">{data.totalUsers.toLocaleString()}</div>
          <p className="text-xs text-gray-600 mt-1">
            {data.freeUsers} free • {data.anonymousUsers} never messaged
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-2">Bounce Rate</div>
          <div className={`text-2xl font-bold ${getEngagementColor(data.userEngagement.bounceRate)}`}>
            {data.userEngagement.bounceRate.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Users with 0-1 messages
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-2">Messages (30d)</div>
          <div className="text-2xl font-bold text-gray-900">
            {data.messagingActivity.messagesLast30Days.toLocaleString()}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {data.messagingActivity.messagesLast7Days.toLocaleString()} in last 7 days
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-2">Avg Session Length</div>
          <div className="text-2xl font-bold text-gray-900">
            {data.sessionData.avgSessionLength.toFixed(1)}min
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {data.messagingActivity.avgMessagesPerSession.toFixed(1)} msgs/session
          </p>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">User Engagement Levels</h4>
          <p className="text-sm text-gray-600 mb-6">Distribution of users by message activity</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600">🔴 Bounce (0-1 messages)</span>
              <span className="font-medium">
                {(data.userEngagement.bounceRate).toFixed(1)}% of users
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-yellow-600">🟡 Low (2-5 messages)</span>
              <span className="font-medium">{data.userEngagement.lowEngagement} users</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-600">🔵 Medium (6-20 messages)</span>
              <span className="font-medium">{data.userEngagement.mediumEngagement} users</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600">🟢 High (20+ messages)</span>
              <span className="font-medium">{data.userEngagement.highEngagement} users</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Character Popularity</h4>
          <p className="text-sm text-gray-600 mb-6">Message volume by AI character</p>
          <div className="space-y-3">
            {data.characterPopularity.slice(0, 6).map((char, index) => (
              <div key={char.character} className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium capitalize">{char.character}</span>
                  <span className="text-xs text-gray-500">({char.uniqueUsers} users)</span>
                </div>
                <span className="text-sm font-medium">
                  {char.messageCount.toLocaleString()} msgs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Activity Metrics</h4>
        <p className="text-sm text-gray-600 mb-6">Comprehensive user behavior analysis</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h5 className="font-medium text-gray-900 mb-3">Message Activity</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Messages:</span>
                <span className="font-medium">{data.messagingActivity.totalMessages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg per User:</span>
                <span className="font-medium">{data.messagingActivity.avgMessagesPerUser.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg per Session:</span>
                <span className="font-medium">{data.messagingActivity.avgMessagesPerSession.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-3">Session Data</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sessions:</span>
                <span className="font-medium">{data.sessionData.totalSessions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Returning Users:</span>
                <span className="font-medium">{data.sessionData.returningUsers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Users:</span>
                <span className="font-medium">{data.sessionData.newUsers.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-3">User Types</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Free Users:</span>
                <span className="font-medium">{data.freeUsers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Anonymous:</span>
                <span className="font-medium">{data.anonymousUsers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Users:</span>
                <span className="font-medium">
                  {(data.totalUsers - data.anonymousUsers).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-800 mb-4">🔍 Key Insights</h4>
        <div className="space-y-2 text-sm text-blue-700">
          <p>• <strong>Bounce Rate:</strong> {data.userEngagement.bounceRate.toFixed(1)}% of users send 0-1 messages before leaving</p>
          <p>• <strong>High Engagement:</strong> {data.userEngagement.highEngagement} users are highly engaged (20+ messages)</p>
          <p>• <strong>Most Popular:</strong> {data.characterPopularity[0]?.character} with {data.characterPopularity[0]?.messageCount.toLocaleString()} messages</p>
          <p>• <strong>Session Quality:</strong> Average {data.sessionData.avgSessionLength.toFixed(1)} minutes per session</p>
          <p>• <strong>Free Usage:</strong> {data.freeUsers.toLocaleString()} users are using free tier ({((data.freeUsers / data.totalUsers) * 100).toFixed(1)}%)</p>
        </div>
      </div>
    </div>
  );
}