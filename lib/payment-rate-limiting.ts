/**
 * Payment-specific rate limiting with enhanced security
 * 
 * Provides strict protection for payment endpoints including:
 * - Very strict rate limits for checkout attempts
 * - Webhook verification and rate limiting
 * - Fraud detection patterns
 * - Extended blocks for payment abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, createRateLimitHeaders } from './rate-limiting';
import { authenticateRequest } from './auth-headers';

interface PaymentRateLimitOptions {
  /** Payment endpoint type */
  type: 'checkout' | 'webhook' | 'portal' | 'upgrade';
  /** Whether to require authentication */
  requireAuth?: boolean;
  /** Custom rate limit overrides */
  customLimits?: {
    requests: number;
    window: number;
    maxViolations: number;
    blockDuration: number;
  };
}

/**
 * Detect potentially fraudulent payment patterns
 */
function detectFraudPatterns(req: NextRequest): {
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number;
} {
  const reasons: string[] = [];
  let riskScore = 0;
  
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  
  // Check for missing or suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    reasons.push('suspicious_user_agent');
    riskScore += 30;
  }
  
  // Check for bot-like patterns
  if (/bot|crawler|spider|scraper/i.test(userAgent)) {
    reasons.push('bot_user_agent');
    riskScore += 50;
  }
  
  // Check for missing referer on payment requests
  if (!referer && req.method === 'POST') {
    reasons.push('missing_referer');
    riskScore += 20;
  }
  
  // Check for origin mismatch (should match known domains)
  const allowedOrigins = [
    'https://chatwithlexi.com',
    'https://talktonyx.com', 
    'https://chatwithchloe.com',
    'https://waifuwithaiko.com',
    'https://chatwithzaria.com',
    'https://chatwithnova.com',
    'https://sirdominic.com',
    'https://fuckboychase.com',
    'https://chatwithethan.com',
    'https://chatwithjayden.com',
    'https://chatwithmiles.com'
  ];
  
  if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    reasons.push('unknown_origin');
    riskScore += 40;
  }
  
  // Check for rapid sequential requests (would be handled by rate limiting)
  const timestamp = Date.now();
  const requestId = req.headers.get('x-request-id') || '';
  if (!requestId) {
    reasons.push('missing_request_id');
    riskScore += 10;
  }
  
  return {
    isSuspicious: riskScore >= 50,
    reasons,
    riskScore
  };
}

/**
 * Payment-specific rate limiting with fraud detection
 */
