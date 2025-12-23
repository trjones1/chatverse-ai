// app/ChatClientPage.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ChatLayout from '@/components/ChatLayout';
import DevSwitcher from '@/components/DevSwitcher';
import ChatHeader from '@/components/ChatHeader';
import BackToTopButton from '@/components/ui/BackToTopButton';
import SelfieGallery from '@/components/SelfieGallery';
import ReturnVisitorWelcome from '@/components/ReturnVisitorWelcome';
import IdleDetectionPrompt from '@/components/IdleDetectionPrompt';
import NsfwDisclaimerModal from '@/components/NsfwDisclaimerModal';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacter } from '@/lib/useCharacter';
import { useEngagementFeatures } from '@/hooks/useEngagementFeatures';
import themeColors from '../utils/theme';
import { type CharacterConfig, isNsfwCharacter } from '@/lib/characters.config';
import { trackPageView, trackConversationStart } from '@/lib/metaPixel';

const supabase = createClient();

type Entitlements = {
  unlocked: boolean;
  tier: string;
  features?: { chat?: boolean; nsfw?: boolean; voice?: boolean };
  canBuyCredits?: boolean;
  dailyChatCount?: number;
  dailyChatLimit?: number;
  dailyLimitReached?: boolean;
  credits?: number;
  voiceCredits?: number;
};

