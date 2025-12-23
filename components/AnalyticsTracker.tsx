'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacter } from '@/lib/useCharacter';
import { trackPageView, trackEngagement } from '@/lib/analytics';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const { user } = useAuth();
  const character = useCharacter();

  // Track page views
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname, character.key);
    }
  }, [pathname, character.key]);

  // Track session engagement
  useEffect(() => {
    trackEngagement('session_start', character.key);

    const handleBeforeUnload = () => {
      trackEngagement('session_end', character.key);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEngagement('session_end', character.key);
      } else {
        trackEngagement('session_start', character.key);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      trackEngagement('session_end', character.key);
    };
  }, [character.key]);

  return null;
}