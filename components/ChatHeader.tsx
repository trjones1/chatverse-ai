'use client';
import React, { useState, useEffect, useCallback } from 'react';
import themeColors from '../utils/theme';
import { User } from '@supabase/supabase-js';
import NsfwToggle from './NsfwToggle';
import VerseCoinsModal from './VerseCoinsModal';
import { useAuthState } from '@/hooks/useAuthState';
import TouchButton from './ui/TouchButton';
import { trackPremiumCTA } from '@/lib/analytics';
import { useCharacter } from '@/lib/useCharacter';
import Link from 'next/link';
import { getCharacterCurrency } from '@/lib/verseCoins';

interface UserEntitlements {
  unlocked: boolean;
  tier: string;
  features?: { chat?: boolean; nsfw?: boolean; voice?: boolean };
  canBuyCredits?: boolean;
  dailyChatCount?: number;
  dailyChatLimit?: number;
  dailyLimitReached?: boolean;
  credits?: number;
  voiceCredits?: number;
}

interface ChatHeaderProps {
  characterName: string;
  emoji?: string;
  onLoginClick: () => void;
  paid?: boolean;
  emoteSrc?: string;
  nsfwMode: boolean;
  onToggleNsfw: (val: boolean) => void;
  nsfwAllowed?: boolean;
  // Server-side auth props (new auth system)
  user: User | null;
  isAuthenticated: boolean;
  userEntitlements: UserEntitlements | null;
  onSignOut?: () => Promise<void>;
  // Gallery and Prompts functionality
  onShowGallery?: () => void;
  onTogglePrompts?: () => void;
  showPrompts?: boolean;
}

const getAvatarEmoji = (name: string) => {
  switch ((name || 'lexi').toLowerCase()) {
    case 'lexi': return '💋';
    case 'nyx': return '🕷️';
    case 'aiko': return '🍡';
    case 'zaria': return '🌺';
    case 'chloe': return '📚';
    case 'dom': case 'dominic': return '⚡';
    case 'chase': return '🔥';
    case 'ethan': return '💼';
    case 'jayden': return '🌿';
    case 'miles': return '🤓';
    default: return '✨';
  }
};

const getTipIcon = (name: string) => {
  switch ((name || 'lexi').toLowerCase()) {
    case 'lexi': return '💖';
    case 'nyx': return '🦇';
    case 'aiko': return '🌸';
    case 'zaria': return '✨';
    case 'chloe': return '📖';
    case 'dom': case 'dominic': return '⚡';
    case 'chase': return '💸';
    case 'ethan': return '💼';
    case 'jayden': return '🌿';
    case 'miles': return '🤓';
    case 'nova': return '🌟';
    default: return '💖';
  }
};

