// components/ChatBox.tsx - Refactored version
"use client";

import React, { useEffect, useState } from 'react';
import { getEmoteForMessage } from '../utils/emotes';
import themeColors from '../utils/theme';
import ChatInput from './ChatInput';
import ChatMessages from './ChatMessages';
import PremiumCTASection from './PremiumCTASection';
import UnifiedCtaModal from './UnifiedCtaModal';
import EmptyStateWelcome from './EmptyStateWelcome';
import MemoryEventIndicator, { type MemoryEvent } from './MemoryEventIndicator';
import SelfieGallery from './SelfieGallery';
import SuggestedPrompts from './SuggestedPrompts';
import PromptsModal from './PromptsModal';
import { type CharacterConfig } from '@/lib/characters.config';
import { getCharacterCurrency } from '@/lib/verseCoins';

// Custom hooks
import { useAuthState } from '@/hooks/useAuthState';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useChatAPI } from '@/hooks/useChatAPI';
import { useStreamingChatAPI } from '@/hooks/useStreamingChatAPI';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { useLocalStorageCounter } from '@/hooks/useLocalStorageCounter';
import { trackMessageSent, trackMessageLimit, trackPremiumCTA } from '@/lib/analytics';

interface ChatBoxProps {
  config: CharacterConfig;
  onTriggerLogin: () => void;
  onEmoteChange: (src: string) => void;
  nsfwMode: boolean;
  isAnonymous?: boolean;
  // Gallery and Prompts functionality
  onShowGallery?: () => void;
  onTogglePrompts?: () => void;
  showPrompts?: boolean;
}

interface PopupState {
  headline: string;
  body: string;
  cta: string;
  ctaAction?: 'sub_sfw' | 'sub_nsfw' | 'voice_pack_10';
}

function buildPop(trigger: 'LIMIT_REACHED' | 'LOCK_NSFW' | 'VOICE_OUT' | 'VOICE_PREMIUM_REQUIRED', characterKey?: string): PopupState | null {
  const currency = characterKey ? getCharacterCurrency(0, characterKey) : { name: 'VerseCoins', icon: '💎' };

  if (trigger === 'LIMIT_REACHED') return {
    headline: 'Daily limit reached',
    body: `Get ${currency.name} to unlock Premium features!`,
    cta: `Get ${currency.name}`,
    ctaAction: 'sub_sfw' as const
  };
  if (trigger === 'LOCK_NSFW') return {
    headline: 'NSFW Locked',
    body: `Use ${currency.name} to unlock unlimited NSFW access!`,
    cta: `Get ${currency.name}`,
    ctaAction: 'sub_nsfw' as const
  };
  if (trigger === 'VOICE_OUT') return {
    headline: 'Voice credits needed',
    body: `Use ${currency.name} to send voice messages!`,
    cta: `Get ${currency.name}`,
    ctaAction: 'voice_pack_10' as const
  };
  if (trigger === 'VOICE_PREMIUM_REQUIRED') return {
    headline: 'Voice feature locked',
    body: `Get ${currency.name} to unlock Premium voice features!`,
    cta: `Get ${currency.name}`,
    ctaAction: 'sub_sfw' as const
  };
  return null;
}


