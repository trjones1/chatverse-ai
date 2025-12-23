// components/ChatMessages.tsx - Enhanced with infinite scroll pagination and performance monitoring
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { useMessagePagination } from '@/hooks/useMessagePagination';
import { Message } from '@/hooks/useChatMessages';
import ConfettiAnimation from './ConfettiAnimation';
import ExoClickAd from './ads/ExoClickAd';
import themeColors from '../utils/theme';

interface ChatMessagesProps {
  character: string;
  emoteSrc: string;
  hasVoiceAccess?: boolean;
  voiceCredits?: number;
  paid?: boolean;
  onTriggerLogin?: () => void;
  setPop?: (pop: any) => void;
  nsfwMode?: boolean;
  isTyping?: boolean;
  // Legacy props for compatibility
  messages?: Message[];
  // New pagination props
  hasMore?: boolean;
  onLoadMore?: () => Promise<void>;
  isLoadingMore?: boolean;
}

const getAvatarEmoji = (name: string) => {
  switch (name.toLowerCase()) {
    case 'lexi': return '💋';
    case 'nyx': return '🕷️';
    case 'aiko': return '🍡';
    case 'zaria': return '🌺';
    case 'chloe': return '📚';
    default: return '✨';
  }
};

// Typing indicator component with spicy NSFW styling
const TypingIndicator: React.FC<{ character: string; nsfwMode?: boolean }> = ({ character, nsfwMode }) => {
  const theme = themeColors[character.toLowerCase()] || themeColors.default;
  const nsfwColor = theme.nsfw || theme.accent;
  
  return (
    <div data-testid="typing-indicator" className="flex items-center space-x-2">
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: nsfwMode 
            ? `linear-gradient(145deg, ${nsfwColor}33, ${nsfwColor}66)`
            : '#e5e7eb',
          border: nsfwMode ? `1px solid ${nsfwColor}` : 'none',
          boxShadow: nsfwMode 
            ? `0 0 8px ${nsfwColor}88` 
            : 'none'
        }}
      >
        {getAvatarEmoji(character)}
      </div>
      <div 
        className="rounded-lg p-3"
        style={{
          background: nsfwMode 
            ? `linear-gradient(145deg, ${nsfwColor}33, ${nsfwColor}66)`
            : '#f3f4f6',
          border: nsfwMode ? `1px solid ${nsfwColor}` : 'none',
          boxShadow: nsfwMode 
            ? `0 0 12px ${nsfwColor}88, inset 0 0 8px ${nsfwColor}55`
            : 'none',
          animation: nsfwMode ? 'pulseBorder 2s infinite ease-in-out' : undefined,
        }}
      >
        <div className="flex space-x-1">
          <div 
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ 
              backgroundColor: nsfwMode ? '#fff' : '#9ca3af',
              boxShadow: nsfwMode ? `0 0 4px ${nsfwColor}` : 'none'
            }}
          ></div>
          <div 
            className="w-2 h-2 rounded-full animate-bounce" 
            style={{ 
              animationDelay: '0.1s',
              backgroundColor: nsfwMode ? '#fff' : '#9ca3af',
              boxShadow: nsfwMode ? `0 0 4px ${nsfwColor}` : 'none'
            }}
          ></div>
          <div 
            className="w-2 h-2 rounded-full animate-bounce" 
            style={{ 
              animationDelay: '0.2s',
              backgroundColor: nsfwMode ? '#fff' : '#9ca3af',
              boxShadow: nsfwMode ? `0 0 4px ${nsfwColor}` : 'none'
            }}
          ></div>
        </div>
      </div>
      
      {nsfwMode && (
        <style>{`
          @keyframes pulseBorder {
            0% { box-shadow: 0 0 12px ${nsfwColor}99, inset 0 0 4px ${nsfwColor}44; }
            50% { box-shadow: 0 0 16px ${nsfwColor}cc, inset 0 0 10px ${nsfwColor}66; }
            100% { box-shadow: 0 0 12px ${nsfwColor}99, inset 0 0 4px ${nsfwColor}44; }
          }
        `}</style>
      )}
    </div>
  );
};

// Load More Button Component
const LoadMoreButton: React.FC<{
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  theme: any;
}> = ({ onLoadMore, isLoading, hasMore, theme }) => {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center py-4">
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="px-6 py-2 rounded-lg border transition-all duration-200 flex items-center space-x-2"
        style={{
          borderColor: theme.accent,
          backgroundColor: isLoading ? `${theme.accent}22` : 'transparent',
          color: theme.accent
        }}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Loading older messages...</span>
          </>
        ) : (
          <>
            <span>↑</span>
            <span>Load older messages</span>
          </>
        )}
      </button>
    </div>
  );
};

