// lib/sentry-utils.ts
import * as Sentry from '@sentry/nextjs';
import { getCharacterConfig } from '@/lib/characters.config';

export interface SentryContext {
  user?: {
    id?: string;
    subscription_tier?: string;
    character_preference?: string;
    // No PII - just anonymous usage patterns
  };
  character?: {
    key: string;
    name: string;
    domain: string;
  };
  feature?: {
    name: string;
    version?: string;
  };
  performance?: {
    operation: string;
    duration?: number;
  };
}

/**
 * Set character-specific context for error tracking
 */
export function setCharacterContext(hostname: string) {
  const characterConfig = getCharacterConfig(hostname);
  
  Sentry.setTag('character', characterConfig.key);
  Sentry.setTag('character_name', characterConfig.displayName);
  Sentry.setTag('domain', hostname);
  
  Sentry.setContext('character', {
    key: characterConfig.key,
    name: characterConfig.displayName,
    domain: hostname,
    theme: characterConfig.theme.accent,
  });
}

/**
 * Set privacy-safe user context
 */
export function setUserContext(context: {
  hasSubscription?: boolean;
  subscriptionTier?: string;
  isNsfwUser?: boolean;
  voiceCredits?: number;
  lastActiveCharacter?: string;
}) {
  // Only set anonymous usage patterns, no PII
  Sentry.setUser({
    id: undefined, // Never track user IDs
    email: undefined, // Never track emails
    username: undefined, // Never track usernames
  });

  Sentry.setContext('user_anonymous', {
    has_subscription: context.hasSubscription || false,
    subscription_tier: context.subscriptionTier || 'free',
    nsfw_enabled: context.isNsfwUser || false,
    voice_credits: context.voiceCredits !== undefined ? (context.voiceCredits > 0) : false,
    last_character: context.lastActiveCharacter || 'unknown',
  });
}

/**
 * Track feature usage for debugging
 */
export function trackFeatureUsage(feature: string, metadata?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: `Feature used: ${feature}`,
    category: 'feature',
    level: 'info',
    data: metadata,
  });
}

/**
 * Track API errors with context
 */
export function trackApiError(error: Error, context: {
  endpoint: string;
  method: string;
  statusCode?: number;
  characterKey?: string;
  userTier?: string;
}) {
  Sentry.withScope((scope) => {
    scope.setTag('api_endpoint', context.endpoint);
    scope.setTag('api_method', context.method);
    scope.setTag('api_status', context.statusCode?.toString() || 'unknown');
    
    if (context.characterKey) {
      scope.setTag('character', context.characterKey);
    }
    
    if (context.userTier) {
      scope.setTag('user_tier', context.userTier);
    }
    
    scope.setContext('api_request', {
      endpoint: context.endpoint,
      method: context.method,
      status_code: context.statusCode,
      timestamp: new Date().toISOString(),
    });
    
    scope.setLevel('error');
    Sentry.captureException(error);
  });
}

/**
 * Track payment-related errors with extra context
 */
export function trackPaymentError(error: Error, context: {
  operation: string;
  characterKey?: string;
  productType?: string;
  amount?: number;
  currency?: string;
}) {
  Sentry.withScope((scope) => {
    scope.setTag('payment_operation', context.operation);
    scope.setTag('payment_product', context.productType || 'unknown');
    
    if (context.characterKey) {
      scope.setTag('character', context.characterKey);
    }
    
    scope.setContext('payment', {
      operation: context.operation,
      product_type: context.productType,
      amount: context.amount,
      currency: context.currency || 'USD',
      timestamp: new Date().toISOString(),
    });
    
    scope.setLevel('error');
    scope.setFingerprint(['payment', context.operation, context.productType || 'unknown']);
    Sentry.captureException(error);
  });
}

/**
 * Track voice feature errors
 */
export function trackVoiceError(error: Error, context: {
  operation: string;
  characterKey?: string;
  provider?: string;
  credits?: number;
}) {
  Sentry.withScope((scope) => {
    scope.setTag('voice_operation', context.operation);
    scope.setTag('voice_provider', context.provider || 'elevenlabs');
    
    if (context.characterKey) {
      scope.setTag('character', context.characterKey);
    }
    
    scope.setContext('voice', {
      operation: context.operation,
      provider: context.provider,
      has_credits: (context.credits || 0) > 0,
      timestamp: new Date().toISOString(),
    });
    
    scope.setLevel('error');
    scope.setFingerprint(['voice', context.operation, context.characterKey || 'unknown']);
    Sentry.captureException(error);
  });
}

/**
 * Track chat-related errors
 */
export function trackChatError(error: Error, context: {
  operation: string;
  characterKey?: string;
  messageCount?: number;
  model?: string;
}) {
  Sentry.withScope((scope) => {
    scope.setTag('chat_operation', context.operation);
    scope.setTag('chat_model', context.model || 'unknown');
    
    if (context.characterKey) {
      scope.setTag('character', context.characterKey);
    }
    
    scope.setContext('chat', {
      operation: context.operation,
      model: context.model,
      message_count: context.messageCount,
      timestamp: new Date().toISOString(),
    });
    
    scope.setLevel('error');
    scope.setFingerprint(['chat', context.operation, context.characterKey || 'unknown']);
    Sentry.captureException(error);
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, operation: string) {
  return Sentry.startSpan({
    name,
    op: operation,
  }, () => {});
}

/**
 * Measure performance of critical operations
 */
export async function measurePerformance<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return await Sentry.startSpan({
    name,
    op: operation,
    attributes: context || {},
  }, async (span) => {
    try {
      const result = await fn();
      span?.setStatus({ code: 1, message: 'OK' }); // OK status
      return result;
    } catch (error) {
      span?.setStatus({ code: 2, message: 'INTERNAL_ERROR' }); // Error status
      throw error;
    }
  });
}

/**
 * Server-side function to get character context from headers
 * Use this only in server components and API routes
 */
export async function getServerCharacterContext(hostname: string) {
  const characterConfig = getCharacterConfig(hostname);
  
  return {
    key: characterConfig.key,
    name: characterConfig.displayName,
    domain: hostname,
  };
}

/**
 * Add custom breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}