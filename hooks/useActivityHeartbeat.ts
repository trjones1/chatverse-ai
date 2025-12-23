// hooks/useActivityHeartbeat.ts
'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacter } from '@/lib/useCharacter';
import { usePathname } from 'next/navigation';

/**
 * Sends periodic heartbeats to track active users
 * Only sends when user is actually active (not idle)
 */
export function useActivityHeartbeat() {
  const { user } = useAuth();
  const character = useCharacter();
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);
  const lastHeartbeatRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(true);

  // Generate or retrieve session ID
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let sessionId = sessionStorage.getItem('activity_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('activity_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;
  }, []);

  // Track user activity
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const markActive = () => {
      isActiveRef.current = true;
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, markActive);
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, markActive);
      });
    };
  }, []);

  // Send heartbeat
  const sendHeartbeat = async () => {
    if (!sessionIdRef.current) return;
    if (!isActiveRef.current) return; // Don't send if user is idle

    const now = Date.now();
    // Only send once per 30 seconds
    if (now - lastHeartbeatRef.current < 30000) return;

    try {
      await fetch('/api/analytics/active-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userId: user?.id || null,
          anonymousId: user ? null : sessionIdRef.current,
          characterKey: character?.key || null,
          pagePath: pathname || '/',
        }),
      });

      lastHeartbeatRef.current = now;
      isActiveRef.current = false; // Reset active flag after sending
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  };

  // Send heartbeat on mount and every 30 seconds
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial heartbeat
    sendHeartbeat();

    // Periodic heartbeats
    const interval = setInterval(sendHeartbeat, 30000);

    // Heartbeat before page unload
    const handleBeforeUnload = () => {
      // Send final heartbeat (best effort)
      if (sessionIdRef.current) {
        navigator.sendBeacon(
          '/api/analytics/active-users',
          JSON.stringify({
            sessionId: sessionIdRef.current,
            userId: user?.id || null,
            anonymousId: user ? null : sessionIdRef.current,
            characterKey: character?.key || null,
            pagePath: pathname || '/',
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, character?.key, pathname]);
}