const ChatBox: React.FC<ChatBoxProps> = ({
  config,
  onTriggerLogin,
  onEmoteChange,
  nsfwMode,
  isAnonymous,
  // Gallery and Prompts functionality
  onShowGallery,
  onTogglePrompts,
  showPrompts = false
}) => {
  const character = config.key.toLowerCase();
  const theme = themeColors[character] || themeColors.default;
  
  // Custom hooks for clean separation of concerns
  const authState = useAuthState();
  const { messages, addMessage, loadMessages, loadMoreMessages, hasMoreMessages, isLoadingMore, isTyping, setIsTyping } = useChatMessages(character);
  const entitlements = useEntitlements();
  const chatAPI = useChatAPI();
  const streamingChatAPI = useStreamingChatAPI();

  // Page view tracking for bounce rate analytics
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const { markEngaged } = usePageViewTracking(visitorId);

  // Local component state
  const [emoteSrc, setEmoteSrc] = useState<string>('idle');
  const [pop, setPop] = useState<PopupState | null>(null);
  const [memoryEvents, setMemoryEvents] = useState<MemoryEvent[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [userIdForCounter, setUserIdForCounter] = useState<string>('');

  // Optimistic UI - show user message immediately while waiting for API
  const [pendingMessage, setPendingMessage] = useState<any>(null);

  // Streaming state
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isStreamingActive, setIsStreamingActive] = useState(false);

  // Note: Auto-scroll removed since prompts are now in a modal

  // localStorage-based counter for anonymous users (prevents "50 First Dates" exploit)
  const { count: anonCount, updateCount: updateAnonCount } = useLocalStorageCounter(userIdForCounter, character);
  const remaining = 5 - anonCount;

  // Initialize component when user changes
  useEffect(() => {
    const initializeChat = async () => {
      const userId = await authState.resolveMemUserId(character);
      setVisitorId(userId); // Set visitor ID for page view tracking
      setUserIdForCounter(userId); // Set userId for localStorage counter
      await entitlements.refreshEntitlements(userId, character);

      // Load messages for the user
      await loadMessages(userId);
    };

    initializeChat();
  }, [authState.user?.id, character, loadMessages]);

  // Handle emote changes
  useEffect(() => {
    onEmoteChange(emoteSrc);
  }, [emoteSrc, onEmoteChange]);

  // Handle voice purchase gate events from other components
  useEffect(() => {
    const handleVoiceGate = () => {
      handleVoiceRequest();
    };

    window.addEventListener('gate-voice', handleVoiceGate);
    return () => {
      window.removeEventListener('gate-voice', handleVoiceGate);
    };
  }, [entitlements.hasVoiceAccess, entitlements.voiceCredits]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) {
      return;
    }

    const userId = await authState.resolveMemUserId(character);
    
    // Check limits for anonymous users using localStorage counter
    if (authState.isAnonymous) {
      // Check if user has already reached the limit
      if (anonCount >= 5) {
        trackMessageLimit(character, 'blocked', anonCount, 5);
        setPop(buildPop('LIMIT_REACHED', character));
        return;
      }
    }

    // Check limits for authenticated free users
    if (!authState.isAnonymous && !entitlements.paid && entitlements.dailyLimitReached) {
      trackMessageLimit(character, 'blocked', entitlements.authUserDailyCount, entitlements.authUserDailyLimit);
      setPop(buildPop('LIMIT_REACHED', character));
      return;
    }

    // Track message sent (use current counts)
    trackMessageSent(character, authState.isAnonymous ? anonCount + 1 : messages.length + 1);

    // Track message limit warnings for anonymous users
    if (authState.isAnonymous && anonCount + 1 === 3) {
      trackMessageLimit(character, 'warning', anonCount + 1, 5);
    }

    // Create user message and show immediately for good UX
    const userMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      isUser: true,
      created_at: new Date(),
      nsfw: nsfwMode
    };

    // Show user message immediately (optimistic UI)
    setPendingMessage(userMessage);

    // Mark user as engaged (for bounce rate tracking)
    markEngaged();

    // Set typing indicator
    setIsTyping(true);

    try {
      // Use streaming for paid users, regular API for free/anonymous users
      const shouldUseStreaming = entitlements.paid && !authState.isAnonymous;

      if (shouldUseStreaming) {
        setIsStreamingActive(true);

        // Send streaming message directly - let the hook handle token updates internally
        const response = await streamingChatAPI.sendMessage(
          messageText,
          userId,
          character,
          nsfwMode,
          // Token callback - called for each streaming token
          (token: string) => {
            // TODO: Implement real-time token display in the UI
          },
          // Completion callback - called when stream is complete
          (finalResponse) => {

            // API succeeded - add user message to real messages and clear pending
            addMessage(userMessage);
            setPendingMessage(null);

            // Update localStorage counter for anonymous users from streaming response
            if (authState.isAnonymous && finalResponse.anonymousMessageCount !== undefined) {
              updateAnonCount(finalResponse.anonymousMessageCount);
            }

            // Add the complete AI response message
            const aiMessage = {
              id: `ai-${Date.now()}`,
              text: finalResponse.reply,
              isUser: false,
              created_at: new Date(),
              voiceUrl: finalResponse.voiceUrl,
              selfie: finalResponse.selfie,
              nsfw: finalResponse.nsfw,
              anonymousMessageCount: finalResponse.anonymousMessageCount
            };
            addMessage(aiMessage);

            // Handle emote for final response
            if (finalResponse.reply) {
              const emote = getEmoteForMessage(finalResponse.reply);
              setEmoteSrc(emote);
            }

            setIsStreamingActive(false);
            setStreamingMessageId(null);
          }
        );

      } else {
        // Send message to regular API
        const response = await chatAPI.sendMessage(messageText, userId, character, nsfwMode);

        if (response) {

          // API succeeded - add user message to real messages and clear pending
          addMessage(userMessage);
          setPendingMessage(null);

          // Update localStorage counter for anonymous users from backend response
          if (authState.isAnonymous && response.anonymousMessageCount !== undefined) {
            updateAnonCount(response.anonymousMessageCount);
          }

          // Add AI response message to UI
          const aiMessage = {
            id: `ai-${Date.now()}`,
            text: response.reply,
            isUser: false,
            created_at: new Date(),
            voiceUrl: response.voiceUrl,
            selfie: response.selfie,
            nsfw: response.nsfw,
            anonymousMessageCount: response.anonymousMessageCount
          };
          addMessage(aiMessage);

          // Handle memory events
          if (response.memoryEvents && response.memoryEvents.length > 0) {
            setMemoryEvents(prev => [...prev, ...response.memoryEvents!]);
          }

          // Update emote if provided
          if (response.emote) {
            setEmoteSrc(response.emote);
          } else {
            // Fallback emote logic
            const emote = getEmoteForMessage(response.reply);
            setEmoteSrc(emote);
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreamingActive(false);
      setStreamingMessageId(null);

      // API failed - remove pending message since it didn't actually send
      setPendingMessage(null);

      // Handle specific error cases for better UX
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        setPop(buildPop('LIMIT_REACHED', character));
      } else if (error instanceof Error && error.message.includes('HTTP 429')) {
        setPop(buildPop('LIMIT_REACHED', character));
      }

      // Don't add user message to real messages or increment count on error
      // Pending message is already cleared above
    } finally {
      // Clear typing indicator only if not streaming
      // Streaming will clear its own indicator when complete
      if (!streamingChatAPI.isStreaming) {
        setIsTyping(false);
      }

      // Refresh entitlements after message
      const userId = await authState.resolveMemUserId(character);
      entitlements.refreshEntitlements(userId, character);
    }
  };

  const handleVoiceRequest = () => {
    if (!entitlements.hasVoiceAccess || entitlements.voiceCredits <= 0) {
      setPop(buildPop('VOICE_OUT', character));
    }
  };

  const handleMemoryEventComplete = (eventId: string) => {
    setMemoryEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handlePromptSelect = (prompt: string) => {
    handleSendMessage(prompt);
    // Modal will close itself after selection
  };

  // Show empty state for new users
  if (messages.length === 0 && !chatAPI.isLoading && !streamingChatAPI.isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
        <div className="flex-1 flex items-center justify-center">
          <EmptyStateWelcome 
            character={character}
            onSendMessage={handleSendMessage}
          />
        </div>
        
        <PremiumCTASection
          character={character}
          isAnonymous={authState.isAnonymous}
          paid={entitlements.paid}
          nsfwAllowed={entitlements.nsfwAllowed}
          hasVoiceAccess={entitlements.hasVoiceAccess}
          voiceCredits={entitlements.voiceCredits}
          anonCount={anonCount}
          remaining={remaining}
          session={authState.session}
          onTriggerLogin={onTriggerLogin}
          onMessageAdded={addMessage}
        />

        <ChatInput
          onSend={handleSendMessage}
          character={character}
          isAnonymous={authState.isAnonymous}
          anonCount={anonCount}
          remaining={remaining}
          dailyLimitReached={entitlements.dailyLimitReached}
          paid={entitlements.paid}
          disabled={false}
        />

        {pop && (
          <UnifiedCtaModal
            isOpen={!!pop}
            headline={pop.headline}
            body={pop.body}
            cta={pop.cta}
            ctaAction={pop.ctaAction}
            onClose={() => setPop(null)}
            characterKey={character}
            session={authState.session}
            onTriggerLogin={onTriggerLogin}
            isAnonymous={authState.isAnonymous}
          />
        )}

        {/* Memory event notifications */}
        <MemoryEventIndicator
          character={config}
          events={memoryEvents}
          onEventComplete={handleMemoryEventComplete}
        />
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>

      <ChatMessages
        character={character}
        emoteSrc={emoteSrc}
        hasVoiceAccess={entitlements.hasVoiceAccess}
        voiceCredits={entitlements.voiceCredits}
        paid={entitlements.paid}
        onTriggerLogin={onTriggerLogin}
        setPop={setPop}
        nsfwMode={nsfwMode}
        messages={pendingMessage ? [...messages, pendingMessage] : messages}
        isTyping={isTyping}
        hasMore={hasMoreMessages}
        onLoadMore={loadMoreMessages}
        isLoadingMore={isLoadingMore}
      />

      <PremiumCTASection
        character={character}
        isAnonymous={authState.isAnonymous}
        paid={entitlements.paid}
        nsfwAllowed={entitlements.nsfwAllowed}
        hasVoiceAccess={entitlements.hasVoiceAccess}
        voiceCredits={entitlements.voiceCredits}
        anonCount={anonCount}
        remaining={remaining}
        session={authState.session}
        onTriggerLogin={onTriggerLogin}
        onMessageAdded={addMessage}
      />

      <ChatInput
        onSend={handleSendMessage}
        character={character}
        isAnonymous={authState.isAnonymous}
        anonCount={anonCount}
        remaining={remaining}
        dailyLimitReached={entitlements.dailyLimitReached}
        paid={entitlements.paid}
        disabled={false}
      />

      {pop && (
        <UnifiedCtaModal
          isOpen={!!pop}
          headline={pop.headline}
          body={pop.body}
          cta={pop.cta}
          ctaAction={pop.ctaAction}
          onClose={() => setPop(null)}
          characterKey={character}
          session={authState.session}
          onTriggerLogin={onTriggerLogin}
          isAnonymous={authState.isAnonymous}
        />
      )}

      {/* Memory event notifications */}
      <MemoryEventIndicator
        character={config}
        events={memoryEvents}
        onEventComplete={handleMemoryEventComplete}
      />

      {/* Selfie Gallery */}
      <SelfieGallery
        characterKey={character}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />

      {/* Prompts Modal */}
      <PromptsModal
        isOpen={showPrompts}
        onClose={() => onTogglePrompts && onTogglePrompts()}
        characterKey={character}
        onPromptSelect={handlePromptSelect}
      />
    </div>
  );
};

export default ChatBox;