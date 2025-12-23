'use client';

import React from 'react';
import { 
  FiArrowUp as ArrowUpIcon, 
  FiArrowDown as ArrowDownIcon, 
  FiTrendingUp as TrendingUpIcon, 
  FiDollarSign as DollarSignIcon, 
  FiUsers as UsersIcon, 
  FiCreditCard as CreditCardIcon 
} from 'react-icons/fi';

export interface BusinessMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  ltv: number; // Lifetime Value
  growthRate: number; // Month-over-month growth rate (percentage)
  totalUsers: number;
  paidUsers: number;
  conversionRate: number; // Percentage
  churnRate: number; // Percentage
  avgRevenuePerUser: number;
}

interface MetricsGridProps {
  metrics: BusinessMetrics | null;
  isLoading?: boolean;
  error?: string | null;
}

// Mock data for development - will be replaced with real API data
const mockMetrics: BusinessMetrics = {
  mrr: 31200,
  arr: 374400,
  ltv: 285.50,
  growthRate: 12.8,
  totalUsers: 2847,
  paidUsers: 892,
  conversionRate: 31.3,
  churnRate: 4.2,
  avgRevenuePerUser: 34.98
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: value < 100 ? 2 : 0
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  description: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}

function MetricCard({ title, value, change, icon, description, trend = 'neutral', isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded mb-2 w-1/2"></div>
          <div className="h-8 bg-gray-300 rounded mb-2 w-3/4"></div>
          <div className="h-3 bg-gray-300 rounded w-full"></div>
        </div>
      </div>
    );
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    if (change === undefined) return null;
    
    if (change > 0) {
      return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    } else if (change < 0) {
      return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center text-sm font-medium text-gray-600 mb-1">
            {icon}
            <span className="ml-2">{title}</span>
          </div>
          
          <div className="flex items-end space-x-2">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {change !== undefined && (
              <div className={`flex items-center text-sm font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function MetricsGrid({ metrics, isLoading = false, error = null }: MetricsGridProps) {
  const displayMetrics = metrics || mockMetrics;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 font-semibold mb-2">Unable to Load Metrics</div>
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Key Business Metrics</h3>
        <p className="text-sm text-gray-600">
          Real-time performance indicators and growth metrics
        </p>
      </div>

      {/* Primary Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(displayMetrics.mrr)}
          change={displayMetrics.growthRate}
          icon={<DollarSignIcon className="h-5 w-5 text-blue-600" />}
          description="Current month subscription revenue"
          trend="up"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Annual Recurring Revenue"
          value={formatCurrency(displayMetrics.arr)}
          change={displayMetrics.growthRate}
          icon={<TrendingUpIcon className="h-5 w-5 text-green-600" />}
          description="Projected annual revenue"
          trend="up"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Customer Lifetime Value"
          value={formatCurrency(displayMetrics.ltv)}
          change={5.2}
          icon={<UsersIcon className="h-5 w-5 text-purple-600" />}
          description="Average revenue per customer"
          trend="up"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Growth Rate"
          value={formatPercentage(displayMetrics.growthRate)}
          change={displayMetrics.growthRate - 10.5} // Compared to previous month
          icon={<ArrowUpIcon className="h-5 w-5 text-emerald-600" />}
          description="Month-over-month growth"
          trend={displayMetrics.growthRate > 10 ? 'up' : 'neutral'}
          isLoading={isLoading}
        />
      </div>

      {/* User & Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={formatNumber(displayMetrics.totalUsers)}
          change={8.3}
          icon={<UsersIcon className="h-5 w-5 text-blue-500" />}
          description="All registered users"
          trend="up"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Paid Subscribers"
          value={formatNumber(displayMetrics.paidUsers)}
          change={12.7}
          icon={<CreditCardIcon className="h-5 w-5 text-green-500" />}
          description="Active premium subscribers"
          trend="up"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Conversion Rate"
          value={formatPercentage(displayMetrics.conversionRate)}
          change={2.4}
          icon={<TrendingUpIcon className="h-5 w-5 text-orange-500" />}
          description="Free to paid conversion"
          trend="up"
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Monthly Churn"
          value={formatPercentage(displayMetrics.churnRate)}
          change={-0.8}
          icon={<ArrowDownIcon className="h-5 w-5 text-red-500" />}
          description="Customer cancellation rate"
          trend="down" // Lower churn is better, so down trend is good
          isLoading={isLoading}
        />
      </div>

      {/* Additional Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <DollarSignIcon className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Revenue Insights</span>
        </div>
        <div className="text-xs text-blue-700 space-y-1">
          <div>• Average Revenue Per User (ARPU): {formatCurrency(displayMetrics.avgRevenuePerUser)}</div>
          <div>• SFW tier accounts for ~60% of subscription revenue</div>
          <div>• NSFW tier has 3x higher LTV than SFW tier</div>
          <div>• Voice pack revenue growing 15% month-over-month</div>
        </div>
      </div>
    </div>
  );
}