'use client';
import React, { useState } from 'react';
import TouchButton from './ui/TouchButton';
import themeColors from '../utils/theme';

interface MessageManagementDrawerProps {
  character: string;
  onArchiveOldMessages: () => Promise<void>;
  onExportMessages: (format: 'json' | 'txt' | 'csv') => Promise<void>;
  totalMessages: number;
  className?: string;
}

const MessageManagementDrawer: React.FC<MessageManagementDrawerProps> = ({
  character,
  onArchiveOldMessages,
  onExportMessages,
  totalMessages,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const theme = themeColors[character.toLowerCase()] || themeColors.default;

  const handleArchive = async () => {
    try {
      setIsLoading('archive');
      await onArchiveOldMessages();
    } catch (error) {
      console.error('Failed to archive messages:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleExport = async (format: 'json' | 'txt' | 'csv') => {
    try {
      setIsLoading(`export-${format}`);
      await onExportMessages(format);
    } catch (error) {
      console.error(`Failed to export messages as ${format}:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className={`${className} relative`}>
      {/* Toggle Button */}
      <TouchButton
        onClick={() => setIsExpanded(!isExpanded)}
        variant="outline"
        size="sm"
        touchFeedback={true}
        title="Message Management"
        className="transition-all duration-200"
        style={{
          borderColor: theme.accent,
          color: theme.accent,
          background: 'rgba(255, 255, 255, 0.05)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${theme.accent}22`;
          e.currentTarget.style.borderColor = theme.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.borderColor = theme.accent;
        }}
      >
        <span 
          className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        >
          ↓
        </span>
        <span className="hidden sm:inline ml-1">Messages</span>
      </TouchButton>

      {/* Drawer Content */}
      {isExpanded && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 p-4 rounded-xl border border-white/30 bg-white/20 backdrop-blur-lg supports-[backdrop-filter]:bg-white/15 shadow-lg z-50"
          style={{
            boxShadow: `0 0 16px ${theme.accent}33, 0 1px 3px rgba(0,0,0,0.08)`,
            minWidth: '280px'
          }}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Message Management
              </h3>
              <span className="text-xs text-gray-600">
                {totalMessages} total messages
              </span>
            </div>

            {/* Archive Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">Archive</h4>
              <TouchButton
                onClick={handleArchive}
                disabled={isLoading === 'archive'}
                variant="outline"
                size="sm"
                touchFeedback={true}
                className="w-full flex items-center justify-center space-x-2"
                style={{
                  borderColor: theme.accent,
                  color: theme.accent,
                  background: isLoading === 'archive' ? `${theme.accent}22` : 'transparent',
                }}
              >
                {isLoading === 'archive' ? (
                  <>
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <span>📦</span>
                    <span>Archive Old Messages</span>
                  </>
                )}
              </TouchButton>
            </div>

            {/* Export Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">Export</h4>
              <div className="grid grid-cols-3 gap-2">
                <TouchButton
                  onClick={() => handleExport('json')}
                  disabled={isLoading === 'export-json'}
                  variant="outline"
                  size="sm"
                  touchFeedback={true}
                  className="flex flex-col items-center justify-center p-2"
                  style={{
                    borderColor: theme.accent,
                    color: theme.accent,
                    background: isLoading === 'export-json' ? `${theme.accent}22` : 'transparent',
                  }}
                >
                  {isLoading === 'export-json' ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="text-sm">📄</span>
                      <span className="text-xs">JSON</span>
                    </>
                  )}
                </TouchButton>
                
                <TouchButton
                  onClick={() => handleExport('txt')}
                  disabled={isLoading === 'export-txt'}
                  variant="outline"
                  size="sm"
                  touchFeedback={true}
                  className="flex flex-col items-center justify-center p-2"
                  style={{
                    borderColor: theme.accent,
                    color: theme.accent,
                    background: isLoading === 'export-txt' ? `${theme.accent}22` : 'transparent',
                  }}
                >
                  {isLoading === 'export-txt' ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="text-sm">📝</span>
                      <span className="text-xs">TXT</span>
                    </>
                  )}
                </TouchButton>
                
                <TouchButton
                  onClick={() => handleExport('csv')}
                  disabled={isLoading === 'export-csv'}
                  variant="outline"
                  size="sm"
                  touchFeedback={true}
                  className="flex flex-col items-center justify-center p-2"
                  style={{
                    borderColor: theme.accent,
                    color: theme.accent,
                    background: isLoading === 'export-csv' ? `${theme.accent}22` : 'transparent',
                  }}
                >
                  {isLoading === 'export-csv' ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="text-sm">📊</span>
                      <span className="text-xs">CSV</span>
                    </>
                  )}
                </TouchButton>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2 border-t border-white/20">
              <TouchButton
                onClick={() => setIsExpanded(false)}
                variant="ghost"
                size="sm"
                touchFeedback={true}
                className="w-full text-center"
                style={{ color: theme.accent }}
              >
                Close
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageManagementDrawer;