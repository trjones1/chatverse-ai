'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCharacter } from '@/lib/useCharacter';

interface EngagementFeaturesConfig {
  // Tab title change
  enableTabTitleChange?: boolean;
  playfulTabTitle?: string;

  // Return visitor
  enableReturnVisitorWelcome?: boolean;
  returnVisitorThresholdMs?: number;

  // Idle detection
  enableIdleDetection?: boolean;
  idleThresholdMs?: number;
}

interface EngagementState {
  isIdle: boolean;
  isReturningVisitor: boolean;
  shouldShowReturnWelcome: boolean;
  lastActivityTime: number;
}

const DEFAULT_CONFIG: EngagementFeaturesConfig = {
  enableTabTitleChange: true,
  enableReturnVisitorWelcome: true,
  returnVisitorThresholdMs: 24 * 60 * 60 * 1000, // 24 hours
  enableIdleDetection: true,
  idleThresholdMs: 60 * 1000, // 60 seconds
};

export function useEngagementFeatures(config: EngagementFeaturesConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const character = useCharacter();
  const characterName = character?.displayName || 'me';

  const [state, setState] = useState<EngagementState>({
    isIdle: false,
    isReturningVisitor: false,
    shouldShowReturnWelcome: false,
    lastActivityTime: Date.now(),
  });

  const originalTitle = useRef<string>('');
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisitKey = `last_visit_${character?.key || 'default'}`;

  // Playful tab titles based on character
  const getPlayfulTitle = useCallback(() => {
    if (mergedConfig.playfulTabTitle) {
      return mergedConfig.playfulTabTitle;
    }

    const playfulTitles = [
      `${characterName}: Come back... I miss you 👀`,
      `${characterName}: Don't leave me hanging 🥺`,
      `${characterName}: Still here... waiting 💋`,
      `${characterName}: Where'd you go? 😏`,
    ];

    return playfulTitles[Math.floor(Math.random() * playfulTitles.length)];
  }, [characterName, mergedConfig.playfulTabTitle]);

  // Handle tab visibility change
  useEffect(() => {
    if (!mergedConfig.enableTabTitleChange) return;

    // Store original title
    if (typeof document !== 'undefined' && !originalTitle.current) {
      originalTitle.current = document.title;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away - change to playful title
        document.title = getPlayfulTitle();
      } else {
        // User came back - restore original title
        document.title = originalTitle.current;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Restore original title on cleanup
      if (originalTitle.current) {
        document.title = originalTitle.current;
      }
    };
  }, [mergedConfig.enableTabTitleChange, getPlayfulTitle]);

  // Check for returning visitor
  useEffect(() => {
    if (!mergedConfig.enableReturnVisitorWelcome) return;

    const lastVisit = localStorage.getItem(lastVisitKey);
    const now = Date.now();

    if (lastVisit) {
      const timeSinceLastVisit = now - parseInt(lastVisit, 10);

      // If they visited within the threshold, they're a returning visitor
      if (timeSinceLastVisit < mergedConfig.returnVisitorThresholdMs!) {
        setState(prev => ({
          ...prev,
          isReturningVisitor: true,
          shouldShowReturnWelcome: true,
        }));
      }
    }

    // Update last visit time
    localStorage.setItem(lastVisitKey, now.toString());
  }, [mergedConfig.enableReturnVisitorWelcome, mergedConfig.returnVisitorThresholdMs, lastVisitKey]);

  // Reset activity timer
  const resetActivity = useCallback(() => {
    setState(prev => ({
      ...prev,
      isIdle: false,
      lastActivityTime: Date.now(),
    }));

    // Clear existing timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set new timeout for idle detection
    if (mergedConfig.enableIdleDetection) {
      idleTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isIdle: true,
        }));
      }, mergedConfig.idleThresholdMs);
    }
  }, [mergedConfig.enableIdleDetection, mergedConfig.idleThresholdMs]);

  // Track user activity
  useEffect(() => {
    if (!mergedConfig.enableIdleDetection) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    activityEvents.forEach(event => {
      document.addEventListener(event, resetActivity);
    });

    // Initial timer
    resetActivity();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetActivity);
      });

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [mergedConfig.enableIdleDetection, resetActivity]);

  // Dismiss return welcome
  const dismissReturnWelcome = useCallback(() => {
    setState(prev => ({
      ...prev,
      shouldShowReturnWelcome: false,
    }));
  }, []);

  // Dismiss idle prompt (resets timer)
  const dismissIdlePrompt = useCallback(() => {
    resetActivity();
  }, [resetActivity]);

  return {
    ...state,
    dismissReturnWelcome,
    dismissIdlePrompt,
    resetActivity,
  };
}
