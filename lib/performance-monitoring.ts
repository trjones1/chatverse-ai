// lib/performance-monitoring.ts
import * as Sentry from '@sentry/nextjs';

export interface PerformanceContext {
  characterKey?: string;
  userTier?: string;
  feature?: string;
  metadata?: Record<string, any>;
}

/**
 * Monitor critical user flows with performance tracking
 */
export class PerformanceMonitor {
  private transactions: Map<string, any> = new Map();

  /**
   * Start monitoring a user flow
   */
  startFlow(flowName: string, context?: PerformanceContext): string {
    const flowId = `${flowName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set tags for the current span context
    if (context) {
      if (context.characterKey) {
        Sentry.setTag('character', context.characterKey);
      }
      if (context.userTier) {
        Sentry.setTag('user_tier', context.userTier);
      }
      if (context.feature) {
        Sentry.setTag('feature', context.feature);
      }
      if (context.metadata) {
        Object.entries(context.metadata).forEach(([key, value]) => {
          Sentry.setTag(key, String(value));
        });
      }
    }

    // Store flow info for later operations
    this.transactions.set(flowId, { name: flowName, context });
    return flowId;
  }

  /**
   * Add a checkpoint to the flow
   */
  addCheckpoint(flowId: string, checkpointName: string, data?: Record<string, any>) {
    const flowData = this.transactions.get(flowId);
    if (!flowData) return;

    // Add breadcrumb
    Sentry.addBreadcrumb({
      message: `Checkpoint: ${checkpointName}`,
      category: 'performance',
      level: 'info',
      data,
    });
  }

  /**
   * End the flow monitoring
   */
  endFlow(flowId: string, status: 'success' | 'error' | 'cancelled' = 'success') {
    const flowData = this.transactions.get(flowId);
    if (!flowData) return;

    // Add final breadcrumb
    Sentry.addBreadcrumb({
      message: `Flow completed: ${flowData.name}`,
      category: 'performance',
      level: status === 'success' ? 'info' : 'error',
      data: { status, flowId },
    });

    this.transactions.delete(flowId);
  }

  /**
   * Measure specific operation within a flow
   */
  async measureOperation<T>(
    flowId: string,
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const flowData = this.transactions.get(flowId);
    if (!flowData) {
      // Fallback to standalone measurement
      return this.measureStandalone(operationName, operation, context);
    }

    return await Sentry.startSpan({
      name: operationName,
      op: 'operation',
      attributes: context || {},
    }, async (span) => {
      try {
        const result = await operation();
        span?.setStatus({ code: 1, message: 'OK' });
        return result;
      } catch (error) {
        span?.setStatus({ code: 2, message: 'INTERNAL_ERROR' });
        throw error;
      }
    });
  }

  /**
   * Measure operation without flow context
   */
  async measureStandalone<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    return await Sentry.startSpan({
      name: operationName,
      op: 'standalone_operation',
      attributes: context || {},
    }, async (span) => {
      try {
        const result = await operation();
        span?.setStatus({ code: 1, message: 'OK' });
        return result;
      } catch (error) {
        span?.setStatus({ code: 2, message: 'INTERNAL_ERROR' });
        throw error;
      }
    });
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Pre-defined critical flows for the application
 */
export const CriticalFlows = {
  // Authentication flows
  USER_LOGIN: 'user_login',
  USER_SIGNUP: 'user_signup',
  PASSWORD_RESET: 'password_reset',

  // Chat flows
  CHAT_INITIALIZATION: 'chat_initialization',
  MESSAGE_SEND: 'message_send',
  MESSAGE_RECEIVE: 'message_receive',

  // Payment flows
  SUBSCRIPTION_PURCHASE: 'subscription_purchase',
  VOICE_PACK_PURCHASE: 'voice_pack_purchase',
  UPGRADE_SUBSCRIPTION: 'upgrade_subscription',
  BILLING_PORTAL: 'billing_portal',

  // Voice flows
  VOICE_GENERATION: 'voice_generation',
  VOICE_CALL_START: 'voice_call_start',
  VOICE_CALL_END: 'voice_call_end',

  // Character flows
  CHARACTER_SWITCH: 'character_switch',
  NSFW_MODE_TOGGLE: 'nsfw_mode_toggle',

  // Performance critical operations
  PAGE_LOAD: 'page_load',
  API_RESPONSE: 'api_response',
  DATABASE_QUERY: 'database_query',
} as const;

/**
 * Monitor chat message flow
 */
export async function monitorChatFlow(
  characterKey: string,
  userTier: string,
  operation: () => Promise<any>
) {
  const flowId = performanceMonitor.startFlow(CriticalFlows.MESSAGE_SEND, {
    characterKey,
    userTier,
    feature: 'chat',
  });

  try {
    performanceMonitor.addCheckpoint(flowId, 'message_validation');
    
    const result = await performanceMonitor.measureOperation(
      flowId,
      'ai_response_generation',
      operation,
      { character: characterKey }
    );

    performanceMonitor.addCheckpoint(flowId, 'response_complete');
    performanceMonitor.endFlow(flowId, 'success');
    
    return result;
  } catch (error) {
    performanceMonitor.endFlow(flowId, 'error');
    throw error;
  }
}

/**
 * Monitor voice generation flow
 */
export async function monitorVoiceFlow(
  characterKey: string,
  operation: () => Promise<any>
) {
  const flowId = performanceMonitor.startFlow(CriticalFlows.VOICE_GENERATION, {
    characterKey,
    feature: 'voice',
  });

  try {
    performanceMonitor.addCheckpoint(flowId, 'voice_request_start');
    
    const result = await performanceMonitor.measureOperation(
      flowId,
      'elevenlabs_api_call',
      operation,
      { character: characterKey, provider: 'elevenlabs' }
    );

    performanceMonitor.addCheckpoint(flowId, 'voice_generation_complete');
    performanceMonitor.endFlow(flowId, 'success');
    
    return result;
  } catch (error) {
    performanceMonitor.endFlow(flowId, 'error');
    throw error;
  }
}

/**
 * Monitor payment flow
 */
export async function monitorPaymentFlow(
  operation: string,
  characterKey: string,
  productType: string,
  paymentOperation: () => Promise<any>
) {
  const flowId = performanceMonitor.startFlow(operation, {
    characterKey,
    feature: 'payment',
    metadata: { product_type: productType },
  });

  try {
    performanceMonitor.addCheckpoint(flowId, 'payment_validation');
    
    const result = await performanceMonitor.measureOperation(
      flowId,
      'stripe_api_call',
      paymentOperation,
      { 
        character: characterKey,
        product_type: productType,
        payment_provider: 'stripe'
      }
    );

    performanceMonitor.addCheckpoint(flowId, 'payment_complete');
    performanceMonitor.endFlow(flowId, 'success');
    
    return result;
  } catch (error) {
    performanceMonitor.endFlow(flowId, 'error');
    throw error;
  }
}

/**
 * Monitor database operations
 */
export async function monitorDatabaseOperation<T>(
  operationName: string,
  table: string,
  operation: () => Promise<T>,
  characterKey?: string
): Promise<T> {
  return performanceMonitor.measureStandalone(
    `db_${operationName}`,
    operation,
    {
      table,
      character: characterKey,
      operation: operationName,
    }
  );
}

/**
 * Monitor API endpoint performance
 */
export function monitorApiEndpoint(endpoint: string, method: string) {
  return function <T extends any[]>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<any>>
  ) {
    const method_original = descriptor.value;
    
    if (!method_original) return;

    descriptor.value = async function (...args: T) {
      return performanceMonitor.measureStandalone(
        `api_${endpoint}`,
        () => method_original.apply(this, args),
        {
          endpoint,
          method,
        }
      );
    };
  };
}

/**
 * Client-side performance monitoring utilities
 */
export const ClientPerformance = {
  /**
   * Monitor page load performance
   */
  monitorPageLoad(pageName: string, characterKey?: string) {
    if (typeof window === 'undefined') return;

    Sentry.startSpan({
      name: `page_load_${pageName}`,
      op: 'navigation',
    }, (span) => {
      if (characterKey) {
        span?.setAttributes({ character: characterKey });
      }

      // Monitor core web vitals
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              Sentry.setMeasurement('lcp', entry.startTime, 'millisecond');
            }
            if (entry.entryType === 'first-input') {
              const fiEntry = entry as any; // Cast to any to access processingStart
              if (fiEntry.processingStart) {
                Sentry.setMeasurement('fid', fiEntry.processingStart - entry.startTime, 'millisecond');
              }
            }
          });
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
      }

      // End span when page is fully loaded
      window.addEventListener('load', () => {
        span?.setStatus({ code: 1, message: 'OK' });
      }, { once: true });
    });
  },

  /**
   * Monitor user interactions
   */
  monitorInteraction(interactionName: string, element?: string) {
    Sentry.addBreadcrumb({
      message: `User interaction: ${interactionName}`,
      category: 'ui',
      level: 'info',
      data: { element },
    });
  },
};