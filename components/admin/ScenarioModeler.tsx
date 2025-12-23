'use client';

import React, { useState, useMemo } from 'react';
import { FiSettings, FiTrendingUp, FiDollarSign, FiUsers, FiRefreshCw } from 'react-icons/fi';

export interface ScenarioParams {
  growthRate: number; // Monthly growth rate percentage
  conversionRate: number; // Free to paid conversion percentage
  churnRate: number; // Monthly churn rate percentage
  avgRevenuePerUser: number; // Average revenue per user
  marketingSpend: number; // Monthly marketing spend
  newUserAcquisition: number; // New users per month
}

interface ScenarioResults {
  month: string;
  revenue: number;
  users: number;
  paidUsers: number;
  cumulativeRevenue: number;
}

interface ScenarioModelerProps {
  onScenarioChange?: (results: ScenarioResults[]) => void;
  initialParams?: Partial<ScenarioParams>;
  currentData?: {
    totalUsers: number;
    paidUsers: number;
    currentMRR: number;
  };
}

const defaultParams: ScenarioParams = {
  growthRate: 12.8, // 12.8% monthly growth
  conversionRate: 31.3, // 31.3% conversion rate
  churnRate: 4.2, // 4.2% monthly churn
  avgRevenuePerUser: 18.50, // Average revenue per user
  marketingSpend: 5000, // $5k marketing spend
  newUserAcquisition: 250 // 250 new users per month
};

const calculateScenario = (params: ScenarioParams, baselineData?: { totalUsers: number; paidUsers: number; currentMRR: number }): ScenarioResults[] => {
  const results: ScenarioResults[] = [];
  let currentUsers = baselineData?.totalUsers || 2847;
  let currentPaidUsers = baselineData?.paidUsers || 892;
  let cumulativeRevenue = 0;

  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  for (let i = 0; i < 12; i++) {
    // Add new users
    currentUsers += params.newUserAcquisition;
    
    // Calculate new conversions
    const newConversions = (currentUsers - currentPaidUsers) * (params.conversionRate / 100);
    currentPaidUsers += newConversions;
    
    // Apply churn
    currentPaidUsers = currentPaidUsers * (1 - params.churnRate / 100);
    
    // Apply growth to existing paid users
    currentPaidUsers = currentPaidUsers * (1 + params.growthRate / 100);
    
    // Calculate revenue
    const monthlyRevenue = currentPaidUsers * params.avgRevenuePerUser;
    cumulativeRevenue += monthlyRevenue;

    results.push({
      month: months[i],
      revenue: Math.round(monthlyRevenue),
      users: Math.round(currentUsers),
      paidUsers: Math.round(currentPaidUsers),
      cumulativeRevenue: Math.round(cumulativeRevenue)
    });
  }

  return results;
};

export default function ScenarioModeler({ onScenarioChange, initialParams, currentData }: ScenarioModelerProps) {
  const [params, setParams] = useState<ScenarioParams>({ ...defaultParams, ...initialParams });
  const [isExpanded, setIsExpanded] = useState(false);

  const scenarioResults = useMemo(() => {
    const results = calculateScenario(params, currentData);
    onScenarioChange?.(results);
    return results;
  }, [params, onScenarioChange, currentData]);

  const handleParamChange = (key: keyof ScenarioParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setParams(defaultParams);
  };

  const finalResults = scenarioResults[scenarioResults.length - 1];
  const initialRevenue = currentData?.currentMRR || 31200; // Use real MRR or fallback
  const projectedRevenue = finalResults?.revenue || 0;
  const revenueGrowth = initialRevenue > 0 ? ((projectedRevenue - initialRevenue) / initialRevenue) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Scenario Modeler</h3>
          <p className="text-sm text-gray-600 mt-1">
            Adjust business parameters to model growth scenarios
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
        >
          <FiSettings className="mr-2" />
          {isExpanded ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>

      {/* Quick Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <FiDollarSign className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">Projected MRR</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            ${(projectedRevenue / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-blue-700">
            {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% vs current
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <FiUsers className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-900">Total Users</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {(finalResults?.users || 0).toLocaleString()}
          </div>
          <div className="text-xs text-green-700">
            +{((finalResults?.users || (currentData?.totalUsers || 2847)) - (currentData?.totalUsers || 2847)).toLocaleString()} new users
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <FiTrendingUp className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-900">Paid Users</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {(finalResults?.paidUsers || 0).toLocaleString()}
          </div>
          <div className="text-xs text-purple-700">
            {((finalResults?.paidUsers || (currentData?.paidUsers || 892)) / (finalResults?.users || (currentData?.totalUsers || 2847)) * 100).toFixed(1)}% conversion
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <FiDollarSign className="h-5 w-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium text-orange-900">Annual Revenue</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            ${((finalResults?.cumulativeRevenue || 0) / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-orange-700">
            12-month projection
          </div>
        </div>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Scenario Parameters</h4>
            <button
              onClick={resetToDefaults}
              className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FiRefreshCw className="mr-1 h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Growth Parameters */}
            <div className="space-y-4">
              <h5 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Growth Parameters
              </h5>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Growth Rate: {params.growthRate.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="0.1"
                  value={params.growthRate}
                  onChange={(e) => handleParamChange('growthRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Users/Month: {params.newUserAcquisition}
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="10"
                  value={params.newUserAcquisition}
                  onChange={(e) => handleParamChange('newUserAcquisition', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50</span>
                  <span>1,000</span>
                </div>
              </div>
            </div>

            {/* Conversion Parameters */}
            <div className="space-y-4">
              <h5 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Conversion Metrics
              </h5>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversion Rate: {params.conversionRate.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="0.1"
                  value={params.conversionRate}
                  onChange={(e) => handleParamChange('conversionRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10%</span>
                  <span>60%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Churn: {params.churnRate.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.1"
                  value={params.churnRate}
                  onChange={(e) => handleParamChange('churnRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1%</span>
                  <span>15%</span>
                </div>
              </div>
            </div>

            {/* Revenue Parameters */}
            <div className="space-y-4">
              <h5 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Revenue Metrics
              </h5>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avg Revenue/User: ${params.avgRevenuePerUser.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="10"
                  max="35"
                  step="0.5"
                  value={params.avgRevenuePerUser}
                  onChange={(e) => handleParamChange('avgRevenuePerUser', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$9.99</span>
                  <span>$34.99</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marketing Spend: ${params.marketingSpend.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  step="500"
                  value={params.marketingSpend}
                  onChange={(e) => handleParamChange('marketingSpend', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$1K</span>
                  <span>$20K</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROI Insights */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">Scenario Insights</h5>
            <div className="text-xs text-gray-700 space-y-1">
              <div>• Customer Acquisition Cost: ${(params.marketingSpend / params.newUserAcquisition).toFixed(2)} per user</div>
              <div>• Marketing ROI: {(((projectedRevenue - initialRevenue) * 12) / (params.marketingSpend * 12) * 100).toFixed(0)}% annual return</div>
              <div>• Break-even time: ~{(params.marketingSpend / params.newUserAcquisition / params.avgRevenuePerUser * (params.conversionRate / 100)).toFixed(1)} months per user</div>
              <div>• Total addressable revenue growth: ${((projectedRevenue - initialRevenue) * 12 / 1000).toFixed(0)}K annually</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}