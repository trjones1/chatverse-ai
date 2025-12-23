// hooks/useChatAPI.ts
'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Message } from './useChatMessages';
import { SelfieData } from '@/types/selfie';

interface ChatAPIResponse {
  reply: string;
  voiceUrl?: string;
  emote?: string;
  memoryEvents?: any[];
  selfie?: SelfieData;
  nsfw?: boolean;
  anonymousMessageCount?: number; // For anonymous voice teasing logic
}

interface UseChatAPIReturn {
  sendMessage: (message: string, userId: string, character: string, nsfwMode: boolean) => Promise<ChatAPIResponse | null>;
  isLoading: boolean;
  error: string | null;
}

// Helper functions
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const typingDelay = (text: string) => Math.min(800, 150 + text.length * 8 + Math.random() * 100);

export function useChatAPI(): UseChatAPIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const sendMessage = useCallback(async (
    message: string,
    userId: string,
    character: string,
    nsfwMode: boolean
  ): Promise<ChatAPIResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Add typing delay for more natural conversation feel
      await sleep(typingDelay(message));

      // 💾 Handle localStorage counter for anonymous users
      let currentCount = 0;
      if (userId.startsWith('anon-')) {
        const today = new Date().toISOString().split('T')[0];
        const counterKey = `dailyCount_${userId}_${character}_${today}`;

        // Get current count from localStorage
        const storedCount = localStorage.getItem(counterKey);
        currentCount = storedCount ? parseInt(storedCount, 10) : 0;

        // Counter validation (logging removed for security)

        // Pre-increment for this message (will be validated by backend)
        currentCount++;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': userId
      };

      // Include current count for anonymous users
      if (userId.startsWith('anon-')) {
        headers['x-anonymous-count'] = currentCount.toString();
      }

      // Add auth token if available
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          character,
          nsfwMode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // 💾 Update localStorage counter for anonymous users after successful API call
      if (userId.startsWith('anon-') && data.anonymousMessageCount !== undefined) {
        const today = new Date().toISOString().split('T')[0];
        const counterKey = `dailyCount_${userId}_${character}_${today}`;
        localStorage.setItem(counterKey, data.anonymousMessageCount.toString());
      }

      const result = {
        reply: data.text || data.reply, // Support both 'text' and 'reply' for compatibility
        voiceUrl: data.voiceUrl,
        emote: data.emote,
        memoryEvents: data.memoryEvents,
        selfie: data.selfie,
        nsfw: data.nsfw,
        anonymousMessageCount: data.anonymousMessageCount
      };

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return {
    sendMessage,
    isLoading,
    error
  };
}