// hooks/useRateLimitStatus.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface RateLimitStatus {
  remaining: number;
  limit: number;
  count: number;
  resetTime: number;
  isBlocked: boolean;
  blockReason?: string;
  violations: number;
  userTier: string;
  character: string;
}

interface UseRateLimitStatusReturn {
  rateLimitStatus: RateLimitStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
}

export function useRateLimitStatus(userId?: string): UseRateLimitStatusReturn {
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const refreshStatus = useCallback(async () => {
    if (!userId) {
      console.log('🚦 useRateLimitStatus: No userId provided, skipping status check');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚦 useRateLimitStatus: Fetching rate limit status for userId:', userId);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': userId
      };

      // Add auth token if available
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('✅ useRateLimitStatus: Added auth token to headers');
      }

      const response = await fetch('/api/rate-limit/status', {
        method: 'GET',
        headers
      });

      console.log('📡 useRateLimitStatus: API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ useRateLimitStatus: API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ useRateLimitStatus: Received status:', data);

      setRateLimitStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ useRateLimitStatus: Error fetching status:', err);
      setError(errorMessage);

      // Don't provide fallback data when API fails - let ChatBox handle it
      // This prevents showing incorrect "5 messages remaining" when user has already used messages
      setRateLimitStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  // Fetch status when userId changes
  useEffect(() => {
    if (userId) {
      refreshStatus();
    }
  }, [userId, refreshStatus]);

  return {
    rateLimitStatus,
    isLoading,
    error,
    refreshStatus
  };
}