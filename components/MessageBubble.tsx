import React, { useState, useRef } from 'react';
import themeColors from '../utils/theme';
import { FaPlay } from 'react-icons/fa';
import { format } from 'date-fns';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { SelfieData } from '@/types/selfie';

interface MessageBubbleProps {
  text?: string;
  isUser: boolean;
  character: string;
  voiceUrl?: string;
  voicePending?: boolean;
  hasVoiceAccess?: boolean;
  voiceCredits?: number;
  createdAt?: Date;
  onTriggerLogin?: () => void;
  paid?: boolean;
  nsfw?: boolean;
  selfie?: SelfieData;
  setPop?: (pop: any) => void;
  'data-testid'?: string;
  messageId?: string;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  showDeleteButton?: boolean;
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

const buildPop = (trigger: 'VOICE_OUT' | 'VOICE_PREMIUM_REQUIRED' | 'LOCK_NSFW' | 'LIMIT_REACHED') => {
  if (trigger === 'LIMIT_REACHED') return { headline:'Daily limit reached', body:'Get VerseCoins to unlock unlimited messaging and memory!', cta:'Get VerseCoins', ctaAction:'sub_sfw' as const };
  if (trigger === 'LOCK_NSFW')     return { headline:'NSFW Locked', body:'Get VerseCoins to unlock unlimited NSFW access!', cta:'Get VerseCoins', ctaAction:'sub_nsfw' as const };
  if (trigger === 'VOICE_OUT')     return { headline:'Voice credits needed', body:'Get VerseCoins for voice messages — 100 credits per message', cta:'Get VerseCoins', ctaAction:'voice_pack_10' as const };
  if (trigger === 'VOICE_PREMIUM_REQUIRED') return { headline:'Voice feature locked', body:'Get VerseCoins to unlock Premium voice features!', cta:'Get VerseCoins', ctaAction:'sub_sfw' as const };
  return null;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  isUser,
  character,
  voiceUrl,
  hasVoiceAccess,
  voiceCredits = 0,
  createdAt,
  onTriggerLogin,
  paid,
  nsfw,
  selfie,
  setPop,
  'data-testid': dataTestId,
  messageId,
  onDeleteMessage,
  showDeleteButton = false,
  is_tip_acknowledgment = false,
  tip_amount_cents,
  fanfare_level,
  is_gift_acknowledgment = false,
  gift_amount,
  relationship_bonus,
  anonymousMessageCount,
}) => {
  const [loading, setLoading] = useState(false);
  const [localFreeVoiceCount, setLocalFreeVoiceCount] = useState<number>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('freeVoiceCount') : null;
    return stored ? parseInt(stored, 10) : 0;
  });
  const [tokensLeft, setTokensLeft] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); // <-- ref fixes TS "never" issue

  const supabase = createClient();

  const handleDeleteMessage = async () => {
    if (!messageId || !onDeleteMessage) return;
    
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDeleteMessage(messageId);
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  // Fixed audio playback - single trigger, no competing handlers
  const playAudioWithRetry = (audioUrl: string, maxRetries = 3) => {
    let retryCount = 0;

    const attemptPlay = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio();
      audioRef.current = audio;
      
      audio.volume = 1.0;
      let hasStartedPlaying = false;
      let globalTimeout: NodeJS.Timeout;

      const cleanup = () => {
        if (globalTimeout) clearTimeout(globalTimeout);
      };

      const startPlayback = () => {
        if (hasStartedPlaying) return; // Prevent multiple triggers
        hasStartedPlaying = true;
        
        audio.play()
          .then(() => {
            console.log('🔊 Audio playback started successfully');
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error('🔊 Audio play failed:', error);
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔊 Retrying audio playback (${retryCount}/${maxRetries})`);
              setTimeout(attemptPlay, 500);
            } else {
              toast.error('Audio playback failed');
              setIsPlaying(false);
            }
          });
      };

      audio.onloadstart = () => {
        console.log('🔊 Audio load started');
      };

      // Use single event handler - canplaythrough is more reliable
      audio.oncanplaythrough = () => {
        startPlayback();
      };

      audio.onended = () => { 
        console.log('🔊 Audio playback completed');
        setIsPlaying(false); 
        audioRef.current = null; 
        cleanup();
      };
      
      audio.onpause = () => {
        console.log('🔊 Audio paused');
        setIsPlaying(false);
      };
      
      audio.onerror = (error) => {
        console.error('🔊 Audio error:', error);
        cleanup();
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔊 Retrying due to error (${retryCount}/${maxRetries})`);
          setTimeout(attemptPlay, 1000);
        } else {
          toast.error('Audio playback failed');
          setIsPlaying(false);
        }
      };

      try {
        audio.src = audioUrl;
        audio.load();
      } catch (error) {
        console.error('🔊 Failed to set audio source:', error);
        cleanup();
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(attemptPlay, 1000);
        }
      }

      // Fallback timeout - reduced to 8 seconds
      globalTimeout = setTimeout(() => {
        if (!hasStartedPlaying) {
          console.log('🔊 Fallback timeout - attempting to play');
          startPlayback();
        }
      }, 8000);
    };

    attemptPlay();
  };

  const theme = themeColors[character.toLowerCase()] || themeColors.default;
  const nsfwColor = theme.nsfw || theme.accent;

  const safeText = text || '';
  const isTyping = safeText === '...';
  
  // Don't render if no text content and not typing
  if (!safeText && !isTyping) {
    return null;
  }
  
  const paragraphs = safeText.split(/\n\s*\n/g).map(p => p.trim()).filter(Boolean);
  const spicy = Boolean(nsfw || isTyping);
  const isTipAck = is_tip_acknowledgment && !isUser;
  const isGiftAck = is_gift_acknowledgment && !isUser;
  const isSpecialAck = isTipAck || isGiftAck;


  // Special styling for tip and gift acknowledgments
  const getSpecialAckStyle = () => {
    if (!isSpecialAck) return {};

    const baseColor = '#ff69b4'; // Pink for both tips and gifts
    const intensityColors = {
      small: '#ff69b4',
      medium: '#ff69b4',
      large: '#ff69b4',
      epic: '#ff69b4'
    };

    const ackColor = intensityColors[fanfare_level || 'small'];

    const secondaryColor = '#ffd700aa';

    return {
      background: `linear-gradient(145deg, ${ackColor}22, ${ackColor}44, ${secondaryColor})`,
      border: `2px solid ${ackColor}`,
      boxShadow: `
        0 0 20px ${ackColor}88,
        0 0 40px ${secondaryColor.slice(0, -2)}66,
        inset 0 0 15px ${ackColor}33
      `,
      animation: 'tipPulse 3s infinite ease-in-out, shimmer 2s infinite linear',
      position: 'relative' as const,
    };
  };

  const bubbleStyle: React.CSSProperties = {
    background: isUser
      ? spicy 
        ? '#f0f0f0' // Grey background for spicy user messages 
        : '#f0f0f0'
      : spicy
      ? `linear-gradient(145deg, ${nsfwColor}33, ${nsfwColor}66)`
      : theme.accent,
    color: isUser 
      ? spicy 
        ? '#000' // Dark text for grey user messages with spicy outline
        : '#000'
      : '#fff',
    border: spicy 
      ? isUser 
        ? `2px solid ${nsfwColor}` // Prominent spicy outline for user messages
        : `1px solid ${nsfwColor}` // Standard border for bot messages
      : 'none',
    boxShadow: spicy
      ? isUser
        ? `0 0 12px ${nsfwColor}88` // Glow effect for user messages  
        : `0 0 12px ${nsfwColor}88, inset 0 0 8px ${nsfwColor}55` // Full spicy effect for bot
      : 'none',
    padding: '14px 18px',
    borderRadius: 24,
    maxWidth: '70%',
    fontSize: 16,
    overflowWrap: 'break-word',
    fontFamily: theme.fontBody,
    textShadow: spicy && !isUser ? '0px 1px 1px rgba(0,0,0,0.3)' : 'none', // Only bot gets text shadow
    animation: spicy ? 'pulseBorder 2s infinite ease-in-out' : undefined,
    // Override styles for tip and gift acknowledgments
    ...getSpecialAckStyle(),
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }
  };

  const handlePlay = async () => {
    // stop any currently playing audio from this bubble
    stopAudio();

    // If we have an embedded voiceUrl (anonymous voice sample), play it directly
    if (voiceUrl) {
      console.log('🎤 VOICE SAMPLE: Playing embedded anonymous voice sample');
      playAudioWithRetry(voiceUrl);
      return;
    }

    // Check if user has voice credits (no unlimited voice - everyone pays per use)
    if (voiceCredits <= 0) {
      // Users without credits need to purchase voice credits
      if (!paid) {
        setPop?.(buildPop('VOICE_PREMIUM_REQUIRED')!);
      } else {
        setPop?.(buildPop('VOICE_OUT')!);
      }
      return;
    }
    
    window.dispatchEvent(new Event('refresh-entitlements'));
    if (!paid) {
      if (localFreeVoiceCount >= 3) {
        onTriggerLogin?.();
        return;
      } else {
        const newCount = localFreeVoiceCount + 1;
        setLocalFreeVoiceCount(newCount);
        if (typeof window !== 'undefined') {
          localStorage.setItem('freeVoiceCount', newCount.toString());
        }
      }
    }

    const cacheKey = `voiceCache:${character}:${safeText}`;
    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      playAudioWithRetry(cached);
      return;
    }

    setLoading(true);
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';
      
      // Add timeout to prevent hanging - increased for better success rate
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 second timeout for voice generation
      
      const res = await fetch(`/api/voice?character=${character}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ text: safeText }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (res.status === 402) {
        setTokensLeft(0);
        toast.error('Voice locked — buy a credit pack to keep listening.');
        setLoading(false);
        return;
      }
      if (res.status === 401) {
        setTokensLeft(0);
        toast.error('Sign up for premium to unlock voice.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Voice generation failed' }));
        toast.error(error || 'Voice generation failed. Please try again.');
        setLoading(false);
        return;
      }

      const remaining = res.headers.get('x-voice-remaining');
      if (remaining !== null) setTokensLeft(parseInt(remaining, 10));

      // Get VerseCoins balance from response header
      const verseCoinsBalance = res.headers.get('x-versecoins-balance');
      if (verseCoinsBalance !== null) {
        // Dispatch VerseCoins debit event for UI animation
        window.dispatchEvent(new CustomEvent('versecoins-debit', {
          detail: {
            amount: 100, // Voice generation costs 100 VerseCoins
            newBalance: parseInt(verseCoinsBalance, 10)
          }
        }));
      }

      const blob = await res.blob();
      
      // Validate blob
      if (blob.size === 0) {
        toast.error('Received empty audio file. Please try again.');
        setLoading(false);
        return;
      }
      
      const url = URL.createObjectURL(blob);
      try { 
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, url);
        }
      } catch (e) {
        console.warn('Could not cache audio:', e);
      }

      setLoading(false);
      playAudioWithRetry(url);
      
    } catch (error: any) {
      setLoading(false);
      
      if (error.name === 'AbortError') {
        toast.error('Voice generation timed out. Please try again.');
      } else if (error.message?.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        console.error('Voice generation error:', error);
        toast.error('Voice generation failed. Please try again.');
      }
    }
  };

  return (
    <>
      {paragraphs.map((paragraph, i) => (
        <div
          key={i}
          data-testid={dataTestId ? `${dataTestId}-paragraph-${i}` : undefined}
          style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            margin: '8px 0',
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
          }}
        >
          {createdAt && i === 0 && (
            <div className="flex items-center justify-between mb-1">
              <div className="timestamp">{format(new Date(createdAt), 'p')}</div>
              {showDeleteButton && messageId && onDeleteMessage && (
                <button
                  onClick={handleDeleteMessage}
                  disabled={isDeleting}
                  className="ml-2 p-1 rounded-full hover:bg-red-100 transition-colors duration-200"
                  style={{
                    color: '#ef4444',
                    fontSize: '12px',
                    opacity: isDeleting ? 0.5 : 0.7,
                    cursor: isDeleting ? 'wait' : 'pointer'
                  }}
                  title="Delete message"
                >
                  {isDeleting ? '⏳' : '🗑️'}
                </button>
              )}
            </div>
          )}

          <div
            className={isTyping && nsfw ? 'typing-shimmer' : undefined}
            style={{
              ...bubbleStyle,
              background: isTyping
                ? nsfw
                  ? `linear-gradient(135deg, ${nsfwColor}55, ${nsfwColor}cc)`
                  : theme.accent
                : bubbleStyle.background,
              color: isTyping ? '#fff' : bubbleStyle.color,
              boxShadow: isTyping
                ? nsfw
                  ? `0 0 12px ${nsfwColor}aa, inset 0 0 10px ${nsfwColor}77`
                  : 'none'
                : bubbleStyle.boxShadow,
              border: isTyping
                ? nsfw
                  ? `1px solid ${nsfwColor}`
                  : 'none'
                : bubbleStyle.border,
            }}
            aria-live={isTyping ? 'polite' : undefined}
          >
            {isTyping ? (
              <span className={`typing ${nsfw ? 'spicy-typing' : ''}`}>
                <span>.</span><span>.</span><span>.</span>
              </span>
            ) : (
              <span>
                {paragraph.split(/(\[.*?\])/g).map((part, idx) => {
                  // Check if this part is inside square brackets (nonverbal action)
                  if (part.startsWith('[') && part.endsWith(']')) {
                    // Remove the brackets and style the content
                    const content = part.slice(1, -1);
                    return (
                      <span
                        key={idx}
                        style={{
                          fontStyle: 'italic',
                          color: !isUser ? '#ffffff' : theme.accent,
                          opacity: !isUser ? 0.9 : 1,
                        }}
                      >
                        {content}
                      </span>
                    );
                  }
                  return part;
                })}
              </span>
            )}
          </div>

          {/* Selfie Display - Only for non-user messages with selfie data */}
          {!isUser && selfie && i === paragraphs.length - 1 && !isTyping && (
            <div 
              style={{
                marginTop: '12px',
                borderRadius: '12px',
                overflow: 'hidden',
                maxWidth: '250px',
                width: 'fit-content',
                position: 'relative',
              }}
            >
              <img
                src={selfie.thumbnail || selfie.url}
                alt={`${character} selfie${selfie.mood ? ` - ${selfie.mood}` : ''}`}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '12px',
                  boxShadow: nsfw 
                    ? `0 4px 12px rgba(255, 105, 180, 0.3)`
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  // Open full-size image in new tab
                  window.open(selfie.url, '_blank');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = nsfw 
                    ? `0 6px 16px rgba(255, 105, 180, 0.4)`
                    : '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = nsfw 
                    ? `0 4px 12px rgba(255, 105, 180, 0.3)`
                    : '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                loading="lazy"
              />
            </div>
          )}

          {!isUser && i === paragraphs.length - 1 && !isTyping && (
            <>
              {/* 🎤 ANONYMOUS VOICE TEASING LOGIC:
                  - Messages 1-2: Show locked voice (build anticipation)
                  - Message 3: Show unlocked voice (if voiceUrl exists - the "taste")
                  - Message 4+: Show locked voice again (create urgency for upgrade)
                  - Authenticated users: Normal voice logic (voiceCredits > 0 || voiceUrl) */}
              {(() => {
                // For authenticated users, use normal voice logic
                if (anonymousMessageCount === undefined) {
                  return voiceCredits > 0 || voiceUrl;
                }

                // For anonymous users, implement teasing logic
                if (anonymousMessageCount === 3) {
                  // Message 3: Only show voice button if we have a voiceUrl (the sample)
                  return voiceUrl;
                } else {
                  // Messages 1-2 and 4+: Always show locked voice
                  return false;
                }
              })() ? (
                <div style={{ display:'flex', flexDirection: 'column', gap: 4, marginTop:8 }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                    onClick={handlePlay}
                    disabled={loading}
                    className={anonymousMessageCount === 3 && voiceUrl ? 'voice-unlock-button' : ''}
                    style={{
                      background: isPlaying
                        ? `linear-gradient(135deg, ${theme.accent}15, ${theme.accent}25)`
                        : `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`,
                      color: isPlaying ? theme.accent : '#fff',
                      border: isPlaying ? `1px solid ${theme.accent}40` : 'none',
                      borderRadius: '20px',
                      padding: '6px 12px',
                      cursor: loading ? 'wait' : 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: loading
                        ? 'none'
                        : isPlaying
                          ? `0 2px 8px ${theme.accent}30`
                          : anonymousMessageCount === 3 && voiceUrl
                            ? `0 4px 20px ${theme.accent}60` // Enhanced glow for unlock moment
                            : `0 3px 12px ${theme.accent}50`,
                      transition: 'all 0.2s ease',
                      opacity: loading ? 0.7 : 1,
                      transform: isPlaying ? 'scale(0.95)' : 'scale(1)',
                    }}
                  >
                    {loading ? (
                      <>
                        <div style={{ 
                          width: 12, 
                          height: 12, 
                          border: `2px solid ${theme.accent}30`, 
                          borderTop: `2px solid ${theme.accent}`, 
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Loading...
                      </>
                    ) : isPlaying ? (
                      <>🎵 Playing</>
                    ) : (
                      <><FaPlay style={{ fontSize: 10 }} /> Play Voice</>
                    )}
                  </button>
                  {isPlaying && (
                    <button
                      onClick={stopAudio}
                      style={{ 
                        background: `linear-gradient(135deg, #ff4757, #ff6b7d)`,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '6px 12px',
                        cursor: 'pointer', 
                        fontSize: 13,
                        fontWeight: 600,
                        boxShadow: '0 3px 12px #ff475750',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      ⏹ Stop
                    </button>
                  )}
                  </div>

                  {/* 🎉 VOICE UNLOCK NOTIFICATION displayed below buttons for Message 3 */}
                  {anonymousMessageCount === 3 && voiceUrl && (
                    <div
                      className="voice-unlock-badge"
                      style={{
                        background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 2px 8px rgba(255, 107, 53, 0.4), 0 0 0 1px rgba(255, 107, 53, 0.8)',
                        animation: 'voiceUnlockBadge 4s ease-in-out',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center',
                        alignSelf: 'flex-start',
                        width: 'fit-content',
                      }}
                    >
                      🎤 UNLOCKED!
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Show locked voice for:
                      - Authenticated users without voice access (normal logic)
                      - Anonymous users on messages 1-2 and 4+ (teasing logic) */}
                  {(() => {
                    // For authenticated users, show locked if no voice access
                    if (anonymousMessageCount === undefined) {
                      return true; // Normal locked voice behavior
                    }

                    // For anonymous users, show locked voice for messages 1-2 and 4+
                    return anonymousMessageCount !== 3;
                  })() && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        background: `linear-gradient(135deg, #6c757d15, #6c757d25)`,
                        border: '1px solid #6c757d30',
                        borderRadius: '16px',
                        padding: '5px 10px',
                        fontSize: 12,
                        color: '#6c757d',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        🔒 Voice Locked
                      </div>
                      {!paid ? (
                        <button
                          onClick={() => setPop?.(buildPop('VOICE_PREMIUM_REQUIRED')!)}
                          style={{
                            background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            boxShadow: `0 2px 8px ${theme.accent}40`,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          ✨ Get Premium
                        </button>
                      ) : voiceCredits <= 0 ? (
                        <button
                          onClick={() => setPop?.(buildPop('VOICE_OUT')!)}
                          style={{
                            background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            boxShadow: `0 2px 8px ${theme.accent}40`,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          🎙️ Get VerseCoins
                        </button>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Relationship bonus display for gift acknowledgments */}
          {isGiftAck && relationship_bonus && !isUser && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ffd70033, #ffb34733)',
              border: '1px solid #ffd700aa',
              fontSize: 13,
              fontWeight: 600,
              color: '#b8860b',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(255, 215, 0, 0.2)',
              animation: 'relationshipPulse 2s infinite ease-in-out'
            }}>
              <span style={{ fontSize: 16 }}>
                {relationship_bonus.tier === 'epic' ? '🌟' :
                 relationship_bonus.tier === 'large' ? '✨' :
                 relationship_bonus.tier === 'medium' ? '💫' : '⭐'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Relationship boost: {relationship_bonus.description}
                </div>
                <div style={{ fontSize: 11, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {relationship_bonus.bonuses.affection > 0 && (
                    <span style={{ color: '#ff69b4' }}>💕 Affection +{relationship_bonus.bonuses.affection}</span>
                  )}
                  {relationship_bonus.bonuses.trust > 0 && (
                    <span style={{ color: '#4a90e2' }}>🤝 Trust +{relationship_bonus.bonuses.trust}</span>
                  )}
                  {relationship_bonus.bonuses.playfulness > 0 && (
                    <span style={{ color: '#ff8c42' }}>🎉 Fun +{relationship_bonus.bonuses.playfulness}</span>
                  )}
                  {relationship_bonus.bonuses.clinginess > 0 && (
                    <span style={{ color: '#9b59b6' }}>💝 Closeness +{relationship_bonus.bonuses.clinginess}</span>
                  )}
                  {relationship_bonus.bonuses.jealousy < 0 && (
                    <span style={{ color: '#2ecc71' }}>😌 Jealousy {relationship_bonus.bonuses.jealousy}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <style>{`
        @keyframes pulseBorder {
          0% { 
            box-shadow: ${isUser 
              ? `0 0 12px ${nsfwColor}99` 
              : `0 0 12px ${nsfwColor}99, inset 0 0 4px ${nsfwColor}44`}; 
          }
          50% { 
            box-shadow: ${isUser 
              ? `0 0 16px ${nsfwColor}cc` 
              : `0 0 16px ${nsfwColor}cc, inset 0 0 10px ${nsfwColor}66`}; 
          }
          100% { 
            box-shadow: ${isUser 
              ? `0 0 12px ${nsfwColor}99` 
              : `0 0 12px ${nsfwColor}99, inset 0 0 4px ${nsfwColor}44`}; 
          }
        }
        .typing span { animation: blink 1.4s infinite; font-size: 24px; padding: 0 2px; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }

        .spicy-typing span { animation: blink 1.2s infinite; font-size: 24px; padding: 0 3px; color: #fff; text-shadow: 0 0 10px ${nsfwColor}; }
        .typing-shimmer { position: relative; overflow: hidden; }
        .typing-shimmer::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent); background-size:200% 100%; animation: shimmer 1.6s linear infinite; }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Tip acknowledgment animations */
        @keyframes tipPulse {
          0% {
            box-shadow: 0 0 20px #ff69b488, 0 0 40px #ffd70066, inset 0 0 15px #ff69b433;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 30px #ff69b4cc, 0 0 60px #ffd700aa, inset 0 0 25px #ff69b455;
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 20px #ff69b488, 0 0 40px #ffd70066, inset 0 0 15px #ff69b433;
            transform: scale(1);
          }
        }

        @keyframes tipShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes relationshipPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(255, 215, 0, 0.2);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(255, 215, 0, 0.2);
          }
        }

        /* Voice unlock badge animation - attention-grabbing but not overwhelming */
        @keyframes voiceUnlockBadge {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
            box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
          }
          15% {
            transform: scale(1.2) rotate(5deg);
            opacity: 1;
            box-shadow: 0 4px 16px rgba(255, 107, 53, 0.6);
          }
          30% {
            transform: scale(1) rotate(0deg);
            box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.8);
          }
          65% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
          }
          80% {
            transform: scale(1.05);
            box-shadow: 0 4px 16px rgba(255, 107, 53, 0.6);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
          }
        }
      `}</style>
    </>
  );
};

export default MessageBubble;