const ChatHeader: React.FC<ChatHeaderProps> = ({
  characterName,
  onLoginClick,
  paid,
  emoteSrc,
  nsfwMode,
  onToggleNsfw,
  nsfwAllowed,
  // Use server-side auth props (new auth system)
  user,
  isAuthenticated,
  userEntitlements,
  onSignOut,
  // Gallery and Prompts functionality
  onShowGallery,
  onTogglePrompts,
  showPrompts = false,
}) => {
  const emoji = getAvatarEmoji(characterName);
  const characterConfig = useCharacter();
  const theme = themeColors[(characterName || 'lexi').toLowerCase()] || themeColors.default;
  const nsfwColor = theme.nsfw || theme.accent;
  const characterKey = (characterName || 'lexi').toLowerCase();

  // Modal state
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'purchase' | 'spend' | 'redeem' | 'balance'>('purchase');
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const authState = useAuthState();

  // VerseCoins balance state
  const [verseCoinsBalance, setVerseCoinsBalance] = useState<{
    credits: number;
    character_display: { name: string; icon: string; amount: number };
  } | null>(null);

  // Animation state for VerseCoins debit
  const [showDebitAnimation, setShowDebitAnimation] = useState(false);
  const [debitAmount, setDebitAmount] = useState(0);

  // Listen for VerseCoins debit events
  useEffect(() => {
    const handleVerseCoinsDebit = (event: CustomEvent) => {
      const { amount, newBalance } = event.detail;

      // Trigger debit animation
      setDebitAmount(amount);
      setShowDebitAnimation(true);

      // Update balance immediately
      if (verseCoinsBalance) {
        setVerseCoinsBalance(prev => prev ? {
          ...prev,
          credits: newBalance
        } : null);
      }

      // Hide animation after 2 seconds
      setTimeout(() => {
        setShowDebitAnimation(false);
      }, 2000);
    };

    window.addEventListener('versecoins-debit', handleVerseCoinsDebit as EventListener);
    return () => {
      window.removeEventListener('versecoins-debit', handleVerseCoinsDebit as EventListener);
    };
  }, [verseCoinsBalance]);

  // Fetch VerseCoins balance
  useEffect(() => {
    const fetchVerseCoinsBalance = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/versecoins/balance?character=${characterKey}`);
        if (response.ok) {
          const data = await response.json();
          setVerseCoinsBalance({
            credits: data.credits,
            character_display: data.character_display
          });
        }
      } catch (error) {
        console.error('Failed to fetch VerseCoins balance:', error);
      }
    };

    fetchVerseCoinsBalance();
  }, [user?.id, characterKey]);

  // Derive state from server-provided entitlements (no client-side fetching needed)
  const loggedIn = isAuthenticated;
  // Voice messages now use VerseCoins: 100 VC per voice message
  const voiceCredits = verseCoinsBalance?.credits ? Math.floor(verseCoinsBalance.credits / 100) : 0;
  const entNsfwAllowed = !!userEntitlements?.features?.nsfw;

  // No client-side entitlements fetching needed - parent provides server-side data

  const canUseNsfw = nsfwAllowed !== undefined ? nsfwAllowed : entNsfwAllowed;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenuDropdown && !(event.target as Element)?.closest('[data-menu-container]')) {
        setShowMenuDropdown(false);
      }
    };

    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenuDropdown]);

  // Listen for "open VerseCoins modal" events (triggered from anywhere in the app)
  useEffect(() => {
    const handler = (evt: any) => {
      const detail = evt?.detail || {};
      const tab = detail.defaultTab || 'purchase';

      // If not logged in, force login first
      if (!authState.user?.id) {
        window.dispatchEvent(new Event('open-login'));
        document.body.dataset.modal = 'open';
        return;
      }

      // Open the VerseCoins modal with the specified tab
      setModalDefaultTab(tab);
      setShowCryptoModal(true);
    };

    window.addEventListener('open-versecoins-modal', handler as any);
    return () => window.removeEventListener('open-versecoins-modal', handler as any);
  }, [authState.user?.id]);


  return (
    <div className="chat-header-container fixed top-8 sm:top-14 left-0 right-0 z-30 px-2 sm:px-4 pt-3 transition-all duration-300 ease-in-out">
      {/* Premium badge */}
      {paid && (
        <div
          className="mx-auto mb-2 w-fit rounded-full px-3 py-1 text-xs font-semibold text-white shadow"
          style={{
            background: `linear-gradient(135deg, ${theme.accent} 0%, #ffffff22 100%)`,
            boxShadow: `0 0 14px ${theme.accent}55`,
          }}
          title="You're a premium member"
        >
          {emoji} {characterName} Premium{canUseNsfw ? ' + 😈' : ''}
        </div>
      )}

      {/* Glass header card */}
      <div
        className="relative rounded-3xl border border-white/30 bg-white/20 backdrop-blur-lg supports-[backdrop-filter]:bg-white/15 shadow-lg
                   flex items-center justify-between 
                   px-3 sm:px-6 py-2.5 sm:py-4 gap-2 sm:gap-4"
        style={{
          boxShadow: nsfwMode
            ? `0 0 16px ${nsfwColor}55, 0 1px 3px rgba(0,0,0,0.08)`
            : `0 0 10px ${theme.accent}33, 0 1px 3px rgba(0,0,0,0.08)`,
          animation: nsfwMode ? 'unleashedPulse 2s ease-in-out infinite' : undefined,
        }}
      >
        {/* Left: avatar + name */}
        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src={`/avatars/${characterKey}.png`}
            alt={`${characterName} avatar`}
            className="h-9 w-9 sm:h-12 sm:w-12 rounded-full object-cover aspect-square shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-lg font-semibold text-gray-900">
                {characterName} {emoji} {nsfwMode && <span title="NSFW Mode Active" style={{ color: nsfwColor }}>🫦</span>}
              </h1>
              <div className="flex items-center gap-1 sm:gap-2 relative">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                  Online
                </span>
                {verseCoinsBalance && verseCoinsBalance.credits > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full text-white font-medium relative"
                    style={{
                      background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}99)`,
                      boxShadow: `0 1px 3px ${theme.accent}30`
                    }}
                    title={`${verseCoinsBalance.credits} ${verseCoinsBalance.character_display.name} remaining`}
                  >
                    {verseCoinsBalance.character_display.icon} {verseCoinsBalance.credits}

                    {/* VerseCoins Debit Animation */}
                    {showDebitAnimation && verseCoinsBalance && (
                      <span
                        className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2
                                   text-red-500 font-bold text-xs pointer-events-none z-50
                                   animate-bounce"
                        style={{
                          animation: 'floatUp 2s ease-out forwards',
                          textShadow: '0 0 4px rgba(239, 68, 68, 0.8)'
                        }}
                      >
                        -{debitAmount} {verseCoinsBalance.character_display.icon}
                      </span>
                    )}
                  </span>
                )}

                {/* Purchase Button when 0 VerseCoins or no balance record */}
                {user?.id && ((verseCoinsBalance && verseCoinsBalance.credits === 0) || (!verseCoinsBalance)) && (
                  <button
                    onClick={() => {
                      trackPremiumCTA('click', 'chat_header_purchase_versecoins', characterName);
                      if (authState.user?.id) {
                        setModalDefaultTab('purchase');
                        setShowCryptoModal(true);
                      } else {
                        window.dispatchEvent(new Event('open-login'));
                        document.body.dataset.modal = 'open';
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full text-white font-medium hover:scale-105 transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`,
                      boxShadow: `0 2px 8px ${theme.accent}40`,
                      border: `1px solid ${theme.accent}66`
                    }}
                    title={`Purchase ${verseCoinsBalance?.character_display.name || 'VerseCoins'} for voice messages`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 4px 12px ${theme.accent}60`;
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `0 2px 8px ${theme.accent}40`;
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {verseCoinsBalance?.character_display.icon || getCharacterCurrency(0, characterKey).icon} Buy {verseCoinsBalance?.character_display.name || getCharacterCurrency(0, characterKey).name}
                  </button>
                )}
              </div>
            </div>
            {nsfwMode && <p className="text-xs text-gray-600">NSFW Mode ON</p>}
          </div>
        </div>

        {/* Right: actions (PR #86 UI with TouchButton improvements) */}
        <div className="flex items-center gap-2">

          {/* NSFW Toggle - Always visible and free in freemium model */}
          <NsfwToggle
            nsfwEnabled={nsfwMode}
            canUseNsfw={true}
            onToggle={onToggleNsfw}
            character={characterName}
          />

          {/* Menu Button (Tip + Dashboard) */}
          <div className="relative" data-menu-container>
            <TouchButton
              onClick={() => setShowMenuDropdown(prev => !prev)}
              variant="outline"
              size="md"
              touchFeedback={true}
              title="Menu"
              className="btn-chip transition-all duration-200"
              style={{
                borderColor: theme.accent,
                color: 'white',
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}99)`,
                boxShadow: `0 2px 8px ${theme.accent}30`,
              }}
              onMouseEnter={(e) => {
                const secondaryColor = theme.nsfw || theme.accent + '99';
                e.currentTarget.style.background = `linear-gradient(135deg, ${theme.accent}, ${secondaryColor})`;
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 4px 12px ${theme.accent}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${theme.accent}, ${theme.accent}99)`;
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 2px 8px ${theme.accent}30`;
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
              <span className="hidden sm:inline ml-1">Menu</span>
            </TouchButton>

            {/* Dropdown Menu */}
            {showMenuDropdown && (
              <div
                className="absolute right-0 w-48 rounded-xl border border-white/20 bg-white/90 backdrop-blur-lg p-1 shadow-lg z-50"
                style={{
                  boxShadow: `0 8px 32px ${theme.accent}20, 0 4px 16px rgba(0,0,0,0.1)`,
                  top: 'calc(100% + 4px)',
                  maxHeight: 'calc(100vh - 120px)',
                  overflowY: 'auto'
                }}
              >
                {/* Dashboard Option */}
                <Link
                  href="/dashboard"
                  onClick={() => setShowMenuDropdown(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm rounded-lg hover:bg-white/70 text-gray-800 transition-colors"
                >
                  <span className="text-lg">📊</span>
                  <span className="font-medium">Dashboard</span>
                </Link>

                {/* Store Option */}
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    trackPremiumCTA('click', 'chat_header_menu_store_button', characterName);
                    if (authState.user?.id) {
                      setModalDefaultTab('purchase');
                      setShowCryptoModal(true);
                    } else {
                      window.dispatchEvent(new Event('open-login'));
                      document.body.dataset.modal = 'open';
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-lg hover:bg-white/70 text-gray-800 transition-colors"
                >
                  <span className="text-lg">🛒</span>
                  <span className="font-medium">{getCharacterCurrency(0, characterKey).name} Store</span>
                </button>

                {/* Prompts Option */}
                {onTogglePrompts && (
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      onTogglePrompts();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-sm rounded-lg hover:bg-white/70 transition-colors ${
                      showPrompts ? 'bg-blue-100 text-blue-800' : 'text-gray-800'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="font-medium">{showPrompts ? 'Hide Prompts' : 'Show Prompts'}</span>
                  </button>
                )}

                {/* Gallery Option */}
                {onShowGallery && (
                  <button
                    onClick={() => {
                      setShowMenuDropdown(false);
                      onShowGallery();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-lg hover:bg-white/70 text-gray-800 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Gallery</span>
                  </button>
                )}

                {/* Tip Option */}
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    trackPremiumCTA('click', 'chat_header_menu_tip_button', characterName);
                    if (authState.user?.id) {
                      setModalDefaultTab('spend');
                      setShowCryptoModal(true);
                    } else {
                      window.dispatchEvent(new Event('open-login'));
                      document.body.dataset.modal = 'open';
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-lg hover:bg-white/70 text-gray-800 transition-colors"
                >
                  <span className="text-lg">{getTipIcon(characterName)}</span>
                  <span className="font-medium">Tip {characterName}</span>
                </button>

                {/* Other Realms Option */}
                <Link
                  href="/portal"
                  onClick={() => setShowMenuDropdown(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm rounded-lg hover:bg-white/70 text-gray-800 transition-colors"
                >
                  <span className="text-lg">🌟</span>
                  <span className="font-medium">Other Realms</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      

      {/* VerseCoins Store Modal */}
      {authState.user?.id && (
        <VerseCoinsModal
          isOpen={showCryptoModal}
          onClose={() => {
            setShowCryptoModal(false);
            // Refresh VerseCoins balance when modal closes
            setTimeout(() => {
              if (user?.id) {
                fetch(`/api/versecoins/balance?character=${characterKey}`)
                  .then(res => res.json())
                  .then(data => {
                    setVerseCoinsBalance({
                      credits: data.credits,
                      character_display: data.character_display
                    });
                  })
                  .catch(error => console.error('Failed to refresh VerseCoins balance:', error));
              }
            }, 500);
          }}
          userId={authState.user.id}
          characterKey={characterKey}
          characterDisplayName={characterName}
          defaultTab={modalDefaultTab}
        />
      )}
    </div>
  );
};

export default ChatHeader;