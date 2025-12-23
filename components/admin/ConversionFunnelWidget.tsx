'use client';

import { useState, useEffect } from 'react';
import { IoFunnelSharp, IoArrowDownSharp } from 'react-icons/io5';

interface FunnelData {
  visitors: number;
  engaged: number;
  signups: number;
  purchases: number;
  engagementRate: number;
  signupRate: number;
  purchaseRate: number;
  overallConversionRate: number;
}

export default function ConversionFunnelWidget() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(7);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/analytics/conversion-funnel?days_back=${daysBack}`);
      if (!res.ok) throw new Error('Failed to fetch conversion funnel');

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching conversion funnel:', err);
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

  const stages = [
    {
      name: 'Visitors',
      count: data.visitors,
      color: 'bg-blue-500',
      width: 100,
      rate: 100,
      dropOff: 0,
    },
    {
      name: 'Engaged',
      count: data.engaged,
      color: 'bg-purple-500',
      width: (data.engaged / data.visitors) * 100,
      rate: data.engagementRate,
      dropOff: 100 - data.engagementRate,
    },
    {
      name: 'Signups',
      count: data.signups,
      color: 'bg-green-500',
      width: (data.signups / data.visitors) * 100,
      rate: data.signupRate,
      dropOff: data.engagementRate - data.signupRate,
    },
    {
      name: 'Purchases',
      count: data.purchases,
      color: 'bg-yellow-500',
      width: (data.purchases / data.visitors) * 100,
      rate: data.purchaseRate,
      dropOff: data.signupRate - data.purchaseRate,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <IoFunnelSharp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Conversion Funnel</h3>
              <p className="text-sm text-blue-100">
                Visitor to Purchase Journey
              </p>
            </div>
          </div>
          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setDaysBack(days)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  daysBack === days
                    ? 'bg-white text-blue-600 font-semibold'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overall Conversion Rate - Big */}
        <div className="text-center py-6 bg-white rounded-xl shadow-lg border-2 border-blue-200">
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {data.overallConversionRate.toFixed(2)}%
          </div>
          <div className="text-lg text-gray-600 font-medium">
            Overall Conversion Rate
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Visitor → Purchase
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.name}>
              {/* Stage */}
              <div className="relative">
                <div
                  className={`${stage.color} rounded-lg p-4 text-white transition-all duration-500`}
                  style={{ width: `${Math.max(stage.width, 20)}%` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg">{stage.name}</div>
                      <div className="text-sm opacity-90">
                        {stage.count.toLocaleString()} users
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-2xl">{stage.rate.toFixed(1)}%</div>
                      <div className="text-xs opacity-90">of visitors</div>
                    </div>
                  </div>
                </div>

                {/* Drop-off indicator */}
                {index < stages.length - 1 && stage.dropOff > 0 && (
                  <div className="absolute -bottom-2 right-0 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full border border-red-300">
                    -{stage.dropOff.toFixed(1)}% drop-off
                  </div>
                )}
              </div>

              {/* Arrow between stages */}
              {index < stages.length - 1 && (
                <div className="flex items-center justify-center py-2">
                  <IoArrowDownSharp className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stage Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Engagement Rate */}
          <div className="bg-white rounded-lg border border-purple-200 p-4">
            <div className="text-sm font-medium text-gray-600 mb-1">Engagement Rate</div>
            <div className="text-3xl font-bold text-purple-600">{data.engagementRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.engaged.toLocaleString()} of {data.visitors.toLocaleString()} visitors engaged
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${data.engagementRate}%` }}
              ></div>
            </div>
          </div>

          {/* Signup Conversion */}
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="text-sm font-medium text-gray-600 mb-1">Signup Conversion</div>
            <div className="text-3xl font-bold text-green-600">
              {((data.signups / data.engaged) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {data.signups.toLocaleString()} of {data.engaged.toLocaleString()} engaged signed up
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${(data.signups / data.engaged) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Purchase Conversion */}
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="text-sm font-medium text-gray-600 mb-1">Purchase Conversion</div>
            <div className="text-3xl font-bold text-yellow-600">
              {((data.purchases / data.signups) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {data.purchases.toLocaleString()} of {data.signups.toLocaleString()} signups purchased
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all duration-500"
                style={{ width: `${(data.purchases / data.signups) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Overall Conversion */}
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="text-sm font-medium text-gray-600 mb-1">Visitor to Purchase</div>
            <div className="text-3xl font-bold text-blue-600">
              {data.overallConversionRate.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {data.purchases.toLocaleString()} of {data.visitors.toLocaleString()} visitors purchased
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${data.overallConversionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📊 Key Insights</h4>
          <div className="space-y-2 text-sm text-blue-800">
            {data.engagementRate < 10 && (
              <div className="flex items-start gap-2">
                <span className="text-red-500">⚠️</span>
                <span><strong>Low engagement:</strong> Only {data.engagementRate.toFixed(1)}% of visitors engage. Consider improving first-impression UX.</span>
              </div>
            )}
            {(data.signups / data.engaged * 100) < 20 && (
              <div className="flex items-start gap-2">
                <span className="text-orange-500">⚠️</span>
                <span><strong>Signup friction:</strong> Only {((data.signups / data.engaged) * 100).toFixed(1)}% of engaged users sign up. Simplify signup flow.</span>
              </div>
            )}
            {(data.purchases / data.signups * 100) < 10 && (
              <div className="flex items-start gap-2">
                <span className="text-yellow-500">⚠️</span>
                <span><strong>Purchase conversion low:</strong> Only {((data.purchases / data.signups) * 100).toFixed(1)}% of signups purchase. Review pricing/value prop.</span>
              </div>
            )}
            {data.overallConversionRate > 1 && (
              <div className="flex items-start gap-2">
                <span className="text-green-500">✅</span>
                <span><strong>Good conversion rate:</strong> {data.overallConversionRate.toFixed(2)}% visitor-to-purchase is solid!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
