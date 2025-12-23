/**
 * Rate Limiting Middleware for Next.js Edge Runtime
 * 
 * This middleware provides comprehensive rate limiting for the multi-character AI chat platform.
 * It runs on Vercel Edge Runtime for optimal performance and global distribution.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Edge-compatible rate limiting (no Redis in Edge Runtime)
// Uses Vercel Edge Config for dynamic limits and in-memory for tracking

// Character mapping for multi-domain support
const CHARACTER_MAP: Record<string, { key: string; displayName: string }> = {
  'chatwithlexi.com': { key: 'lexi', displayName: 'Lexi' },
  'talktonyx.com': { key: 'nyx', displayName: 'Nyx' },
  'chatwithchloe.com': { key: 'chloe', displayName: 'Chloe' },
  'waifuwithaiko.com': { key: 'aiko', displayName: 'Aiko' },
  'chatwithzaria.com': { key: 'zaria', displayName: 'Zaria' },
  'chatwithnova.com': { key: 'nova', displayName: 'Nova' },
  'sirdominic.com': { key: 'dom', displayName: 'Dominic' },
  'fuckboychase.com': { key: 'chase', displayName: 'Chase' },
  'chatwithethan.com': { key: 'ethan', displayName: 'Ethan' },
  'chatwithjayden.com': { key: 'jayden', displayName: 'Jayden' },
  'chatwithmiles.com': { key: 'miles', displayName: 'Miles' },
};

// In-memory rate limiting store (per Edge Runtime instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number; violations: number }>();

// Rate limit configurations optimized for Edge Runtime
interface EdgeRateLimitConfig {
  requests: number;
  windowSeconds: number;
  maxViolations: number;
  blockDurationSeconds: number;
}

const RATE_LIMITS: Record<string, EdgeRateLimitConfig> = {
  // API endpoints
  'api:chat': { requests: 100, windowSeconds: 3600, maxViolations: 5, blockDurationSeconds: 1800 },
  'api:voice': { requests: 50, windowSeconds: 3600, maxViolations: 3, blockDurationSeconds: 3600 },
  'api:admin': { requests: 50, windowSeconds: 3600, maxViolations: 2, blockDurationSeconds: 7200 },
  'api:payment': { requests: 10, windowSeconds: 600, maxViolations: 2, blockDurationSeconds: 3600 },
  
  // General API
  'api:general': { requests: 200, windowSeconds: 3600, maxViolations: 10, blockDurationSeconds: 900 },
  
  // Static assets (lenient)
  'static': { requests: 1000, windowSeconds: 3600, maxViolations: 20, blockDurationSeconds: 300 },
};

function getSimpleCharacterConfig(hostname: string) {
  // Try exact hostname match
  if (CHARACTER_MAP[hostname]) {
    return CHARACTER_MAP[hostname];
  }
  
  // Try without www prefix
  const withoutWww = hostname.replace(/^www\./, '');
  if (CHARACTER_MAP[withoutWww]) {
    return CHARACTER_MAP[withoutWww];
  }
  
  // Default fallback to Lexi
  return { key: 'lexi', displayName: 'Lexi' };
}

function getClientIdentifier(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             req.headers.get('x-real-ip') ||
             'unknown';

  // SECURITY FIX: Use IP-only hashing to prevent rate limit bypass via User-Agent changes
  // User-Agent can change between page loads due to browser updates, extensions,
  // incognito mode, etc. causing rate limit resets
  return Buffer.from(ip).toString('base64').slice(0, 16);
}

function getRateLimitCategory(pathname: string): string {
  if (pathname.startsWith('/api/admin/')) return 'api:admin';
  if (pathname.startsWith('/api/chat')) return 'api:chat';
  if (pathname.startsWith('/api/voice')) return 'api:voice';
  if (pathname.startsWith('/api/checkout') || pathname.startsWith('/api/webhook') || pathname.startsWith('/api/portal')) return 'api:payment';
  if (pathname.startsWith('/api/')) return 'api:general';
  if (pathname.startsWith('/_next/') || pathname.includes('.')) return 'static';
  
  return 'api:general';
}

async function checkRateLimit(
  clientId: string,
  category: string,
  config: EdgeRateLimitConfig
): Promise<{ allowed: boolean; count: number; limit: number; resetTime: number; violations: number }> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const resetTime = Math.ceil(now / windowMs) * windowMs;
  
  const key = `${clientId}:${category}:${Math.floor(now / windowMs)}`;
  const violationKey = `${clientId}:${category}:violations`;
  
  // Clean up expired entries
  for (const [storeKey, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(storeKey);
    }
  }
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { count: 0, resetTime, violations: 0 };
    rateLimitStore.set(key, entry);
  }
  
  // Get violations
  let violationEntry = rateLimitStore.get(violationKey);
  if (!violationEntry || now > violationEntry.resetTime) {
    violationEntry = { count: 0, resetTime: now + (config.blockDurationSeconds * 1000), violations: 0 };
    rateLimitStore.set(violationKey, violationEntry);
  }
  
  entry.count++;
  const allowed = entry.count <= config.requests && violationEntry.violations < config.maxViolations;
  
  // Track violations
  if (entry.count > config.requests) {
    violationEntry.violations++;
  }
  
  return {
    allowed,
    count: entry.count,
    limit: config.requests,
    resetTime,
    violations: violationEntry.violations,
  };
}

function createRateLimitResponse(result: { count: number; limit: number; resetTime: number; violations: number }): NextResponse {
  const body = {
    error: 'Rate limit exceeded',
    code: 'RATE_LIMIT_EXCEEDED',
    limit: result.limit,
    count: result.count,
    resetTime: result.resetTime,
    violations: result.violations,
  };
  
  return new NextResponse(JSON.stringify(body), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, result.limit - result.count).toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
      'X-RateLimit-Violations': result.violations.toString(),
      'Retry-After': '3600', // 1 hour
    },
  });
}

export async function rateLimitingMiddleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const hostname = req.headers.get('host') || '';
  
  // Skip rate limiting for health checks, webhooks, and chat endpoints
  // Chat endpoints have their own specialized rate limiting in the main system
  if (pathname === '/api/health' ||
      pathname === '/api/debug/ping' ||
      pathname.startsWith('/api/chat') ||
      pathname.startsWith('/api/rate-limit')) {
    return null; // Continue without rate limiting
  }
  
  // Get character config
  const config = getSimpleCharacterConfig(hostname);
  const clientId = getClientIdentifier(req);
  const category = getRateLimitCategory(pathname);
  const rateLimitConfig = RATE_LIMITS[category] || RATE_LIMITS['api:general'];
  
  console.log(`[Edge Rate Limiting] ${clientId} -> ${category} on ${pathname}`);
  
  try {
    const result = await checkRateLimit(clientId, category, rateLimitConfig);
    
    if (!result.allowed) {
      console.warn(`[Edge Rate Limiting] Blocked ${clientId} on ${category}:`, {
        count: result.count,
        limit: result.limit,
        violations: result.violations,
      });
      return createRateLimitResponse(result);
    }
    
    // Add rate limit headers to the request for downstream use
    const response = NextResponse.next();
    response.headers.set('x-ratelimit-limit', result.limit.toString());
    response.headers.set('x-ratelimit-remaining', Math.max(0, result.limit - result.count).toString());
    response.headers.set('x-ratelimit-reset', result.resetTime.toString());
    response.headers.set('x-character-key', config.key);
    response.headers.set('x-character-name', config.displayName);
    response.headers.set('x-hostname', hostname);
    
    return response;
    
  } catch (error) {
    console.error('[Edge Rate Limiting] Error:', error);
    // Continue without rate limiting on error
    return null;
  }
}

/**
 * Enhanced middleware with rate limiting and character routing
 */
