'use client';

import { useState, useEffect } from 'react';
import { IoChatbubblesSharp, IoTimeSharp, IoRepeatSharp, IoWarningSharp } from 'react-icons/io5';

interface EngagementData {
  avgMessagesPerUser: number;
  avgSessionDuration: number;
  returnVisitorRate: number;
  messageLimitHitRate: number;
  totalMessages: number;
  totalSessions: number;
  returningUsers: number;
  limitHits: number;
}

export default function EngagementMetricsWidget() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(7);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/analytics/engagement-metrics?days_back=${daysBack}`);
      if (!res.ok) throw new Error('Failed to fetch engagement metrics');

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching engagement metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysBack]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
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

  const metrics = [
    {
      icon: <IoChatbubblesSharp className="w-6 h-6" />,
      label: 'Avg Messages per User',
      value: data.avgMessagesPerUser.toFixed(1),
      detail: `${data.totalMessages.toLocaleString()} total messages`,
      color: 'purple',
      goodThreshold: 5,
      isGood: data.avgMessagesPerUser >= 5,
    },
    {
      icon: <IoTimeSharp className="w-6 h-6" />,
      label: 'Avg Session Duration',
      value: formatDuration(data.avgSessionDuration),
      detail: `${data.totalSessions.toLocaleString()} sessions`,
      color: 'blue',
      goodThreshold: 180, // 3 minutes
      isGood: data.avgSessionDuration >= 180,
    },
    {
      icon: <IoRepeatSharp className="w-6 h-6" />,
      label: 'Return Visitor Rate',
      value: `${data.returnVisitorRate.toFixed(1)}%`,
      detail: `${data.returningUsers.toLocaleString()} returning users`,
      color: 'green',
      goodThreshold: 30,
      isGood: data.returnVisitorRate >= 30,
    },
    {
      icon: <IoWarningSharp className="w-6 h-6" />,
      label: 'Message Limit Hit Rate',
      value: `${data.messageLimitHitRate.toFixed(1)}%`,
      detail: `${data.limitHits.toLocaleString()} users hit limit`,
      color: 'orange',
      goodThreshold: 20,
      isGood: data.messageLimitHitRate >= 20, // High is good - means engagement
    },
  ];

  const colorClasses = {
    purple: {
      bg: 'from-purple-500 to-purple-600',
      light: 'bg-purple-50 border-purple-200',
      text: 'text-purple-600',
    },
    blue: {
      bg: 'from-blue-500 to-blue-600',
      light: 'bg-blue-50 border-blue-200',
      text: 'text-blue-600',
    },
    green: {
      bg: 'from-green-500 to-green-600',
      light: 'bg-green-50 border-green-200',
      text: 'text-green-600',
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      light: 'bg-orange-50 border-orange-200',
      text: 'text-orange-600',
    },
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">User Engagement Metrics</h3>
            <p className="text-sm text-purple-100">How users interact with your app</p>
          </div>
          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setDaysBack(days)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  daysBack === days
                    ? 'bg-white text-purple-600 font-semibold'
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
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={`${colorClasses[metric.color as keyof typeof colorClasses].light} rounded-xl border-2 p-5 relative overflow-hidden`}
            >
              {/* Good/Bad indicator */}
              {metric.isGood ? (
                <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full" title="Good"></div>
              ) : (
                <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full" title="Needs improvement"></div>
              )}

              {/* Icon */}
              <div className={`${colorClasses[metric.color as keyof typeof colorClasses].text} mb-3`}>
                {metric.icon}
              </div>

              {/* Value */}
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {metric.value}
              </div>

              {/* Label */}
              <div className="text-sm font-medium text-gray-700 mb-2">
                {metric.label}
              </div>

              {/* Detail */}
              <div className="text-xs text-gray-600">
                {metric.detail}
              </div>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            <span>Engagement Insights</span>
          </h4>
          <div className="space-y-2 text-sm text-purple-800">
            {data.avgMessagesPerUser < 3 && (
              <div className="flex items-start gap-2">
                <span className="text-red-500">⚠️</span>
                <span>
                  <strong>Low message engagement:</strong> Users send fewer than 3 messages on average.
                  Consider adding prompts or improving conversation quality.
                </span>
              </div>
            )}
            {data.avgSessionDuration < 120 && (
              <div className="flex items-start gap-2">
                <span className="text-orange-500">⚠️</span>
                <span>
                  <strong>Short sessions:</strong> Users spend less than 2 minutes.
                  Improve initial engagement or add hooks to keep them interested.
                </span>
              </div>
            )}
            {data.returnVisitorRate < 20 && (
              <div className="flex items-start gap-2">
                <span className="text-yellow-500">⚠️</span>
                <span>
                  <strong>Low return rate:</strong> Only {data.returnVisitorRate.toFixed(1)}% come back.
                  Consider implementing retention emails or push notifications.
                </span>
              </div>
            )}
            {data.messageLimitHitRate > 30 && (
              <div className="flex items-start gap-2">
                <span className="text-green-500">✅</span>
                <span>
                  <strong>Great engagement!</strong> {data.messageLimitHitRate.toFixed(1)}% of users hit the message limit.
                  This is a strong conversion opportunity.
                </span>
              </div>
            )}
            {data.avgMessagesPerUser >= 5 && data.returnVisitorRate >= 30 && (
              <div className="flex items-start gap-2">
                <span className="text-green-500">✅</span>
                <span>
                  <strong>Excellent engagement:</strong> Users are highly engaged and coming back. Keep it up!
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
