// components/MessagePerformanceMonitor.tsx - Performance monitoring and user warnings
'use client';

import React, { useState, useEffect } from 'react';
import themeColors from '../utils/theme';

interface PerformanceMonitorProps {
  character: string;
  performance: {
    loadTimeMs: number;
    warningLevel: 'none' | 'approaching_limit' | 'performance_warning' | 'critical';
    archivedCount: number;
  };
  pagination: {
    totalMessages: number;
    userLimit: number;
  };
  onArchiveOld?: () => Promise<void>;
  onExport?: (format: 'json' | 'txt' | 'csv') => Promise<void>;
  onUpgrade?: () => void;
}

interface DashboardData {
  overview: {
    activeMessages: number;
    messageLimit: number;
    usagePercentage: number;
    archivedMessages: number;
    activeSessions: number;
    userTier: string;
  };
  warning: {
    level: string;
    message: string;
    suggestions: string[];
  };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
  }>;
}

export default function MessagePerformanceMonitor({
  character,
  performance,
  pagination,
  onArchiveOld,
  onExport,
  onUpgrade
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const theme = themeColors[character.toLowerCase()] || themeColors.default;
  const usagePercentage = Math.round((pagination.totalMessages / pagination.userLimit) * 100);

  // Auto-expand for warnings
  useEffect(() => {
    if (performance.warningLevel !== 'none') {
      setIsExpanded(true);
    }
  }, [performance.warningLevel]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/messages/performance?character=${character}&action=dashboard`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && !dashboardData) {
      fetchDashboard();
    }
  }, [isExpanded, dashboardData]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'archive_old':
          if (onArchiveOld) await onArchiveOld();
          break;
        case 'export_json':
          if (onExport) await onExport('json');
          break;
        case 'export_txt':
          if (onExport) await onExport('txt');
          break;
        case 'export_csv':
          if (onExport) await onExport('csv');
          break;
        case 'upgrade_premium':
        case 'upgrade_premium_plus':
          if (onUpgrade) onUpgrade();
          break;
      }
    } catch (error) {
      console.error(`Error performing action ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ef4444';
      case 'performance_warning': return '#f59e0b';
      case 'approaching_limit': return '#eab308';
      default: return theme.accent;
    }
  };

  const getWarningIcon = (level: string) => {
    switch (level) {
      case 'critical': return '🚨';
      case 'performance_warning': return '⚠️';
      case 'approaching_limit': return '📊';
      default: return '✅';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Header - Always visible */}
      <div 
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: performance.warningLevel !== 'none' 
            ? `linear-gradient(45deg, ${getWarningColor(performance.warningLevel)}22, transparent)`
            : 'transparent'
        }}
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{getWarningIcon(performance.warningLevel)}</span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-800">
                {pagination.totalMessages}/{pagination.userLimit} messages
              </span>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(usagePercentage, 100)}%`,
                    backgroundColor: getWarningColor(performance.warningLevel)
                  }}
                />
              </div>
              <span className="text-sm text-gray-600">{usagePercentage}%</span>
            </div>
            {performance.warningLevel !== 'none' && (
              <div className="text-sm mt-1" style={{ color: getWarningColor(performance.warningLevel) }}>
                {performance.warningLevel === 'critical' && 'Message limit reached'}
                {performance.warningLevel === 'performance_warning' && 'Approaching message limit'}
                {performance.warningLevel === 'approaching_limit' && 'Getting close to limit'}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {performance.loadTimeMs}ms
          </div>
          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accent }}></div>
            </div>
          ) : dashboardData ? (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold" style={{ color: theme.accent }}>
                    {dashboardData.overview.activeMessages}
                  </div>
                  <div className="text-sm text-gray-600">Active Messages</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {dashboardData.overview.archivedMessages}
                  </div>
                  <div className="text-sm text-gray-600">Archived</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData.overview.activeSessions}
                  </div>
                  <div className="text-sm text-gray-600">Active Sessions</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-sm font-semibold text-gray-800">
                    {dashboardData.overview.userTier}
                  </div>
                  <div className="text-sm text-gray-600">Tier</div>
                </div>
              </div>

              {/* Warning Message */}
              {dashboardData.warning.level !== 'none' && (
                <div 
                  className="p-4 rounded-lg border-l-4"
                  style={{
                    backgroundColor: `${getWarningColor(dashboardData.warning.level)}11`,
                    borderColor: getWarningColor(dashboardData.warning.level)
                  }}
                >
                  <div className="font-medium text-gray-800 mb-2">
                    {dashboardData.warning.message}
                  </div>
                  {dashboardData.warning.suggestions.length > 0 && (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {dashboardData.warning.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {dashboardData.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Recommendations</h4>
                  {dashboardData.recommendations.map((rec, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 mb-1">{rec.title}</div>
                          <div className="text-sm text-gray-600 mb-2">{rec.description}</div>
                        </div>
                        <button
                          onClick={() => handleAction(rec.action)}
                          disabled={actionLoading === rec.action}
                          className="ml-4 px-3 py-1 text-sm rounded-lg border transition-colors"
                          style={{
                            borderColor: theme.accent,
                            color: theme.accent,
                            backgroundColor: actionLoading === rec.action ? `${theme.accent}22` : 'transparent'
                          }}
                        >
                          {actionLoading === rec.action ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                              <span>Working...</span>
                            </div>
                          ) : (
                            rec.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction('archive_old')}
                    disabled={actionLoading === 'archive_old'}
                    className="px-3 py-2 text-sm rounded-lg border border-orange-500 text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'archive_old' ? 'Archiving...' : 'Archive Old Messages'}
                  </button>
                  
                  <div className="relative group">
                    <button className="px-3 py-2 text-sm rounded-lg border border-blue-500 text-blue-500 hover:bg-blue-50 transition-colors">
                      Export History ▼
                    </button>
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => handleAction('export_json')}
                        disabled={actionLoading === 'export_json'}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        JSON Format
                      </button>
                      <button
                        onClick={() => handleAction('export_txt')}
                        disabled={actionLoading === 'export_txt'}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Text Format
                      </button>
                      <button
                        onClick={() => handleAction('export_csv')}
                        disabled={actionLoading === 'export_csv'}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        CSV Format
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={fetchDashboard}
                    disabled={isLoading}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-500 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Failed to load performance data
            </div>
          )}
        </div>
      )}
    </div>
  );
}