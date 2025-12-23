// hooks/useChatMessages.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { memoryLog } from '@/lib/logger';
import { SelfieData } from '@/types/selfie';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  voiceUrl?: string;
  voicePending?: boolean;
  created_at: Date;
  nsfw?: boolean;
  selfie?: SelfieData;
  sessionId?: string;
  topics?: string[];
  emotionalTone?: string;
  metadata?: any;
  is_tip_acknowledgment?: boolean;
  tip_amount_cents?: number;
  fanfare_level?: 'small' | 'medium' | 'large' | 'epic';
  is_gift_acknowledgment?: boolean;
  gift_amount?: number;
  relationship_bonus?: {
    bonuses: {
      affection: number;
      trust: number;
      playfulness: number;
      clinginess: number;
      jealousy: number;
    };
    totalBonus: number;
    tier: 'small' | 'medium' | 'large' | 'epic';
    description: string;
  };
  anonymousMessageCount?: number; // For anonymous voice teasing logic
}

interface UseChatMessagesReturn {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  loadMessages: (userId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
}

export function useChatMessages(character: string): UseChatMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const supabase = createClient();

  const INITIAL_LIMIT = 50; // Load most recent 50 messages initially
  const LOAD_MORE_LIMIT = 25; // Load 25 more when scrolling up

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const loadMessages = useCallback(async (userId: string) => {
    try {
      memoryLog.info('Loading initial messages for user:', { userId, character, limit: INITIAL_LIMIT });

      // Reset pagination state for new user
      setCurrentUserId(userId);
      setNextCursor(null);
      setHasMoreMessages(true);

      const response = await fetch(`/api/messages?character=${character}&limit=${INITIAL_LIMIT}&direction=before`, {
        headers: {
          'x-user-id': userId
        }
      });

      if (!response.ok) {
        memoryLog.error('Failed to load messages:', { status: response.status });
        return;
      }

      const data = await response.json();
      const loadedMessages = (data.messages || []).map((msg: any, index: number) => ({
        ...msg,
        id: msg.id || `loaded-${Date.now()}-${index}`,
        created_at: msg.created_at ? new Date(msg.created_at) : new Date()
      }));

      memoryLog.info('Loaded initial messages:', {
        count: loadedMessages.length,
        hasMore: data.pagination?.hasMore,
        nextCursor: data.pagination?.nextCursor
      });

      setMessages(loadedMessages);
      setHasMoreMessages(data.pagination?.hasMore || false);
      setNextCursor(data.pagination?.nextCursor || null);
    } catch (error) {
      memoryLog.error('Error loading messages:', error);
    }
  }, [character, INITIAL_LIMIT]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore || !currentUserId || !nextCursor) {
      return;
    }

    try {
      setIsLoadingMore(true);
      memoryLog.info('Loading more messages:', { cursor: nextCursor, limit: LOAD_MORE_LIMIT });

      const response = await fetch(`/api/messages?character=${character}&limit=${LOAD_MORE_LIMIT}&direction=before&cursor=${nextCursor}`, {
        headers: {
          'x-user-id': currentUserId
        }
      });

      if (!response.ok) {
        memoryLog.error('Failed to load more messages:', { status: response.status });
        return;
      }

      const data = await response.json();
      const olderMessages = (data.messages || []).map((msg: any, index: number) => ({
        ...msg,
        id: msg.id || `older-${Date.now()}-${index}`,
        created_at: msg.created_at ? new Date(msg.created_at) : new Date()
      }));

      memoryLog.info('Loaded older messages:', {
        count: olderMessages.length,
        hasMore: data.pagination?.hasMore,
        nextCursor: data.pagination?.nextCursor
      });

      // Add older messages to the beginning of the array
      setMessages(prev => [...olderMessages, ...prev]);
      setHasMoreMessages(data.pagination?.hasMore || false);
      setNextCursor(data.pagination?.nextCursor || null);
    } catch (error) {
      memoryLog.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [character, hasMoreMessages, isLoadingMore, currentUserId, nextCursor, LOAD_MORE_LIMIT]);

  // Real-time subscription for new messages (including tip acknowledgments)
  useEffect(() => {
    if (!currentUserId) return;

    memoryLog.info('Setting up realtime subscription for new messages:', { userId: currentUserId, character });

    const channel = supabase
      .channel(`messages_${currentUserId}_${character}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interaction_log',
          filter: `user_id=eq.${currentUserId} and character_key=eq.${character}`
        },
        (payload: any) => {
          memoryLog.info('Received new message via realtime:', payload.new);

          const newMessage = payload.new as any;
          const formattedMessage: Message = {
            id: newMessage.id,
            isUser: newMessage.role === 'user',
            text: newMessage.content,
            created_at: new Date(newMessage.created_at),
            nsfw: Boolean(newMessage.nsfw),
            selfie: newMessage.metadata?.selfie || null,
            sessionId: newMessage.session_id,
            topics: newMessage.topics || [],
            emotionalTone: newMessage.emotional_tone,
            metadata: newMessage.metadata || {},
            is_tip_acknowledgment: Boolean(newMessage.metadata?.is_tip_acknowledgment),
            tip_amount_cents: newMessage.metadata?.tip_amount_cents || null,
            fanfare_level: newMessage.metadata?.fanfare_level || null,
            is_gift_acknowledgment: Boolean(newMessage.metadata?.is_gift_acknowledgment),
            gift_amount: newMessage.metadata?.gift_amount || null,
            relationship_bonus: newMessage.metadata?.relationship_bonus || null
          };

          // Add the new message to the end of the messages array
          setMessages(prev => [...prev, formattedMessage]);
          memoryLog.info('Added new realtime message to chat:', formattedMessage.id);
        }
      )
      .subscribe();

    return () => {
      memoryLog.info('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [currentUserId, character, supabase]);

  return {
    messages,
    addMessage,
    clearMessages,
    loadMessages,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
    isTyping,
    setIsTyping
  };
}