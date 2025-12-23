// hooks/useEntitlements.ts
'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Entitlements {
  unlocked: boolean;
  features?: { 
    chat?: boolean; 
    nsfw?: boolean; 
    voice?: boolean; 
  };
  credits?: number;
  voiceCredits?: number;
  dailyChatCount?: number;
  dailyChatLimit?: number;
  dailyLimitReached?: boolean;
}

interface UseEntitlementsReturn {
  paid: boolean;
  nsfwAllowed: boolean;
  hasVoiceAccess: boolean;
  voiceCredits: number;
  authUserDailyCount: number;
  authUserDailyLimit: number;
  dailyLimitReached: boolean;
  refreshEntitlements: (userId: string, character: string) => Promise<void>;
}

export function useEntitlements(): UseEntitlementsReturn {
  const [paid, setPaid] = useState(false);
  const [nsfwAllowed, setNsfwAllowed] = useState(false);
  const [hasVoiceAccess, setHasVoiceAccess] = useState(false);
  const [voiceCredits, setVoiceCredits] = useState<number>(0);
  const [authUserDailyCount, setAuthUserDailyCount] = useState(0);
  const [authUserDailyLimit, setAuthUserDailyLimit] = useState(5);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  
  const supabase = createClient();

  const refreshEntitlements = useCallback(async (userId: string, character: string) => {
    try {
      const headers: Record<string, string> = {
        'x-user-id': userId
      };
      
      // Add auth token if available
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/entitlements?character=${character}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.warn(`Entitlements API error: ${response.status}`);
        return;
      }

      const entitlements: Entitlements = await response.json();
      
      // Update state based on entitlements
      setPaid(entitlements.unlocked || false);
      setNsfwAllowed(entitlements.features?.nsfw || false);
      const credits = entitlements.voiceCredits || 0;
      setHasVoiceAccess((entitlements.features?.voice || false) && credits > 0);
      setVoiceCredits(credits);
      setAuthUserDailyCount(entitlements.dailyChatCount || 0);
      setAuthUserDailyLimit(entitlements.dailyChatLimit || 5);
      setDailyLimitReached(entitlements.dailyLimitReached || false);
      
    } catch (error) {
      console.error('Failed to refresh entitlements:', error);
    }
  }, [supabase]);

  return {
    paid,
    nsfwAllowed,
    hasVoiceAccess,
    voiceCredits,
    authUserDailyCount,
    authUserDailyLimit,
    dailyLimitReached,
    refreshEntitlements
  };
}