export async function enhancedMiddleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const config = getSimpleCharacterConfig(hostname);
  
  // First check rate limits
  const rateLimitResponse = await rateLimitingMiddleware(req);
  if (rateLimitResponse && rateLimitResponse.status === 429) {
    return rateLimitResponse;
  }
  
  // Clone the request URL to modify search params while preserving existing ones
  const url = req.nextUrl.clone();
  url.searchParams.set('_character', config.key);
  
  // Create response for character routing
  const response = NextResponse.rewrite(url, { request: { headers: req.headers } });

  // Set character config as headers for server components to access
  response.headers.set('x-character-key', config.key);
  response.headers.set('x-character-name', config.displayName);
  response.headers.set('x-hostname', hostname);

  // Add rate limit headers if available
  if (rateLimitResponse) {
    const rateLimitHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'];
    rateLimitHeaders.forEach(header => {
      const value = rateLimitResponse.headers.get(header);
      if (value) {
        response.headers.set(header, value);
      }
    });
  }

  // CRITICAL: Add Supabase SSR auth handling
  try {
    // Create Supabase client for middleware (Edge Runtime compatible)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options, maxAge: 0 })
          },
        },
      }
    )

    // This is critical: refreshes the auth token and updates cookies
    // Must be called in middleware for SSR to work properly
    await supabase.auth.getUser()

  } catch (authError) {
    // Log auth errors but don't block the request
    console.error('Middleware auth error:', authError)
  }

  return response;
}