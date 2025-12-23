// hooks/useStreamingChatAPI.ts
'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SelfieData } from '@/types/selfie';

interface StreamingChatAPIResponse {
  reply: string;
  voiceUrl?: string;
  emote?: string;
  memoryEvents?: any[];
  selfie?: SelfieData;
  nsfw?: boolean;
  anonymousMessageCount?: number; // For anonymous voice teasing logic
}

interface UseStreamingChatAPIReturn {
  sendMessage: (
    message: string,
    userId: string,
    character: string,
    nsfwMode: boolean,
    onToken?: (token: string) => void,
    onComplete?: (response: StreamingChatAPIResponse) => void
  ) => Promise<StreamingChatAPIResponse | null>;
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
}

export function useStreamingChatAPI(): UseStreamingChatAPIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const sendMessage = useCallback(async (
    message: string,
    userId: string,
    character: string,
    nsfwMode: boolean,
    onToken?: (token: string) => void,
    onComplete?: (response: StreamingChatAPIResponse) => void
  ): Promise<StreamingChatAPIResponse | null> => {
    console.log('🌊 STREAMING: sendMessage called with:', { message, userId, character, nsfwMode });

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    let fullResponse = '';
    let finalData: StreamingChatAPIResponse | null = null;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': userId
      };

      // Add auth token if available
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('✅ STREAMING: Added auth token to headers');
      }

      console.log('🚀 STREAMING: Making fetch request to /api/chat/stream');

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          character,
          nsfwMode
        })
      });

      console.log('📡 STREAMING: Fetch initiated with status:', response.status);

      if (!response.ok) {
        console.error('❌ STREAMING: Response not OK, status:', response.status);
        const errorData = await response.json();
        console.error('❌ STREAMING: Error data:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('🌊 STREAMING: Stream completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              if (data === '[DONE]') {
                console.log('🌊 STREAMING: Received [DONE] signal');
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                // Handle streaming content
                if (parsed.content) {
                  fullResponse += parsed.content;
                  console.log('🌊 STREAMING: Received token:', parsed.content);

                  // Call token callback if provided
                  if (onToken) {
                    onToken(parsed.content);
                  }
                }

                // Handle completion with final data
                if (parsed.done) {
                  console.log('🌊 STREAMING: Stream completed with final data:', parsed);

                  finalData = {
                    reply: fullResponse,
                    selfie: parsed.selfie,
                    nsfw: parsed.nsfw,
                    anonymousMessageCount: parsed.anonymousMessageCount,
                    // These will be undefined for streaming, but kept for compatibility
                    voiceUrl: undefined,
                    emote: undefined,
                    memoryEvents: undefined
                  };

                  // Call completion callback if provided
                  if (onComplete) {
                    onComplete(finalData);
                  }
                }

                // Handle errors
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (parseError) {
                console.warn('🌊 STREAMING: Could not parse JSON:', data);
                // Skip invalid JSON chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Return the final response
      if (finalData) {
        console.log('✅ STREAMING: Returning final response:', finalData);
        return finalData;
      } else {
        // Fallback if no final data received
        const fallbackResponse: StreamingChatAPIResponse = {
          reply: fullResponse || 'No response received',
          nsfw: nsfwMode,
          anonymousMessageCount: undefined
        };
        console.log('🔄 STREAMING: Using fallback response:', fallbackResponse);
        return fallbackResponse;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ STREAMING: Caught error:', err);
      setError(errorMessage);
      return null;
    } finally {
      console.log('🏁 STREAMING: Setting loading states to false');
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [supabase]);

  return {
    sendMessage,
    isLoading,
    error,
    isStreaming
  };
}