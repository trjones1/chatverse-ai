// hooks/useMessagePagination.ts - Enhanced message management with pagination and performance monitoring
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Message {
  id: string;
  isUser: boolean;
  text: string;
  created_at: Date;
  nsfw?: boolean;
  sessionId?: string;
  topics?: string[];
  emotionalTone?: string;
  metadata?: any;
  voiceUrl?: string;
  voicePending?: boolean;
  selfie?: any;
  is_tip_acknowledgment?: boolean;
  tip_amount_cents?: number;
  fanfare_level?: 'small' | 'medium' | 'large' | 'epic';
}

interface PaginationInfo {
  hasMore: boolean;
  nextCursor: string | null;
  totalMessages: number;
  userLimit: number;
  currentPage: number;
}

interface SessionInfo {
  sessionId: string | null;
  sessionTitle: string | null;
  sessionStarted: string | null;
}

interface PerformanceInfo {
  loadTimeMs: number;
  warningLevel: 'none' | 'approaching_limit' | 'performance_warning' | 'critical';
  archivedCount: number;
}

interface UseMessagePaginationReturn {
  messages: Message[];
  pagination: PaginationInfo;
  session: SessionInfo;
  performance: PerformanceInfo;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  archiveOldMessages: () => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  exportMessages: (format: 'json' | 'txt' | 'csv') => Promise<void>;
  getPerformanceDashboard: () => Promise<any>;
}

const supabase = createClient();

export function useMessagePagination(
  character: string,
  limit: number = 50
): UseMessagePaginationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    hasMore: false,
    nextCursor: null,
    totalMessages: 0,
    userLimit: 50,
    currentPage: 1
  });
  const [session, setSession] = useState<SessionInfo>({
    sessionId: null,
    sessionTitle: null,
    sessionStarted: null
  });
  const [performance, setPerformance] = useState<PerformanceInfo>({
    loadTimeMs: 0,
    warningLevel: 'none',
    archivedCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isInitialLoad = useRef(true);

  const fetchMessages = useCallback(async (
    cursor?: string,
    direction: 'before' | 'after' = 'before',
    append: boolean = false
  ) => {
    console.log('🔄 useMessagePagination: fetchMessages called', { cursor, direction, append, character });
    try {
      if (!append) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      // Get session for auth headers
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authSession?.user?.id) {
        headers['x-user-id'] = authSession.user.id;
      }
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      // Build query parameters
      const params = new URLSearchParams({
        character,
        limit: limit.toString(),
        direction
      });

      if (cursor) {
        params.append('cursor', cursor);
      }


      const response = await fetch(`/api/messages?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Convert string dates to Date objects
      const processedMessages = data.messages.map((msg: any) => ({
        ...msg,
        created_at: typeof msg.created_at === 'string' ? new Date(msg.created_at) : msg.created_at
      }));

      // Update state
      console.log('📊 useMessagePagination: Received messages from API:', processedMessages.length);
      if (append && direction === 'before') {
        // Add older messages to the beginning
        setMessages(prev => [...processedMessages, ...prev]);
        console.log('📊 useMessagePagination: Added older messages, total now:', processedMessages.length + messages.length);
      } else if (append && direction === 'after') {
        // Add newer messages to the end
        setMessages(prev => [...prev, ...processedMessages]);
        console.log('📊 useMessagePagination: Added newer messages, total now:', messages.length + processedMessages.length);
      } else {
        // Replace all messages (initial load or refresh)
        setMessages(processedMessages);
        console.log('📊 useMessagePagination: Replaced all messages, total now:', processedMessages.length);
      }

      setPagination(data.pagination);
      setSession(data.session);
      setPerformance(data.performance);

    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isInitialLoad.current = false;
    }
  }, [character, limit]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !pagination.hasMore || !pagination.nextCursor) {
      return;
    }

    await fetchMessages(pagination.nextCursor, 'before', true);
  }, [fetchMessages, pagination.hasMore, pagination.nextCursor, isLoadingMore]);

  const refreshMessages = useCallback(async () => {
    console.log('🔄 useMessagePagination: refreshMessages called');
    await fetchMessages();
    console.log('✅ useMessagePagination: refreshMessages completed');
  }, [fetchMessages]);

  const archiveOldMessages = useCallback(async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authSession?.user?.id) {
        headers['x-user-id'] = authSession.user.id;
      }
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const response = await fetch('/api/messages/archive', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          character,
          action: 'archive_old'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh messages after archiving
        await refreshMessages();
        return result;
      } else {
        throw new Error(result.error || 'Failed to archive messages');
      }
    } catch (err) {
      console.error('Error archiving messages:', err);
      throw err;
    }
  }, [character, refreshMessages]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authSession?.user?.id) {
        headers['x-user-id'] = authSession.user.id;
      }
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const response = await fetch('/api/messages/delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          messageId,
          character
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove the message from local state immediately for better UX
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        // Update pagination count
        setPagination(prev => ({
          ...prev,
          totalMessages: Math.max(0, prev.totalMessages - 1)
        }));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      throw err;
    }
  }, [character]);

  const exportMessages = useCallback(async (format: 'json' | 'txt' | 'csv' = 'json') => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {};
      
      if (authSession?.user?.id) {
        headers['x-user-id'] = authSession.user.id;
      }
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const params = new URLSearchParams({
        character,
        action: 'export',
        format,
        include_archived: 'true'
      });

      const response = await fetch(`/api/messages/archive?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${character}_messages_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting messages:', err);
      throw err;
    }
  }, [character]);

  const getPerformanceDashboard = useCallback(async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authSession?.user?.id) {
        headers['x-user-id'] = authSession.user.id;
      }
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const params = new URLSearchParams({
        character,
        action: 'dashboard'
      });

      const response = await fetch(`/api/messages/performance?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Error getting performance dashboard:', err);
      throw err;
    }
  }, [character]);

  // Initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      fetchMessages();
    }
  }, [fetchMessages]);

  return {
    messages,
    pagination,
    session,
    performance,
    isLoading,
    isLoadingMore,
    error,
    loadMoreMessages,
    refreshMessages,
    archiveOldMessages,
    deleteMessage,
    exportMessages,
    getPerformanceDashboard
  };
}