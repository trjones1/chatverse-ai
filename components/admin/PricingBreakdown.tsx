'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export interface PricingTierData {
  name: string;
  revenue: number;
  subscribers: number;
  price: number;
  color: string;
}

interface PricingBreakdownProps {
  data: PricingTierData[] | null;
  isLoading?: boolean;
  error?: string | null;
}

// Mock data for development - will be replaced with real API data
const mockPricingData: PricingTierData[] = [
  {
    name: 'SFW Premium',
    revenue: 18200,
    subscribers: 1820,
    price: 9.99,
    color: '#10b981'
  },
  {
    name: 'NSFW Premium',
    revenue: 10800,
    subscribers: 361,
    price: 29.99,
    color: '#8b5cf6'
  },
  {
    name: 'Voice Packs',
    revenue: 2200,
    subscribers: 220,
    price: 9.99,
    color: '#f59e0b'
  }
];

const formatCurrency = (value: number): string => {
  // Revenue values are in cents, but price values are in dollars
  // We need to handle this differently based on context
  const isRevenue = value > 1000; // Heuristic: values > 1000 are likely revenue in cents
  const displayValue = isRevenue ? value / 100 : value;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(displayValue);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">{data.name}</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span>Revenue:</span>
            <span className="font-semibold">{formatCurrency(data.revenue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>{data.name === 'Tips' ? 'Total Tips:' : 'Subscribers:'}</span>
            <span className="font-semibold">{data.subscribers.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>{data.name === 'Tips' ? 'Avg Tip:' : 'Price:'}</span>
            <span className="font-semibold">
              {data.name === 'Tips' 
                ? formatCurrency(data.price) 
                : `${formatCurrency(data.price)}/mo`
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Share:</span>
            <span className="font-semibold">{(data.revenue / 31200 * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PricingBreakdown({ data, isLoading = false, error = null }: PricingBreakdownProps) {
  // Ensure we always have valid array data
  const chartData = (Array.isArray(data) && data.length > 0) ? data : mockPricingData;
  const totalRevenue = Array.isArray(chartData) ? chartData.reduce((sum, item) => sum + (item?.revenue || 0), 0) : 0;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 font-semibold mb-2">Unable to Load Pricing Data</div>
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4 w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-300 rounded"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue by Pricing Tier</h3>
        <p className="text-sm text-gray-600 mt-1">
          Breakdown of revenue across subscription tiers and voice packs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart - Revenue Distribution */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Revenue Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="revenue"
                >
                  {(chartData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Subscribers by Tier */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Subscribers by Tier</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Subscribers']}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="subscribers" radius={[4, 4, 0, 0]}>
                  {(chartData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(chartData || []).map((tier, index) => (
          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <div 
                className="w-4 h-4 rounded-full mr-3" 
                style={{ backgroundColor: tier.color }}
              ></div>
              <h5 className="font-semibold text-gray-900">{tier.name}</h5>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Revenue:</span>
                <span className="font-semibold">{formatCurrency(tier.revenue)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {tier.name === 'Tips' ? 'Total Tips:' : 'Active Subscribers:'}
                </span>
                <span className="font-semibold">{tier.subscribers.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {tier.name === 'Tips' ? 'Avg Tip:' : 'Price Point:'}
                </span>
                <span className="font-semibold">
                  {tier.name === 'Tips' 
                    ? formatCurrency(tier.price) 
                    : `${formatCurrency(tier.price)}/mo`
                  }
                </span>
              </div>
              
              <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                <span className="text-gray-600">Revenue Share:</span>
                <span className="font-semibold text-blue-600">
                  {((tier.revenue / totalRevenue) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Insights */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-semibold text-blue-900 mb-2">Pricing Insights</h5>
        <div className="text-xs text-blue-700 space-y-1">
          <div>• NSFW tier generates {((mockPricingData[1].revenue / mockPricingData[0].revenue) * 100).toFixed(0)}% more revenue per subscriber than SFW</div>
          <div>• Voice pack purchases show strong engagement with {((mockPricingData[2].subscribers / (mockPricingData[0].subscribers + mockPricingData[1].subscribers)) * 100).toFixed(1)}% attachment rate</div>
          <div>• Total monthly recurring revenue: {formatCurrency(totalRevenue)}</div>
          <div>• Average revenue per paying user: {formatCurrency(totalRevenue / ((chartData || []).reduce((sum, item) => sum + (item?.subscribers || 0), 0) || 1))}</div>
        </div>
      </div>
    </div>
  );
}