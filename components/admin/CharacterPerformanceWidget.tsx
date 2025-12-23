'use client';

import { useState, useEffect } from 'react';
import { IoPersonSharp, IoChatbubblesSharp, IoTrendingUpSharp, IoCashSharp } from 'react-icons/io5';

interface CharacterStats {
  character: string;
  messages: {
    total: number;
    uniqueUsers: number;
    avgPerUser: number;
  };
  pageViews: {
    total: number;
    uniqueVisitors: number;
    engagedVisitors: number;
    engagementRate: number;
  };
  purchases: {
    total: number;
    uniquePurchasers: number;
    totalRevenue: number;
    avgRevenuePerPurchaser: number;
    conversionRate: number;
  };
}

interface CharacterPerformanceData {
  characters: CharacterStats[];
  period: string;
}

export default function CharacterPerformanceWidget() {
  const [data, setData] = useState<CharacterPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);
  const [sortBy, setSortBy] = useState<'visitors' | 'engagement' | 'revenue'>('visitors');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/analytics/character-performance?days_back=${daysBack}`);
      if (!res.ok) throw new Error('Failed to fetch character performance');

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching character performance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysBack]);

  const getSortedCharacters = (characters: CharacterStats[]) => {
    const sorted = [...characters];
    switch (sortBy) {
      case 'engagement':
        return sorted.sort((a, b) => b.pageViews.engagementRate - a.pageViews.engagementRate);
      case 'revenue':
        return sorted.sort((a, b) => b.purchases.totalRevenue - a.purchases.totalRevenue);
      case 'visitors':
      default:
        return sorted.sort((a, b) => b.pageViews.uniqueVisitors - a.pageViews.uniqueVisitors);
    }
  };

  const getCharacterEmoji = (character: string) => {
    const emojis: Record<string, string> = {
      lexi: '💋',
      chase: '🎭',
      nyx: '🌙',
      aria: '✨',
      zara: '🔥',
      knox: '💪',
      blaze: '⚡',
    };
    return emojis[character] || '👤';
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
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

  const sortedCharacters = getSortedCharacters(data.characters);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Character Performance</h3>
            <p className="text-sm text-indigo-100">Compare character engagement and revenue</p>
          </div>
          <div className="flex gap-2">
            {/* Sort options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 text-sm rounded-lg bg-white/20 text-white border border-white/30 hover:bg-white/30 cursor-pointer"
            >
              <option value="visitors">Most Popular</option>
              <option value="engagement">Most Engaging</option>
              <option value="revenue">Highest Revenue</option>
            </select>
            {/* Time range */}
            {[7, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setDaysBack(days)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  daysBack === days
                    ? 'bg-white text-indigo-600 font-semibold'
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
        {/* Character Cards */}
        <div className="space-y-4">
          {sortedCharacters.map((char, index) => (
            <div
              key={char.character}
              className="border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{getCharacterEmoji(char.character)}</div>
                  <div>
                    <h4 className="text-xl font-bold capitalize">{char.character}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">#{index + 1}</span>
                      <span>•</span>
                      <span>{char.pageViews.uniqueVisitors.toLocaleString()} visitors</span>
                    </div>
                  </div>
                </div>
                {/* Key metric badge */}
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase">Engagement</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {char.pageViews.engagementRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                {/* Visitors */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <IoPersonSharp className="w-4 h-4" />
                    <span className="text-xs font-medium">Visitors</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {char.pageViews.uniqueVisitors.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">
                    {char.pageViews.engagedVisitors} engaged
                  </div>
                </div>

                {/* Messages */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <IoChatbubblesSharp className="w-4 h-4" />
                    <span className="text-xs font-medium">Messages</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {char.messages.total.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">
                    {char.messages.avgPerUser.toFixed(1)} avg/user
                  </div>
                </div>

                {/* Conversion */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <IoTrendingUpSharp className="w-4 h-4" />
                    <span className="text-xs font-medium">Conversion</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {char.purchases.conversionRate.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-600">
                    {char.purchases.total} purchases
                  </div>
                </div>

                {/* Revenue */}
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-center gap-2 text-yellow-700 mb-1">
                    <IoCashSharp className="w-4 h-4" />
                    <span className="text-xs font-medium">Revenue</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(char.purchases.totalRevenue)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {char.purchases.uniquePurchasers} buyers
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Insights */}
        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4">
          <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            <span>Insights</span>
          </h4>
          <div className="space-y-2 text-sm text-indigo-800">
            {(() => {
              const topVisitor = sortedCharacters[0];
              const topRevenue = [...sortedCharacters].sort((a, b) => b.purchases.totalRevenue - a.purchases.totalRevenue)[0];
              const topEngagement = [...sortedCharacters].sort((a, b) => b.pageViews.engagementRate - a.pageViews.engagementRate)[0];

              return (
                <>
                  <div className="flex items-start gap-2">
                    <span>👑</span>
                    <span>
                      <strong className="capitalize">{topVisitor.character}</strong> is your most popular character with{' '}
                      {topVisitor.pageViews.uniqueVisitors.toLocaleString()} visitors
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>💰</span>
                    <span>
                      <strong className="capitalize">{topRevenue.character}</strong> generates the most revenue at{' '}
                      {formatCurrency(topRevenue.purchases.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>🔥</span>
                    <span>
                      <strong className="capitalize">{topEngagement.character}</strong> has the highest engagement rate at{' '}
                      {topEngagement.pageViews.engagementRate.toFixed(1)}%
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
