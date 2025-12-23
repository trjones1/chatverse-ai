// components/SentryUserProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCharacterConfig } from '@/lib/characters.config';
import { setUserContext, setCharacterContext, addBreadcrumb } from '@/lib/sentry-utils';

interface SentryContextProviderProps {
  children: ReactNode;
}

/**
 * Provider that automatically sets Sentry context based on user state
 * Maintains strict privacy by only tracking anonymous usage patterns
 */
export default function SentryUserProvider({ children }: SentryContextProviderProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Set character context based on current domain
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const characterConfig = getCharacterConfig(hostname);
      
      setCharacterContext(hostname);
      
      addBreadcrumb(`Page loaded on ${characterConfig.displayName} domain`, 'navigation', {
        character: characterConfig.key,
        domain: hostname,
      });
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    // Set privacy-safe user context
    const hasUser = !!user;

    // Get current character for context
    const characterConfig = typeof window !== 'undefined' 
      ? getCharacterConfig(window.location.hostname) 
      : null;
    
    setUserContext({
      hasSubscription: false, // Will be updated via other means
      subscriptionTier: 'free',
      isNsfwUser: false,
      voiceCredits: 0,
      lastActiveCharacter: characterConfig?.key,
    });

    // Add user state breadcrumb (anonymous)
    addBreadcrumb('User state updated', 'auth', {
      authenticated: hasUser,
      subscription_tier: 'free',
      has_credits: false,
      character: characterConfig?.key,
    });

  }, [user, loading]);

  return <>{children}</>;
}

/**
 * Hook to manually track user actions with privacy protection
 */
export function useSentryTracking() {
  const { user } = useAuth();

  const trackFeatureUsage = (feature: string, metadata?: Record<string, any>) => {
    const characterConfig = typeof window !== 'undefined' 
      ? getCharacterConfig(window.location.hostname) 
      : null;

    addBreadcrumb(`Feature used: ${feature}`, 'feature', {
      feature,
      character: characterConfig?.key,
      user_tier: 'free',
      ...metadata,
    });
  };

  const trackUserAction = (action: string, context?: Record<string, any>) => {
    const characterConfig = typeof window !== 'undefined' 
      ? getCharacterConfig(window.location.hostname) 
      : null;

    addBreadcrumb(`User action: ${action}`, 'user', {
      action,
      character: characterConfig?.key,
      timestamp: new Date().toISOString(),
      ...context,
    });
  };

  const trackCharacterSwitch = (fromCharacter: string, toCharacter: string) => {
    addBreadcrumb('Character switched', 'navigation', {
      from_character: fromCharacter,
      to_character: toCharacter,
      user_tier: 'free',
    });
  };

  const trackNsfwToggle = (enabled: boolean) => {
    const characterConfig = typeof window !== 'undefined' 
      ? getCharacterConfig(window.location.hostname) 
      : null;

    addBreadcrumb('NSFW mode toggled', 'preference', {
      nsfw_enabled: enabled,
      character: characterConfig?.key,
      user_tier: 'free',
    });
  };

  const trackPaymentIntent = (productType: string, characterKey?: string) => {
    addBreadcrumb('Payment intent started', 'payment', {
      product_type: productType,
      character: characterKey,
      user_tier: 'free',
    });
  };

  const trackVoiceUsage = (operation: string, characterKey?: string) => {
    addBreadcrumb(`Voice feature used: ${operation}`, 'voice', {
      operation,
      character: characterKey,
      has_credits: false,
    });
  };

  return {
    trackFeatureUsage,
    trackUserAction,
    trackCharacterSwitch,
    trackNsfwToggle,
    trackPaymentIntent,
    trackVoiceUsage,
  };
}

/**
 * Context for sharing Sentry tracking functions
 */
const SentryTrackingContext = createContext<ReturnType<typeof useSentryTracking> | null>(null);

export function SentryTrackingProvider({ children }: { children: ReactNode }) {
  const tracking = useSentryTracking();

  return (
    <SentryTrackingContext.Provider value={tracking}>
      {children}
    </SentryTrackingContext.Provider>
  );
}

export function useSentryTrackingContext() {
  const context = useContext(SentryTrackingContext);
  if (!context) {
    throw new Error('useSentryTrackingContext must be used within a SentryTrackingProvider');
  }
  return context;
}