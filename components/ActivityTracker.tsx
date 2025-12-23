'use client';

import { useActivityHeartbeat } from '@/hooks/useActivityHeartbeat';

/**
 * Client component that tracks user activity via heartbeats
 * Mounted in root layout to track all page activity
 */
export default function ActivityTracker() {
  useActivityHeartbeat();
  return null; // No UI, just tracking
}
