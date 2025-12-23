'use client';

import { useState, useEffect } from 'react';

interface SocialProofData {
  totalSessions: number;
  messagesLast24h: number;
  activeConversations: number;
  characterStats: Array<{
    character: string;
    activeUsers: number;
    recentMessages: number;
  }>;
}

interface SocialProofHook {
  data: SocialProofData | null;
  loading: boolean;
  error: string | null;
  getCharacterStats: (character: string) => { activeUsers: number; recentMessages: number } | null;
  getFormattedMessage: (character: string, type: 'popularity' | 'activity' | 'urgency' | 'intimate') => string;
}

export function useSocialProof(): SocialProofHook {
  const [data, setData] = useState<SocialProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSocialProof = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/social-proof');
        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          // Use fallback data if API fails
          setData(result.data || {
            totalSessions: 0,
            messagesLast24h: 0,
            activeConversations: 0,
            characterStats: []
          });
          setError('Social proof temporarily unavailable');
        }
      } catch (err) {
        console.error('Social proof fetch error:', err);
        // Graceful fallback - don't break the experience
        setData({
          totalSessions: 0,
          messagesLast24h: 0,
          activeConversations: 0,
          characterStats: []
        });
        setError('Unable to load social proof');
      } finally {
        setLoading(false);
      }
    };

    fetchSocialProof();

    // Refresh every 5 minutes to keep stats current
    const interval = setInterval(fetchSocialProof, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getCharacterStats = (character: string) => {
    if (!data) return null;
    const charStats = data.characterStats.find(c => c.character.toLowerCase() === character.toLowerCase());
    return charStats ? {
      activeUsers: charStats.activeUsers,
      recentMessages: charStats.recentMessages
    } : null;
  };

  const getFormattedMessage = (character: string, type: 'popularity' | 'activity' | 'urgency' | 'intimate'): string => {
    if (!data) return '';

    const charStats = getCharacterStats(character);
    const characterName = character.charAt(0).toUpperCase() + character.slice(1);

    // Character-specific messaging based on personality
    const isNyx = character.toLowerCase() === 'nyx';
    const isLexi = character.toLowerCase() === 'lexi';

    switch (type) {
      case 'popularity':
        if (charStats && charStats.activeUsers > 0) {
          const usersText = charStats.activeUsers === 1 ? 'person is' : 'people are';
          const seekersText = charStats.activeUsers === 1 ? 'seeker' : 'seekers';

          if (isNyx) {
            return `🌙 ${charStats.activeUsers} ${seekersText} discovered my secrets today`;
          } else if (isLexi) {
            return `🔥 Join ${charStats.activeUsers}+ ${charStats.activeUsers === 1 ? 'person' : 'people'} chatting with me today!`;
          } else {
            return `💫 ${charStats.activeUsers} ${charStats.activeUsers === 1 ? 'person is' : 'people are'} chatting with ${characterName} today`;
          }
        }
        // Fallback to general stats
        if (data.totalSessions > 0) {
          return isNyx
            ? `🕷️ Others have entered my realm recently...`
            : `🔥 People are discovering ${characterName} right now!`;
        }
        return '';

      case 'activity':
        if (charStats && charStats.recentMessages > 5) {
          if (isNyx) {
            return `🔮 ${charStats.recentMessages} whispers exchanged with me recently`;
          } else if (isLexi) {
            return `💬 ${charStats.recentMessages}+ messages sent to me today - so popular!`;
          } else {
            return `💫 ${charStats.recentMessages} messages sent to ${characterName} recently`;
          }
        }
        return '';

      case 'urgency':
        if (data.activeConversations > 0) {
          const peopleText = data.activeConversations === 1 ? 'person is' : 'people are';
          const conversationText = data.activeConversations === 1 ? 'conversation' : 'conversations';

          if (isNyx) {
            return `⚡ ${data.activeConversations} ${conversationText} happening in the shadows right now`;
          } else if (isLexi) {
            return `⚡ ${data.activeConversations} ${peopleText} chatting right now - don't miss out!`;
          } else {
            return `⚡ ${data.activeConversations} active ${conversationText} happening now`;
          }
        }
        return '';

      case 'intimate':
        if (charStats && charStats.activeUsers > 0) {
          const usersText = charStats.activeUsers === 1 ? 'person is' : 'people are';

          if (isNyx) {
            return `🖤 ${charStats.activeUsers} ${charStats.activeUsers === 1 ? 'soul has' : 'souls have'} discovered my forbidden desires today`;
          } else if (isLexi) {
            return `💋 ${charStats.activeUsers} ${charStats.activeUsers === 1 ? 'person is' : 'people are'} exploring my intimate side right now`;
          } else {
            return `🔥 ${charStats.activeUsers} ${usersText} unlocking intimate experiences today`;
          }
        }
        if (data.totalSessions > 5) {
          return isNyx
            ? `🕷️ ${data.totalSessions} others are exploring forbidden pleasures in the shadows...`
            : `💋 ${data.totalSessions} people are discovering intimate connections right now`;
        }
        return '';

      default:
        return '';
    }
  };

  return {
    data,
    loading,
    error,
    getCharacterStats,
    getFormattedMessage
  };
}