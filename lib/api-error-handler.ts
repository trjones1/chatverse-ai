// lib/api-error-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { trackApiError, setCharacterContext, getServerCharacterContext } from './sentry-utils';

export interface ApiErrorContext {
  endpoint: string;
  method: string;
  userId?: string;
  characterKey?: string;
  userTier?: string;
}

/**
 * Higher-order function to wrap API routes with error tracking
 */
export function withSentryApiRoute<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: Partial<ApiErrorContext>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    
    const apiContext: ApiErrorContext = {
      endpoint: request.nextUrl.pathname,
      method: request.method,
      ...context,
    };

    // Set character context from hostname
    try {
      const hostname = request.headers.get('host') || 'localhost:3000';
      setCharacterContext(hostname);
    } catch (error) {
      console.warn('Failed to set character context:', error);
    }

    try {
      // Add request context
      Sentry.setContext('request', {
        url: request.nextUrl.href,
        method: request.method,
        headers: Object.fromEntries(
          Array.from(request.headers.entries()).filter(([key]) => 
            !['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())
          )
        ),
      });

      const result = await Sentry.startSpan({
        name: `${apiContext.method} ${apiContext.endpoint}`,
        op: 'http.server',
      }, async (span) => {
        const response = await handler(...args);
        span?.setStatus({ code: 1, message: 'OK' });
        span?.setAttributes({ 'http.status_code': response.status });
        return response;
      });
      
      return result;
      
    } catch (error) {
      if (error instanceof Error) {
        trackApiError(error, {
          ...apiContext,
          statusCode: 500,
        });
      }
      
      // Re-throw to maintain original error handling
      throw error;
    }
  };
}

/**
 * Standardized error response handler
 */
export function createErrorResponse(
  error: Error,
  context: {
    status?: number;
    endpoint: string;
    method: string;
    characterKey?: string;
    publicMessage?: string;
  }
): NextResponse {
  const status = context.status || 500;
  const publicMessage = context.publicMessage || 'An unexpected error occurred';
  
  // Track the error
  trackApiError(error, {
    endpoint: context.endpoint,
    method: context.method,
    statusCode: status,
    characterKey: context.characterKey,
  });
  
  // Return appropriate response based on environment
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      error: publicMessage,
      details: error.message,
      stack: error.stack,
    }, { status });
  }
  
  return NextResponse.json({
    error: publicMessage,
  }, { status });
}

/**
 * Middleware for API route validation and error handling
 */
export function apiMiddleware(handler: (req: NextRequest) => Promise<NextResponse>) {
  return withSentryApiRoute(async (req: NextRequest) => {
    try {
      // Add basic request tracking
      Sentry.addBreadcrumb({
        message: `API Request: ${req.method} ${req.nextUrl.pathname}`,
        category: 'api',
        level: 'info',
      });

      return await handler(req);
    } catch (error) {
      if (error instanceof Error) {
        return createErrorResponse(error, {
          endpoint: req.nextUrl.pathname,
          method: req.method,
        });
      }
      
      // Handle non-Error objects
      return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
  });
}

/**
 * Specific error handlers for common scenarios
 */
export class PaymentError extends Error {
  constructor(message: string, public operation: string, public characterKey?: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class VoiceError extends Error {
  constructor(message: string, public operation: string, public provider?: string) {
    super(message);
    this.name = 'VoiceError';
  }
}

export class ChatError extends Error {
  constructor(message: string, public operation: string, public model?: string) {
    super(message);
    this.name = 'ChatError';
  }
}

export class AuthError extends Error {
  constructor(message: string, public operation: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Rate limiting error handler
 */
export function handleRateLimitError(
  endpoint: string,
  method: string,
  characterKey?: string
) {
  const error = new Error('Rate limit exceeded');
  
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'rate_limit');
    scope.setTag('endpoint', endpoint);
    scope.setTag('method', method);
    
    if (characterKey) {
      scope.setTag('character', characterKey);
    }
    
    scope.setLevel('warning');
    Sentry.captureException(error);
  });
  
  return NextResponse.json({
    error: 'Rate limit exceeded. Please try again later.',
  }, { status: 429 });
}

/**
 * Authentication error handler
 */
export function handleAuthError(
  endpoint: string,
  method: string,
  characterKey?: string
) {
  const error = new AuthError('Authentication failed', 'auth_check');
  
  trackApiError(error, {
    endpoint,
    method,
    statusCode: 401,
    characterKey,
  });
  
  return NextResponse.json({
    error: 'Authentication required',
  }, { status: 401 });
}

/**
 * Validation error handler
 */
export function handleValidationError(
  validationErrors: string[],
  endpoint: string,
  method: string
) {
  const error = new Error(`Validation failed: ${validationErrors.join(', ')}`);
  
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'validation');
    scope.setTag('endpoint', endpoint);
    scope.setTag('method', method);
    scope.setContext('validation_errors', { errors: validationErrors });
    scope.setLevel('warning');
    Sentry.captureException(error);
  });
  
  return NextResponse.json({
    error: 'Validation failed',
    details: validationErrors,
  }, { status: 400 });
}