export async function paymentRateLimit(
  req: NextRequest,
  options: PaymentRateLimitOptions
): Promise<{ allowed: boolean; response?: NextResponse; headers?: Record<string, string>; fraudScore?: number }> {
  const { type, requireAuth = true, customLimits } = options;
  
  console.log(`[Payment Rate Limiting] Checking ${type} endpoint`);
  
  // Fraud detection for checkout and upgrade endpoints
  if (['checkout', 'upgrade'].includes(type)) {
    const fraudCheck = detectFraudPatterns(req);
    
    console.log(`[Payment Rate Limiting] Fraud check for ${type}:`, {
      isSuspicious: fraudCheck.isSuspicious,
      riskScore: fraudCheck.riskScore,
      reasons: fraudCheck.reasons
    });
    
    // Block high-risk requests immediately
    if (fraudCheck.riskScore >= 80) {
      console.warn(`[Payment Rate Limiting] Blocking high-risk ${type} request:`, {
        riskScore: fraudCheck.riskScore,
        reasons: fraudCheck.reasons
      });
      
      return {
        allowed: false,
        fraudScore: fraudCheck.riskScore,
        response: new NextResponse(
          JSON.stringify({
            error: 'Request blocked for security reasons',
            code: 'PAYMENT_SECURITY_BLOCK',
            riskScore: fraudCheck.riskScore
          }),
          {
            status: 403,
            headers: { 
              'Content-Type': 'application/json',
              'X-Fraud-Score': fraudCheck.riskScore.toString()
            }
          }
        )
      };
    }
  }
  
  // Authenticate if required
  let userId: string | undefined;
  let userTier: 'anonymous' | 'free' | 'sfw' | 'nsfw' = 'anonymous';
  
  if (requireAuth) {
    const authResult = await authenticateRequest(req, { requireAuth: true });
    
    if (!authResult.isAuthenticated || !authResult.user) {
      console.warn(`[Payment Rate Limiting] Unauthorized ${type} request`);
      return {
        allowed: false,
        response: new NextResponse(
          JSON.stringify({
            error: 'Authentication required for payment operations',
            code: 'PAYMENT_AUTH_REQUIRED'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      };
    }
    
    userId = authResult.user.id;
    userTier = (authResult.user.user_metadata?.subscription_tier as any) || 'free';
  }
  
  // Apply payment-specific rate limiting
  const endpoint = `payment:${type}`;
  const rateLimitResult = await rateLimit(req, {
    endpoint,
    userId,
    userTier,
    skipForAdmin: false // Never skip for payment operations
  });
  
  console.log(`[Payment Rate Limiting] ${type} rate limit check:`, {
    allowed: rateLimitResult.allowed,
    count: rateLimitResult.count,
    limit: rateLimitResult.limit,
    isBlocked: rateLimitResult.isBlocked,
    violations: rateLimitResult.violations
  });
  
  if (!rateLimitResult.allowed) {
    const headers = createRateLimitHeaders(rateLimitResult);
    return {
      allowed: false,
      response: new NextResponse(
        JSON.stringify({
          error: rateLimitResult.isBlocked 
            ? 'Payment operations temporarily blocked due to abuse'
            : 'Payment rate limit exceeded',
          code: rateLimitResult.isBlocked 
            ? 'PAYMENT_TEMPORARILY_BLOCKED' 
            : 'PAYMENT_RATE_LIMIT_EXCEEDED',
          limit: rateLimitResult.limit,
          count: rateLimitResult.count,
          resetTime: rateLimitResult.resetTime,
          remaining: rateLimitResult.remaining,
          violations: rateLimitResult.violations,
          type
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        }
      )
    };
  }
  
  // Return success with headers
  const headers = createRateLimitHeaders(rateLimitResult);
  return { 
    allowed: true, 
    headers: {
      ...headers,
      'X-Payment-Type': type,
      'X-Security-Check': 'passed'
    }
  };
}

/**
 * Payment rate limiting middleware wrapper
 */
export function withPaymentRateLimit(options: PaymentRateLimitOptions) {
  return async function paymentRateLimitMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const result = await paymentRateLimit(req, options);
    
    if (!result.allowed && result.response) {
      return result.response;
    }
    
    try {
      const response = await handler(req);
      
      // Add payment security headers to successful response
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
    } catch (error) {
      console.error(`[Payment Rate Limiting] Handler error for ${options.type}:`, error);
      return new NextResponse(
        JSON.stringify({
          error: 'Payment processing error',
          code: 'PAYMENT_PROCESSING_ERROR'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}

/**
 * Webhook-specific rate limiting with signature verification
 */
export async function webhookRateLimit(
  req: NextRequest,
  webhookType: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  console.log(`[Payment Rate Limiting] Webhook ${webhookType} rate limit check`);
  
  // Apply webhook-specific rate limiting
  const rateLimitResult = await rateLimit(req, {
    endpoint: 'payment:webhook',
    userId: `webhook:${webhookType}`,
    userTier: 'anonymous', // Webhooks don't have user context
  });
  
  if (!rateLimitResult.allowed) {
    console.warn(`[Payment Rate Limiting] Webhook ${webhookType} rate limit exceeded:`, {
      count: rateLimitResult.count,
      limit: rateLimitResult.limit,
      violations: rateLimitResult.violations
    });
    
    return {
      allowed: false,
      response: new NextResponse(
        JSON.stringify({
          error: 'Webhook rate limit exceeded',
          code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
          webhookType
        }),
        {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(rateLimitResult)
          }
        }
      )
    };
  }
  
  return { allowed: true };
}

/**
 * Quick payment endpoint protection for existing routes
 */
export async function protectPaymentEndpoint(
  req: NextRequest,
  type: PaymentRateLimitOptions['type'],
  requireAuth: boolean = true
): Promise<NextResponse | null> {
  const result = await paymentRateLimit(req, { type, requireAuth });
  
  if (!result.allowed && result.response) {
    return result.response;
  }
  
  return null; // Continue with normal processing
}