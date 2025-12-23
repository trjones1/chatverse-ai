/**
 * Rate Limit Status Component
 * 
 * Displays rate limit information to users, including:
 * - Current usage vs limits
 * - Time until reset
 * - Upgrade prompts for better limits
 * - Warning indicators for approaching limits
 */

'use client';

import { useEffect, useState } from 'react';
import { useCharacter } from '@/lib/useCharacter';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  violations: number;
  endpoint: string;
}

interface RateLimitStatusProps {
  /** Rate limit info from API response headers */
  rateLimitInfo?: RateLimitInfo;
  /** Endpoint type for context */
  endpoint?: 'chat' | 'voice' | 'api';
  /** User tier for upgrade prompts */
  userTier?: 'anonymous' | 'free' | 'sfw' | 'nsfw';
  /** Whether to show detailed info */
  detailed?: boolean;
  /** Custom className */
  className?: string;
}

export function RateLimitStatus({
  rateLimitInfo,
  endpoint = 'chat',
  userTier = 'anonymous',
  detailed = false,
  className = ''
}: RateLimitStatusProps) {
  const characterConfig = useCharacter();
  const character = characterConfig.key;
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  // Update countdown timer
  useEffect(() => {
    if (!rateLimitInfo?.resetTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const resetTime = rateLimitInfo.resetTime;
      const remainingMs = resetTime - now;

      if (remainingMs <= 0) {
        setTimeUntilReset('Resetting soon...');
        return;
      }

      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeUntilReset(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeUntilReset(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilReset(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [rateLimitInfo?.resetTime]);

  // Don't show if no rate limit info
  if (!rateLimitInfo || rateLimitInfo.limit === Infinity) {
    return null;
  }

  const used = rateLimitInfo.limit - rateLimitInfo.remaining;
  const usagePercent = (used / rateLimitInfo.limit) * 100;
  
  // Determine status color and message
  let statusColor = 'text-green-600 bg-green-50 border-green-200';
  let statusMessage = 'All good';
  let showUpgrade = false;
  
  if (usagePercent >= 90) {
    statusColor = 'text-red-600 bg-red-50 border-red-200';
    statusMessage = 'Limit almost reached';
    showUpgrade = userTier === 'anonymous' || userTier === 'free';
  } else if (usagePercent >= 70) {
    statusColor = 'text-orange-600 bg-orange-50 border-orange-200';
    statusMessage = 'Approaching limit';
    showUpgrade = userTier === 'anonymous' || userTier === 'free';
  } else if (usagePercent >= 50) {
    statusColor = 'text-yellow-600 bg-yellow-50 border-yellow-200';
    statusMessage = 'Halfway to limit';
  }

  // Show violations warning
  if (rateLimitInfo.violations > 0) {
    statusColor = 'text-red-600 bg-red-50 border-red-200';
    statusMessage = `${rateLimitInfo.violations} violations`;
  }

  const getEndpointDisplayName = () => {
    switch (endpoint) {
      case 'chat': return `${characterConfig.displayName || 'Chat'} messages`;
      case 'voice': return 'Voice messages';
      case 'api': return 'API requests';
      default: return 'Requests';
    }
  };

  const getUpgradeMessage = () => {
    if (userTier === 'anonymous') {
      return 'Create an account for higher limits';
    }
    if (userTier === 'free') {
      return 'Get VerseCoins subscription for unlimited access';
    }
    return null;
  };

  const handleUpgradeClick = () => {
    if (userTier === 'anonymous') {
      // Trigger login modal for anonymous users
      window.dispatchEvent(new Event('open-login'));
      document.body.dataset.modal = 'open';
    } else if (userTier === 'free') {
      // Open VerseCoins modal for authenticated users
      window.dispatchEvent(new CustomEvent('open-versecoins-modal', {
        detail: { defaultTab: 'spend' }
      }));
    }
  };

  return (
    <div className={`rate-limit-status ${className}`}>
      {detailed ? (
        // Detailed view with full information
        <div className={`rounded-lg border p-4 ${statusColor}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm">
                {getEndpointDisplayName()}
              </h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used: {used}/{rateLimitInfo.limit}</span>
                  <span>{usagePercent.toFixed(0)}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      usagePercent >= 90 ? 'bg-red-500' :
                      usagePercent >= 70 ? 'bg-orange-500' :
                      usagePercent >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                
                {timeUntilReset && (
                  <div className="text-xs">
                    Resets in: {timeUntilReset}
                  </div>
                )}
                
                {rateLimitInfo.violations > 0 && (
                  <div className="text-xs font-medium">
                    ⚠️ {rateLimitInfo.violations} violations detected
                  </div>
                )}
              </div>
            </div>
            
            {showUpgrade && (
              <div className="ml-4">
                <button
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  onClick={handleUpgradeClick}
                >
                  {userTier === 'anonymous' ? 'Sign Up' : 'Upgrade'}
                </button>
              </div>
            )}
          </div>
          
          {showUpgrade && (
            <div className="mt-3 text-xs text-gray-600">
              {getUpgradeMessage()}
            </div>
          )}
        </div>
      ) : (
        // Compact view - just a small indicator
        <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
          <span className="mr-1">
            {endpoint === 'chat' ? '💬' : endpoint === 'voice' ? '🎤' : '🔗'}
          </span>
          <span>{used}/{rateLimitInfo.limit}</span>
          {rateLimitInfo.violations > 0 && (
            <span className="ml-1 text-red-600">⚠️</span>
          )}
        </div>
      )}
    </div>
  );
}

// Hook to extract rate limit info from API response headers
export function useRateLimitInfo(headers?: Headers): RateLimitInfo | null {
  if (!headers) return null;

  const limit = parseInt(headers.get('x-ratelimit-limit') || '0');
  const remaining = parseInt(headers.get('x-ratelimit-remaining') || '0');
  const resetTime = parseInt(headers.get('x-ratelimit-reset') || '0');
  const violations = parseInt(headers.get('x-ratelimit-violations') || '0');

  if (!limit) return null;

  return {
    limit,
    remaining,
    resetTime,
    violations,
    endpoint: 'api'
  };
}

// Component for showing rate limit status in chat interface
export function ChatRateLimitStatus({ className }: { className?: string }) {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  
  // This would be populated from your chat API response headers
  useEffect(() => {
    // You can integrate this with your chat state management
    // to show real-time rate limit status
  }, []);

  if (!rateLimitInfo) return null;

  return (
    <div className={`chat-rate-limit ${className}`}>
      <RateLimitStatus 
        rateLimitInfo={rateLimitInfo}
        endpoint="chat"
        detailed={false}
      />
    </div>
  );
}