// Session Boundary Component
const SessionBoundary: React.FC<{
  sessionTitle: string;
  sessionStarted: string;
  theme: any;
}> = ({ sessionTitle, sessionStarted, theme }) => {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center space-x-3 px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-600">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }}></div>
        <span>{sessionTitle}</span>
        <span>•</span>
        <span>{new Date(sessionStarted).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

const ChatMessages: React.FC<ChatMessagesProps> = React.memo(({
  character,
  emoteSrc,
  hasVoiceAccess,
  voiceCredits,
  paid,
  onTriggerLogin,
  setPop,
  nsfwMode,
  isTyping,
  messages: legacyMessages, // Support for legacy message prop
  hasMore: propHasMore,
  onLoadMore: propOnLoadMore,
  isLoadingMore: propIsLoadingMore
}) => {
  const endRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showSessionBoundaries, setShowSessionBoundaries] = useState(true);
  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiFanfareLevel, setConfettiFanfareLevel] = useState<'small' | 'medium' | 'large' | 'epic'>('small');
  const processedTipMessages = useRef(new Set<string>());
  const pendingConfetti = useRef<{id: string, fanfareLevel: string} | null>(null);
  
  const theme = themeColors[character.toLowerCase()] || themeColors.default;

  // Use the new pagination hook
  const {
    messages: paginatedMessages,
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
    exportMessages
  } = useMessagePagination(character, 50);

  // Use legacy messages if provided (for backwards compatibility)
  const displayMessages = legacyMessages || paginatedMessages;
  
  // Use passed pagination props when legacy messages are used, otherwise use internal pagination
  const effectiveHasMore = legacyMessages ? (propHasMore ?? false) : pagination.hasMore;
  const effectiveOnLoadMore = legacyMessages ? propOnLoadMore : loadMoreMessages;
  const effectiveIsLoadingMore = legacyMessages ? (propIsLoadingMore ?? false) : isLoadingMore;

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, isTyping, autoScroll]);

  // Helper function to trigger confetti for a specific acknowledgment
  const triggerConfettiForAck = useCallback((ackMessage: any) => {
    const fanfareLevel = ackMessage.fanfare_level || ackMessage.metadata?.fanfare_level || 'small';
    const isGift = ackMessage.metadata?.is_gift_acknowledgment;

    console.log(`🎉 Triggering confetti for ${isGift ? 'gift' : 'tip'} acknowledgment:`, {
      messageId: ackMessage.id,
      fanfareLevel,
      amount: ackMessage.tip_amount_cents || ackMessage.metadata?.gift_amount,
      type: isGift ? 'gift' : 'tip'
    });

    setConfettiFanfareLevel(fanfareLevel as 'small' | 'medium' | 'large' | 'epic');
    setConfettiActive(true);

    // Reset confetti state after animation
    setTimeout(() => {
      setConfettiActive(false);
    }, 5000);
  }, []);

  // Detect new tip acknowledgment messages and trigger confetti
  useEffect(() => {
    const newTipMessages = displayMessages.filter(msg =>
      (msg.is_tip_acknowledgment || msg.metadata?.is_gift_acknowledgment) &&
      !msg.isUser &&
      !processedTipMessages.current.has(msg.id)
    );

    if (newTipMessages.length > 0) {
      // Process the most recent tip message
      const latestTip = newTipMessages[newTipMessages.length - 1];

      // Check if this acknowledgment message is the most recent message overall
      const mostRecentMessage = displayMessages[displayMessages.length - 1];
      const isAckMostRecent = mostRecentMessage?.id === latestTip.id;

      if (!isAckMostRecent) {
        // If there are newer messages after the acknowledgment, don't trigger confetti
        processedTipMessages.current.add(latestTip.id);
        return;
      }

      // Check if the chat is focused and visible
      const isWindowFocused = document.hasFocus();
      const isTabVisible = !document.hidden;

      // Mark as processed regardless
      processedTipMessages.current.add(latestTip.id);

      if (isWindowFocused && isTabVisible) {
        // Immediate confetti if focused
        triggerConfettiForAck(latestTip);
      } else {
        // Store for later when user focuses back
        pendingConfetti.current = {
          id: latestTip.id,
          fanfareLevel: latestTip.fanfare_level || latestTip.metadata?.fanfare_level || 'small'
        };
      }
    }
  }, [displayMessages, triggerConfettiForAck]);

  // Handle window focus and visibility changes to trigger pending confetti
  useEffect(() => {
    const handleFocusChange = () => {
      const isWindowFocused = document.hasFocus();
      const isTabVisible = !document.hidden;

      if (isWindowFocused && isTabVisible && pendingConfetti.current) {
        // Find the pending acknowledgment message and trigger confetti
        const pendingAck = displayMessages.find(msg => msg.id === pendingConfetti.current?.id);
        if (pendingAck) {
          // Check if it's still the most recent message
          const mostRecentMessage = displayMessages[displayMessages.length - 1];
          const isStillMostRecent = mostRecentMessage?.id === pendingAck.id;

          if (isStillMostRecent) {
            triggerConfettiForAck(pendingAck);
          }
        }
        pendingConfetti.current = null;
      }
    };

    window.addEventListener('focus', handleFocusChange);
    document.addEventListener('visibilitychange', handleFocusChange);

    return () => {
      window.removeEventListener('focus', handleFocusChange);
      document.removeEventListener('visibilitychange', handleFocusChange);
    };
  }, [displayMessages, triggerConfettiForAck]);

  // Check if user is near bottom to enable/disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  }, []);

  // Load more when scrolling near top
  const handleScrollTop = useCallback(() => {
    if (!containerRef.current || !effectiveOnLoadMore) return;
    
    const { scrollTop } = containerRef.current;
    if (scrollTop < 100 && effectiveHasMore && !effectiveIsLoadingMore) {
      effectiveOnLoadMore();
    }
  }, [effectiveHasMore, effectiveIsLoadingMore, effectiveOnLoadMore]);

  // Combined scroll handler
  const onScroll = useCallback(() => {
    handleScroll();
    handleScrollTop();
  }, [handleScroll, handleScrollTop]);

  // Group messages by session for session boundaries
  const messagesWithBoundaries = React.useMemo(() => {
    if (!showSessionBoundaries) return displayMessages;
    
    const result: any[] = [];
    let currentSessionId: string | null = null;
    
    displayMessages.forEach((msg, index) => {
      if (msg.sessionId && msg.sessionId !== currentSessionId) {
        result.push({
          ...msg,
          showBoundary: true,
          boundaryTitle: `Conversation Session`,
          boundaryDate: typeof msg.created_at === 'string' ? msg.created_at : msg.created_at.toISOString()
        });
        currentSessionId = msg.sessionId;
      } else {
        result.push(msg);
      }
    });
    
    return result;
  }, [displayMessages, showSessionBoundaries]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages Container */}
      <div 
        ref={containerRef}
        onScroll={onScroll}
        data-testid="chat-messages-container" 
        className="flex-1 overflow-y-auto p-4 space-y-4" 
        style={{ paddingBottom: '24px', backgroundColor: 'transparent' }}
      >
        <div ref={topRef} />
        
        {/* Load More Button at Top */}
        {effectiveOnLoadMore && (
          <LoadMoreButton
            onLoadMore={effectiveOnLoadMore}
            isLoading={effectiveIsLoadingMore}
            hasMore={effectiveHasMore}
            theme={theme}
          />
        )}

        {/* Error State */}
        {error && (
          <div className="flex justify-center py-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">
              Error loading messages: {error}
              <button 
                onClick={refreshMessages}
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && displayMessages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border border-current border-t-transparent rounded-full animate-spin" style={{ color: theme.accent }}></div>
              <span className="text-gray-600">Loading your conversation history...</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {messagesWithBoundaries.map((msg, idx) => (
          <React.Fragment key={msg.id || idx}>
            {/* Session Boundary */}
            {msg.showBoundary && (
              <SessionBoundary
                sessionTitle={msg.boundaryTitle || 'New Session'}
                sessionStarted={msg.boundaryDate || (typeof msg.created_at === 'string' ? msg.created_at : msg.created_at.toISOString())}
                theme={theme}
              />
            )}
            
            {/* Message Bubble */}
            <MessageBubble
              data-testid={`message-${idx}`}
              text={msg.text}
              isUser={msg.isUser}
              character={character}
              voiceUrl={msg.voiceUrl}
              voicePending={msg.voicePending}
              createdAt={msg.created_at}
              nsfw={msg.nsfw}
              selfie={msg.selfie}
              hasVoiceAccess={hasVoiceAccess}
              voiceCredits={voiceCredits}
              paid={paid}
              onTriggerLogin={onTriggerLogin}
              setPop={setPop}
              messageId={msg.id}
              onDeleteMessage={deleteMessage}
              showDeleteButton={!legacyMessages} // Only show delete for paginated messages
              is_tip_acknowledgment={msg.is_tip_acknowledgment}
              tip_amount_cents={msg.tip_amount_cents}
              fanfare_level={msg.fanfare_level}
              is_gift_acknowledgment={msg.is_gift_acknowledgment}
              gift_amount={msg.gift_amount}
              relationship_bonus={msg.relationship_bonus}
              anonymousMessageCount={msg.anonymousMessageCount}
            />

            {/* 💰 FREEMIUM ADS: Show ad every 4 messages, NSFW-aware */}
            {idx > 0 && (idx + 1) % 4 === 0 && (
              <ExoClickAd zoneId={5767920} nsfwMode={nsfwMode} className="my-4" />
            )}
          </React.Fragment>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <TypingIndicator character={character} nsfwMode={nsfwMode} />
        )}
        
        {/* Auto-scroll target */}
        <div ref={endRef} />

        {/* Scroll to Bottom Button */}
        {!autoScroll && displayMessages.length > 5 && (
          <div className="fixed bottom-20 right-4 z-10">
            <button
              onClick={() => {
                setAutoScroll(true);
                endRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
              style={{ color: theme.accent }}
            >
              <span className="block w-6 h-6 flex items-center justify-center">↓</span>
            </button>
          </div>
        )}
      </div>

      {/* Confetti Animation for Tips */}
      <ConfettiAnimation
        isActive={confettiActive}
        fanfareLevel={confettiFanfareLevel}
        onComplete={() => setConfettiActive(false)}
      />

    </div>
  );
});

ChatMessages.displayName = 'ChatMessages';

export default ChatMessages;