export default function ChatClientPage({
  characterConfig,
}: {
  characterConfig: CharacterConfig | null;
}) {
  // Use client-side character detection for URL parameters, but pass server config to prevent flash
  const clientCharacterConfig = useCharacter(characterConfig || undefined);
  const activeConfig = clientCharacterConfig || characterConfig;
  const character = activeConfig?.key?.toLowerCase() ?? 'default';
  const themeClass = character;
  const { user, session } = useAuth();

  const [paid, setPaid] = useState(false);
  const [nsfwMode, setNsfwMode] = useState(false);
  const [showNsfwDisclaimer, setShowNsfwDisclaimer] = useState(false);
  const isAnonymous = !user; // Use auth context instead of separate state
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [emoteSrc, setEmoteSrc] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);

  // Gallery and Prompts state
  const [showGallery, setShowGallery] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  // Engagement features (tab title, return visitor, idle detection)
  const {
    isIdle,
    shouldShowReturnWelcome,
    dismissReturnWelcome,
    dismissIdlePrompt,
    resetActivity,
  } = useEngagementFeatures();

  // Gallery and Prompts handlers
  const handleShowGallery = () => {
    setShowGallery(true);
  };

  const handleTogglePrompts = () => {
    setShowPrompts(prev => !prev);
  };

  const nsfwAllowed = !!entitlements?.features?.nsfw;
  // Track page view for Meta Pixel
  useEffect(() => {
    if (character && character !== 'default') {
      trackPageView('chat_page', character);
      trackConversationStart(character, isAnonymous);
    }
  }, [character, isAnonymous]);

  const isLocalhost =
    typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const theme = themeColors[character] || themeColors.default;

  // Open the globally-mounted login modal (mounted in layout via LoginPortal)
  const triggerLogin = () => {
    document.body.dataset.modal = 'open';
    window.dispatchEvent(new Event('modal-open'));
    window.dispatchEvent(new Event('open-login'));
  };

  async function refreshEntitlements(characterKey: string, retryCount = 0) {
    console.log(`🔄 RefreshEntitlements attempt ${retryCount + 1} for character: ${characterKey}`);
    
    try {
      // Try multiple times to get session if needed
      let session = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!session && attempts < maxAttempts) {
        const result = await supabase.auth.getSession();
        session = result.data?.session;
        attempts++;
        
        console.log(`🔄 Session attempt ${attempts}:`, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          hasToken: !!session?.access_token
        });
        
        if (!session && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.user?.id) headers['x-user-id'] = session.user.id;
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log(`🔄 Using auth token for API call: ${session.access_token.substring(0, 20)}...`);
      } else {
        console.warn(`🔄 No access token available for entitlements API call`);
      }

      const res = await fetch(`/api/entitlements?character=${characterKey}`, {
        method: 'GET',
        headers,
        credentials: 'include',
        cache: 'no-store',
      });

      console.log(`🔄 Entitlements API response:`, {
        status: res.status,
        ok: res.ok,
        statusText: res.statusText,
        hasSession: !!session,
        retryCount
      });

      if (!res.ok) {
        // Special handling for 401 errors when user is clearly authenticated
        if (res.status === 401 && session?.user && retryCount < 2) {
          console.log(`🔄 Entitlements 401 but user is logged in, retrying in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => refreshEntitlements(characterKey, retryCount + 1), (retryCount + 1) * 1000);
          return;
        }
        
        // For 500 errors, also retry a couple times
        if (res.status === 500 && retryCount < 2) {
          console.log(`🔄 Entitlements 500 error, retrying in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => refreshEntitlements(characterKey, retryCount + 1), (retryCount + 1) * 1000);
          return;
        }
        
        // If not authenticated or API error, reset to default free state
        console.log(`🔄 Entitlements API error: ${res.status}. User authentication failed after retries.`);
        const errorText = await res.text();
        console.error(`🔄 Error response body:`, errorText);
        
        setEntitlements({ 
          unlocked: false, 
          tier: 'free',
          features: { chat: true, nsfw: false, voice: false },
          canBuyCredits: false,
          dailyChatCount: 0,
          dailyChatLimit: 5,
          dailyLimitReached: false
        });
        setPaid(false);
        return;
      }

      const ent: Entitlements = await res.json();
      console.log(`🔄 ✅ Entitlements loaded successfully:`, ent);
      setEntitlements(ent);
      setPaid(Boolean(ent?.unlocked));

      // Clamp NSFW off if not entitled
      if (nsfwMode && !ent?.features?.nsfw) {
        setNsfwMode(false);
        if (session?.user) {
          await supabase.auth.updateUser({ data: { nsfwMode: false } }).catch(() => {});
        }
        window.dispatchEvent(new CustomEvent('nsfw-disabled-by-entitlement'));
      }
    } catch (error) {
      console.error('🔄 ❌ Failed to refresh entitlements:', error);
      // Reset to default free state on error
      setEntitlements({ 
        unlocked: false, 
        tier: 'free',
        features: { chat: true, nsfw: false, voice: false },
        canBuyCredits: false,
        dailyChatCount: 0,
        dailyChatLimit: 5,
        dailyLimitReached: false
      });
      setPaid(false);
    }
  }

  const handleToggleNsfw = async (value: boolean) => {
    // When turning NSFW ON, show the disclaimer modal first
    if (value) {
      setShowNsfwDisclaimer(true);
      return;
    }

    // When turning NSFW OFF, proceed directly
    console.log('🔍 NSFW Toggle: Setting nsfwMode to', value);
    setNsfwMode(value);
    
    try {
      // Check if user is authenticated
      if (!user?.id || !session) {
        console.error('🔍 NSFW Toggle: Missing user or session from AuthContext:', {
          hasUser: !!user?.id,
          hasSession: !!session,
          hasAccessToken: !!session?.access_token
        });
        return;
      }
      
      console.log('🔍 NSFW Toggle: Using proper API endpoint for update:', {
        userId: user.id,
        userEmail: user.email,
        nsfwMode: value
      });
      
      // Use proper API endpoint with SSR auth pattern
      const response = await fetch('/api/user/nsfw-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ nsfwMode: value })
      });
      
      const result = await response.json();
      console.log('🔍 NSFW Toggle: API response:', {
        status: response.status,
        ok: response.ok,
        result
      });
      
      if (!response.ok) {
        console.error('🔍 NSFW Toggle: API error:', result);
        throw new Error(result.error || 'Failed to update NSFW mode');
      }
      
      console.log('🔍 NSFW Toggle: Successfully updated NSFW mode via API');
      
      // Force refresh entitlements to ensure the chat API gets the updated metadata
      setTimeout(() => {
        refreshEntitlements(character);
      }, 100);
      
    } catch (err) {
      console.error('🔍 NSFW Toggle: Failed to update NSFW mode:', err);
      // Reset the toggle on error
      setNsfwMode(!value);
    }
  };

  // NSFW Disclaimer Modal Handlers
  const handleNsfwDisclaimerAccept = async () => {
    setShowNsfwDisclaimer(false);
    console.log('🔍 NSFW Disclaimer: User accepted, enabling NSFW mode');

    // Now actually enable NSFW mode
    setNsfwMode(true);

    try {
      // Check if user is authenticated
      if (!user?.id || !session) {
        console.error('🔍 NSFW Toggle: Missing user or session from AuthContext:', {
          hasUser: !!user?.id,
          hasSession: !!session,
          hasAccessToken: !!session?.access_token
        });
        return;
      }

      console.log('🔍 NSFW Toggle: Using proper API endpoint for update');

      // Use proper API endpoint with SSR auth pattern
      const response = await fetch('/api/user/nsfw-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ nsfwMode: true })
      });

      const result = await response.json();
      console.log('🔍 NSFW Toggle: API response:', {
        status: response.status,
        ok: response.ok,
        result
      });

      if (!response.ok) {
        console.error('🔍 NSFW Toggle: API error:', result);
        throw new Error(result.error || 'Failed to update NSFW mode');
      }

      console.log('🔍 NSFW Toggle: Successfully updated NSFW mode via API');

      // Force refresh entitlements to ensure the chat API gets the updated metadata
      setTimeout(() => {
        refreshEntitlements(character);
      }, 100);

    } catch (err) {
      console.error('🔍 NSFW Toggle: Failed to update NSFW mode:', err);
      // Reset the toggle on error
      setNsfwMode(false);
    }
  };

  const handleNsfwDisclaimerDecline = () => {
    setShowNsfwDisclaimer(false);
    setNsfwMode(false); // Reset toggle to OFF when user declines
    console.log('🔍 NSFW Disclaimer: User declined, keeping safe mode');
  };

  // First-run intro message
  useEffect(() => {
    if (!characterConfig) return;
    if (typeof window === 'undefined') return;

    const key = `intro_sent_${characterConfig.displayName}`;
    if (!localStorage.getItem(key)) {
      const primer = `Hey you 😘 I'm ${characterConfig.displayName}. Want me to show you around?`;
      window.dispatchEvent(new CustomEvent('send-intro-message', { detail: primer }));
      localStorage.setItem(key, '1');
    }
  }, [characterConfig?.displayName]);

  // Age verification for NSFW characters - REMOVED AUTOMATIC TRIGGERING
  // The NSFW gate modal should only show when users specifically click "Upgrade to NSFW" buttons,
  // not automatically when visiting NSFW character pages. Users can use SFW versions of characters.

  // Init + react to auth changes
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authed = !!session?.user;
      // isAnonymous is now derived from auth context, no need to set state

      await refreshEntitlements(character);

      if (authed && session!.user.user_metadata?.nsfwMode !== undefined) {
        const desired = !!session!.user.user_metadata.nsfwMode && nsfwAllowed;
        setNsfwMode(desired);
      }

      if (session?.user?.email === 'tramel.jones@icloud.com' || isLocalhost) {
        setAdmin(true);
      }
    };
    init();

    // No need for separate auth listener - AuthContext handles this
    return () => {}; // No cleanup needed
  }, [character, nsfwAllowed, isLocalhost]);

  // Sync nsfwMode with user metadata when user changes
  useEffect(() => {
    const syncNsfwMode = () => {
      if (user?.id && user?.user_metadata && nsfwAllowed !== undefined) {
        const metadataNsfwMode = user.user_metadata.nsfwMode;
        const desired = !!metadataNsfwMode && nsfwAllowed;
        
        console.log('🔍 Syncing NSFW mode from AuthContext user metadata:', { 
          userId: user.id,
          metadataNsfwMode,
          nsfwAllowed,
          desired,
          currentNsfwMode: nsfwMode,
          userMetadata: user.user_metadata
        });
        
        if (desired !== nsfwMode) {
          console.log('🔍 Updating NSFW mode from AuthContext metadata:', {
            from: nsfwMode,
            to: desired
          });
          setNsfwMode(desired);
        }
      } else {
        console.log('🔍 No user metadata available for NSFW sync:', {
          hasUser: !!user?.id,
          hasMetadata: !!user?.user_metadata,
          nsfwAllowed
        });
      }
    };
    
    syncNsfwMode();
  }, [user, nsfwAllowed]);

  // Refresh entitlements when auth state changes (from AuthContext)
  useEffect(() => {
    if (user) {
      refreshEntitlements(character);
    }
  }, [user, character]);

  // Listen for credit consumption events to refresh entitlements in real-time
  useEffect(() => {
    const handleRefreshEntitlements = () => {
      console.log('🔄 Credit consumption detected, refreshing entitlements');
      refreshEntitlements(character);
    };

    window.addEventListener('refresh-entitlements', handleRefreshEntitlements);
    return () => {
      window.removeEventListener('refresh-entitlements', handleRefreshEntitlements);
    };
  }, [character]);

  // Theme is now handled globally by CharacterThemeProvider in layout.tsx

  if (!activeConfig) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Character Not Found</h1>
        <p>This domain is not mapped to any character.</p>
      </div>
    );
  }

  return (
    <div className={`chat-page ${themeClass}`}>
      <ChatHeader
        characterName={activeConfig.displayName}
        onLoginClick={triggerLogin}
        paid={paid}
        nsfwAllowed={nsfwAllowed}
        nsfwMode={nsfwMode}
        onToggleNsfw={handleToggleNsfw}
        emoteSrc={emoteSrc ?? undefined}
        // New server-side auth props
        user={user}
        isAuthenticated={!isAnonymous}
        userEntitlements={entitlements}
        onSignOut={async () => {
          await supabase.auth.signOut();
        }}
        // Gallery and Prompts functionality
        onShowGallery={handleShowGallery}
        onTogglePrompts={handleTogglePrompts}
        showPrompts={showPrompts}
      />

      <div className="flex flex-1 pt-16 sm:pt-18 chat-content-area">
        <ChatLayout
          config={activeConfig}
          nsfwMode={nsfwMode}
          onEmoteChange={(src) => setEmoteSrc(src)}
          onTriggerLogin={triggerLogin}
          isAnonymous={isAnonymous}
          onShowGallery={handleShowGallery}
          onTogglePrompts={handleTogglePrompts}
          showPrompts={showPrompts}
        />
      </div>

      {/* {admin && <DevSwitcher />} */}
      {/* Bottom spacing handled by CSS ::after pseudo-element to prevent gaps */}
      
      {/* Back to Top Button */}
      <BackToTopButton />
      
      {/* Portal Link Footer */}
      <div className="fixed bottom-4 left-4 z-[30]">
        <Link 
          href="/portal" 
          className="inline-flex items-center px-3 py-2 text-xs bg-white/10 hover:bg-white/20 text-purple-300 hover:text-white backdrop-blur-sm rounded-full border border-white/20 transition-all duration-300 hover:scale-105 shadow-lg"
          style={{
            marginBottom: 'max(16px, env(safe-area-inset-bottom))',
            marginLeft: 'max(16px, env(safe-area-inset-left))'
          }}
        >
          <span className="mr-1">✨</span>
          Other Realms Await...
        </Link>
      </div>
      
      {/* Selfie Gallery */}
      <SelfieGallery
        characterKey={character}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />

      {/* Engagement Features */}
      <ReturnVisitorWelcome
        show={shouldShowReturnWelcome}
        onDismiss={dismissReturnWelcome}
      />
      <IdleDetectionPrompt
        show={isIdle}
        onDismiss={dismissIdlePrompt}
        hasMessages={true} // You can track this based on message count
      />

      {/* NSFW Disclaimer Modal */}
      <NsfwDisclaimerModal
        isOpen={showNsfwDisclaimer}
        onAccept={handleNsfwDisclaimerAccept}
        onDecline={handleNsfwDisclaimerDecline}
      />

      {/* ⛔️ No local LoginModal here. Global modal lives in layout via LoginPortal. */}
    </div>
  );
}
