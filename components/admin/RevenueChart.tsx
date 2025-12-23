'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export interface RevenueData {
  month: string;
  revenue: number;
  sfwRevenue: number;
  nsfwRevenue: number;
  voiceRevenue: number;
  projection?: boolean;
}

interface RevenueChartProps {
  data: RevenueData[];
  isLoading?: boolean;
  error?: string | null;
}

// Mock data for development - will be replaced with real API data
const mockRevenueData: RevenueData[] = [
  { month: 'Jan', revenue: 12500, sfwRevenue: 7500, nsfwRevenue: 4200, voiceRevenue: 800 },
  { month: 'Feb', revenue: 15200, sfwRevenue: 9100, nsfwRevenue: 5100, voiceRevenue: 1000 },
  { month: 'Mar', revenue: 18900, sfwRevenue: 11200, nsfwRevenue: 6400, voiceRevenue: 1300 },
  { month: 'Apr', revenue: 22100, sfwRevenue: 13000, nsfwRevenue: 7600, voiceRevenue: 1500 },
  { month: 'May', revenue: 26800, sfwRevenue: 15700, nsfwRevenue: 9200, voiceRevenue: 1900 },
  { month: 'Jun', revenue: 31200, sfwRevenue: 18200, nsfwRevenue: 10800, voiceRevenue: 2200 },
  { month: 'Jul', revenue: 35600, sfwRevenue: 20700, nsfwRevenue: 12400, voiceRevenue: 2500, projection: true },
  { month: 'Aug', revenue: 40800, sfwRevenue: 23600, nsfwRevenue: 14200, voiceRevenue: 3000, projection: true },
  { month: 'Sep', revenue: 46200, sfwRevenue: 26700, nsfwRevenue: 16100, voiceRevenue: 3400, projection: true },
  { month: 'Oct', revenue: 52100, sfwRevenue: 30100, nsfwRevenue: 18200, voiceRevenue: 3800, projection: true },
  { month: 'Nov', revenue: 58500, sfwRevenue: 33800, nsfwRevenue: 20400, voiceRevenue: 4300, projection: true },
  { month: 'Dec', revenue: 65400, sfwRevenue: 37700, nsfwRevenue: 22800, voiceRevenue: 4900, projection: true }
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    const isProjection = data?.projection;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px]">
        <h4 className="font-semibold text-gray-900 mb-2">
          {label} {isProjection && '(Projected)'}
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-blue-600">Total Revenue:</span>
            <span className="font-semibold">{formatCurrency(data?.revenue || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-green-600">SFW ($9.99):</span>
            <span>{formatCurrency(data?.sfwRevenue || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-600">NSFW ($34.99):</span>
            <span>{formatCurrency(data?.nsfwRevenue || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-orange-600">Voice Packs:</span>
            <span>{formatCurrency(data?.voiceRevenue || 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data, isLoading = false, error = null }: RevenueChartProps) {
  const chartData = useMemo(() => {
    return data && data.length > 0 ? data : mockRevenueData;
  }, [data]);

  const currentMonthIndex = useMemo(() => {
    return chartData.findIndex(item => !item.projection);
  }, [chartData]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 font-semibold mb-2">Unable to Load Revenue Data</div>
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4 w-1/3"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">12-Month Revenue Projection</h3>
        <p className="text-sm text-gray-600 mt-1">
          Historical data through current month, projections based on growth trends
        </p>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Main revenue area with gradient */}
            <Area
              type="monotone"
              dataKey="revenue"
              stackId="1"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="Total Revenue"
            />
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          Actual Revenue
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 border-2 border-blue-500 border-dashed rounded-full mr-2"></div>
          Projected Revenue
        </div>
        <div className="ml-auto text-right">
          Based on SFW ($9.99), NSFW ($34.99), and Voice Pack sales
        </div>
      </div>
    </div>
  );
}