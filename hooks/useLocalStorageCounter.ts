// hooks/useLocalStorageCounter.ts
'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to manage localStorage-based daily message counter for anonymous users
 * This prevents the "50 First Dates" exploit by persisting count across page reloads
 */
export function useLocalStorageCounter(userId: string, character: string) {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Only track for anonymous users
    if (!userId.startsWith('anon-')) {
      setIsLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const counterKey = `dailyCount_${userId}_${character}_${today}`;

    // Get count from localStorage
    const storedCount = localStorage.getItem(counterKey);
    const currentCount = storedCount ? parseInt(storedCount, 10) : 0;

    // Debug logging removed for production security

    setCount(currentCount);
    setIsLoading(false);
  }, [userId, character]);

  /**
   * Get the current localStorage count without side effects
   */
  const getCurrentCount = (): number => {
    if (!userId.startsWith('anon-')) return 0;

    const today = new Date().toISOString().split('T')[0];
    const counterKey = `dailyCount_${userId}_${character}_${today}`;
    const storedCount = localStorage.getItem(counterKey);
    return storedCount ? parseInt(storedCount, 10) : 0;
  };

  /**
   * Update the localStorage counter (used by API responses)
   */
  const updateCount = (newCount: number) => {
    if (!userId.startsWith('anon-')) return;

    const today = new Date().toISOString().split('T')[0];
    const counterKey = `dailyCount_${userId}_${character}_${today}`;

    localStorage.setItem(counterKey, newCount.toString());
    setCount(newCount);

    // Debug logging removed for production security
  };

  return {
    count,
    isLoading,
    getCurrentCount,
    updateCount
  };
}

/**
 * Utility function to get localStorage counter synchronously
 * Use this when you need the count immediately (not in a React component)
 */
export function getLocalStorageCount(userId: string, character: string): number {
  if (typeof window === 'undefined' || !userId.startsWith('anon-')) return 0;

  const today = new Date().toISOString().split('T')[0];
  const counterKey = `dailyCount_${userId}_${character}_${today}`;
  const storedCount = localStorage.getItem(counterKey);
  return storedCount ? parseInt(storedCount, 10) : 0;
}