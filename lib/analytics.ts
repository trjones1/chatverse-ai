// lib/analytics.ts
import { getCharacterConfig } from './characters.config';

// Utility function to get user tier from current auth system
function getUserTier(): 'anonymous' | 'free' | 'premium' | 'premium_plus' {
  try {
    if (typeof window === 'undefined') return 'anonymous';

    // Check Supabase session in localStorage (set by Supabase client)
    const supabaseSession = localStorage.getItem('sb-copjpqtwdqrclfrwoaeb-auth-token');
    if (!supabaseSession) return 'anonymous';

    try {
      const session = JSON.parse(supabaseSession);
      if (!session?.user?.id) return 'anonymous';

      // Check for subscription info in user metadata or separate storage
      const entitlements = localStorage.getItem('user_entitlements');
      if (entitlements) {
        const parsed = JSON.parse(entitlements);
        if (parsed.paid) {
          // Check specific tier from orders or metadata
          if (parsed.tier === 'premium_plus') return 'premium_plus';
          return 'premium';
        }
      }

      // User is authenticated but no subscription
      return 'free';
    } catch {
      return 'anonymous';
    }
  } catch {
    return 'anonymous';
  }
}

// Base tracking function
export function track(event: string, params: Record<string, any> = {}) {
  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'chatwithlexi.com';
    const config = getCharacterConfig(hostname);
    
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event,
      character: config.key,
      hostname,
      user_tier: getUserTier(),
      timestamp: Date.now(),
      ...params,
    });
  } catch {
    // swallow — GTM not loaded
  }
}

// Enhanced tracking functions for MVP requirements

/**
 * Track user sign up events
 */
export function trackSignUp(method: 'email' | 'google' | 'phone' = 'email', character?: string) {
  track('sign_up', {
    method,
    character: character || getCharacterConfig(window.location.hostname).key,
  });
}

/**
 * Track message sent events
 */
export function trackMessageSent(character: string, messageCount: number, sessionDuration?: number) {
  track('message_sent', {
    character,
    message_count: messageCount,
    user_tier: getUserTier(),
    session_duration: sessionDuration,
  });
}

/**
 * Track voice message played events
 */
export function trackVoicePlayed(character: string, creditsRemaining?: number, messageLength?: number) {
  track('voice_played', {
    character,
    credits_remaining: creditsRemaining,
    message_length: messageLength,
    user_tier: getUserTier(),
  });
}

/**
 * Track character switches
 */
export function trackCharacterSwitch(fromCharacter: string, toCharacter: string) {
  track('character_switch', {
    from_character: fromCharacter,
    to_character: toCharacter,
    user_tier: getUserTier(),
  });
}

/**
 * Track subscription purchases (Enhanced E-commerce)
 */
export function trackSubscriptionPurchase(subscriptionData: {
  transactionId: string;
  value: number;
  currency?: string;
  subscriptionTier: 'sfw' | 'nsfw';
  character: string;
  isUpgrade?: boolean;
}) {
  const { transactionId, value, currency = 'USD', subscriptionTier, character, isUpgrade = false } = subscriptionData;
  
  track('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    item_category: 'subscription',
    subscription_tier: subscriptionTier,
    character,
    is_upgrade: isUpgrade,
    user_tier: getUserTier(),
  });
}

/**
 * Track voice pack purchases (Enhanced E-commerce)
 */
export function trackVoicePackPurchase(voicePackData: {
  transactionId: string;
  value: number;
  currency?: string;
  credits: number;
  character: string;
  packageType?: string;
}) {
  const { transactionId, value, currency = 'USD', credits, character, packageType } = voicePackData;
  
  track('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    item_category: 'voice_credits',
    credits,
    character,
    package_type: packageType,
    user_tier: getUserTier(),
  });
}

/**
 * Track tip transactions (Enhanced E-commerce)
 */
export function trackTipPurchase(tipData: {
  transactionId: string;
  value: number;
  currency?: string;
  character: string;
  message?: string;
}) {
  const { transactionId, value, currency = 'USD', character, message } = tipData;
  
  track('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    item_category: 'tip',
    character,
    has_message: !!message,
    user_tier: getUserTier(),
  });
}

/**
 * Track conversion funnel steps
 */
export function trackFunnelStep(step: 'landing_view' | 'account_creation_start' | 'account_creation_complete' | 'first_message' | 'subscription_view' | 'subscription_start' | 'subscription_complete', character: string, source?: string) {
  track('conversion_funnel', {
    step,
    character,
    source,
    user_tier: getUserTier(),
  });
}

/**
 * Track premium CTA interactions
 */
export function trackPremiumCTA(action: 'view' | 'click' | 'close', location: string, character: string, tier?: 'sfw' | 'nsfw') {
  track('premium_cta', {
    action,
    location,
    character,
    tier,
    user_tier: getUserTier(),
  });
}

/**
 * Track anonymous user message limits
 */
export function trackMessageLimit(character: string, limitType: 'warning' | 'blocked', messagesUsed: number, totalLimit: number) {
  track('message_limit', {
    character,
    limit_type: limitType,
    messages_used: messagesUsed,
    total_limit: totalLimit,
    user_tier: getUserTier(),
  });
}

/**
 * Track page views with enhanced data
 */
export function trackPageView(pagePath: string, character: string, source?: string) {
  track('page_view', {
    page_path: pagePath,
    character,
    source,
    user_tier: getUserTier(),
    referrer: document.referrer || 'direct',
  });
}

/**
 * Track user engagement events
 */
export function trackEngagement(action: 'session_start' | 'session_end' | 'idle_warning' | 'return_from_idle', character: string, duration?: number) {
  track('user_engagement', {
    action,
    character,
    duration,
    user_tier: getUserTier(),
  });
}

/**
 * Track modal interactions
 */
export function trackModal(action: 'open' | 'close' | 'interact', modalType: string, character: string) {
  track('modal_interaction', {
    action,
    modal_type: modalType,
    character,
    user_tier: getUserTier(),
  });
}

/**
 * Track error events for debugging
 */
export function trackError(errorType: string, errorMessage: string, location: string, character: string) {
  track('error_event', {
    error_type: errorType,
    error_message: errorMessage,
    location,
    character,
    user_tier: getUserTier(),
  });
}
