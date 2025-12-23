/**
 * Comprehensive Rate Limiting System for Multi-Character AI Chat Platform
 * 
 * Features:
 * - Redis-based distributed rate limiting for production
 * - Vercel Edge Config for dynamic limit updates
 * - User-specific limits (anonymous vs authenticated vs paid)
 * - Character-specific limits for chat/voice
 * - Endpoint-specific protection (payments, admin)
 * - Graduated rate limiting with temporary blocks
 * - Rate limit headers for client awareness
 * - Multi-domain support for 11 character domains
 */

import Redis from 'ioredis';
import { get as getEdgeConfig } from '@vercel/edge-config';
import { NextRequest, NextResponse } from 'next/server';

// Redis client (lazy initialization for Vercel Edge compatibility)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (typeof window !== 'undefined') return null; // Client-side guard
  
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        // Optimized for Vercel serverless
        connectTimeout: 5000,
        commandTimeout: 5000,
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
      
      redis.on('error', (err) => {
        console.error('[Rate Limiting] Redis connection error:', err);
      });
    } catch (error) {
      console.error('[Rate Limiting] Failed to initialize Redis:', error);
      redis = null;
    }
  }
  
  return redis;
}

// In-memory fallback for development/Redis failures
const memoryStore = new Map<string, { count: number; resetTime: number; violations: number }>();

// Rate limit configurations
export interface RateLimitConfig {
  /** Maximum requests per window */
  requests: number;
  /** Time window in seconds */
  window: number;
  /** Skip factor for paid users (1 = no skip, 2 = double limits, etc.) */
  paidUserMultiplier?: number;
  /** Maximum violations before temporary block */
  maxViolations?: number;
  /** Temporary block duration in seconds */
  blockDuration?: number;
}

export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean;
  /** Current request count */
  count: number;
  /** Maximum requests allowed */
  limit: number;
  /** Time remaining until reset (seconds) */
  remaining: number;
  /** Timestamp when limit resets */
  resetTime: number;
  /** Whether user is temporarily blocked */
  isBlocked: boolean;
  /** Block reason if applicable */
  blockReason?: string;
  /** Violation count */
  violations: number;
}

// Default rate limit configurations
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  // Chat endpoints
  'chat:anonymous': { requests: 5, window: 86400, maxViolations: 3, blockDuration: 3600 }, // 5/day, 1hr block
  'chat:free': { requests: 10, window: 86400, maxViolations: 5, blockDuration: 1800 }, // 10/day, 30min block
  'chat:paid': { requests: 1000, window: 86400, maxViolations: 10, blockDuration: 300 }, // 1000/day, 5min block
  
  // Voice endpoints
  'voice:paid': { requests: 100, window: 3600, maxViolations: 5, blockDuration: 900 }, // 100/hour, 15min block
  
  // API endpoints (general)
  'api:anonymous': { requests: 100, window: 3600, maxViolations: 10, blockDuration: 1800 }, // 100/hour
  'api:authenticated': { requests: 1000, window: 3600, maxViolations: 15, blockDuration: 900 }, // 1000/hour
  
  // Payment endpoints (strict)
  'payment:checkout': { requests: 5, window: 300, maxViolations: 2, blockDuration: 3600 }, // 5/5min, 1hr block
  'payment:webhook': { requests: 100, window: 300, maxViolations: 3, blockDuration: 1800 }, // 100/5min
  
  // Admin endpoints (very strict)
  'admin:general': { requests: 100, window: 3600, maxViolations: 5, blockDuration: 7200 }, // 100/hour, 2hr block
  'admin:analytics': { requests: 50, window: 3600, maxViolations: 3, blockDuration: 3600 }, // 50/hour, 1hr block
  
  // Character-specific limits (per character)
  'character:selfie': { requests: 10, window: 3600, maxViolations: 3, blockDuration: 1800 }, // 10/hour per character
  'character:memory': { requests: 50, window: 3600, maxViolations: 5, blockDuration: 900 }, // 50/hour per character
};

/**
 * Get rate limit configuration from Edge Config with fallback to defaults
 */
async function getRateLimitConfig(key: string): Promise<RateLimitConfig> {
  try {
    // Try to get dynamic config from Vercel Edge Config
    const edgeConfig = await getEdgeConfig(`rateLimit:${key}`);
    if (edgeConfig && typeof edgeConfig === 'object') {
      return { ...DEFAULT_CONFIGS[key], ...edgeConfig } as RateLimitConfig;
    }
  } catch (error) {
    console.warn(`[Rate Limiting] Failed to get Edge Config for ${key}:`, error);
  }
  
  return DEFAULT_CONFIGS[key] || DEFAULT_CONFIGS['api:authenticated'];
}

/**
 * Generate rate limit key for Redis/memory store
 */
function generateRateLimitKey(
  identifier: string,
  endpoint: string,
  character?: string,
  window?: number
): string {
  const timestamp = window ? Math.floor(Date.now() / (window * 1000)) : '';
  const parts = ['rl', identifier, endpoint, character, timestamp].filter(Boolean);
  return parts.join(':');
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: NextRequest, userId?: string): string {
  if (userId && !userId.startsWith('anon_')) {
    return `user:${userId}`;
  }

  // SECURITY FIX: Use the provided anonymous userId directly if available
  // This ensures consistency with the authenticateRequest() function
  if (userId && userId.startsWith('anon_')) {
    return userId; // Use the userId as-is (it's already properly hashed and secured)
  }

  // Fallback for cases where no userId is provided
  // For anonymous users, use IP address only (more stable than IP + User-Agent)
  // User-Agent can change between page loads due to browser updates, extensions,
  // privacy features, incognito mode, etc. causing rate limit resets
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             req.headers.get('x-real-ip') ||
             'unknown';

  const hash = Buffer.from(ip).toString('base64').slice(0, 16);

  return `anon:${hash}`;
}

/**
 * Check if IP is in admin allowlist
 */
async function isAdminAllowlisted(req: NextRequest): Promise<boolean> {
  try {
    const allowlist = await getEdgeConfig('adminIpAllowlist') as string[] | null;
    if (!allowlist || !Array.isArray(allowlist)) return false;
    
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               req.headers.get('x-real-ip') ||
               'unknown';
    
    return allowlist.includes(ip || '');
  } catch (error) {
    console.warn('[Rate Limiting] Failed to check admin allowlist:', error);
    return false;
  }
}

/**
 * Core rate limiting logic with Redis + database + memory fallback
 */
async function rateLimitCheck(
  key: string,
  config: RateLimitConfig,
  readOnly: boolean = false,
  req?: NextRequest,
  clientId?: string,
  endpoint?: string,
  character?: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.window * 1000;
  const resetTime = Math.ceil((now + windowMs) / windowMs) * windowMs;

  console.log(`[Rate Limiting DEBUG] rateLimitCheck called:`, {
    key,
    readOnly,
    now,
    windowMs,
    resetTime,
    hasRedis: !!getRedis(),
    hasReq: !!req,
    clientId,
    endpoint,
    character
  });

  try {
    const redisClient = getRedis();

    if (redisClient) {
      console.log(`[Rate Limiting DEBUG] Using Redis for key: ${key}`);
      // Redis-based rate limiting (production)
      if (readOnly) {
        // Read-only mode: just get current values without incrementing
        const pipe = redisClient.pipeline();
        pipe.get(key);
        pipe.get(`${key}:violations`);
        pipe.get(`${key}:blocked`);

        const results = await pipe.exec();

        console.log(`[Rate Limiting DEBUG] Redis READ results for ${key}:`, {
          results,
          rawCount: results?.[0]?.[1],
          rawViolations: results?.[1]?.[1],
          rawBlocked: results?.[2]?.[1]
        });

        if (results && results.length >= 3) {
          const count = parseInt((results[0]?.[1] as string) || '0');
          const violations = parseInt((results[1]?.[1] as string) || '0');
          const isBlocked = !!(results[2]?.[1]);

          const allowed = !isBlocked && count < config.requests; // Note: < instead of <= for read-only

          console.log(`[Rate Limiting DEBUG] Redis READ parsed for ${key}:`, {
            count,
            violations,
            isBlocked,
            allowed,
            limit: config.requests
          });

          return {
            allowed,
            count,
            limit: config.requests,
            remaining: Math.max(0, resetTime - now) / 1000,
            resetTime,
            isBlocked,
            blockReason: isBlocked ? 'abuse_detected' : undefined,
            violations,
          };
        }
      } else {
        // Normal mode: increment counter and check violations
        const pipe = redisClient.pipeline();
        pipe.incr(key);
        pipe.expire(key, config.window);
        pipe.get(`${key}:violations`);
        pipe.get(`${key}:blocked`);

        const results = await pipe.exec();

        console.log(`[Rate Limiting DEBUG] Redis WRITE results for ${key}:`, {
          results,
          rawCount: results?.[0]?.[1],
          rawViolations: results?.[2]?.[1],
          rawBlocked: results?.[3]?.[1]
        });

        if (results && results.length >= 4) {
          const count = (results[0]?.[1] as number) || 0;
          const violations = parseInt((results[2]?.[1] as string) || '0');
          const isBlocked = !!(results[3]?.[1]);

          const allowed = !isBlocked && count <= config.requests;

          console.log(`[Rate Limiting DEBUG] Redis WRITE parsed for ${key}:`, {
            count,
            violations,
            isBlocked,
            allowed,
            limit: config.requests
          });

          // Only increment violations if limit was exceeded
          if (!allowed && !isBlocked) {
            const newViolations = violations + 1;
            await redisClient.incr(`${key}:violations`);
            await redisClient.expire(`${key}:violations`, config.blockDuration || 3600);

            // Block if too many violations
            if (config.maxViolations && newViolations > config.maxViolations) {
              await redisClient.setex(`${key}:blocked`, config.blockDuration || 3600, 'abuse');
            }
          }

          return {
            allowed,
            count,
            limit: config.requests,
            remaining: Math.max(0, resetTime - now) / 1000,
            resetTime,
            isBlocked,
            blockReason: isBlocked ? 'abuse_detected' : undefined,
            violations,
          };
        }
      }
    }
  } catch (error) {
    console.warn('[Rate Limiting] Redis operation failed, falling back to database:', error);
  }

  console.log(`[Rate Limiting DEBUG] Using DATABASE fallback for key: ${key}`, {
    hasReq: !!req,
    clientId: clientId || 'unknown',
    endpoint: endpoint || 'unknown',
    character: character || undefined
  });

  // Database-based fallback for serverless persistence
  if (req) {
    try {
      console.log(`[Rate Limiting DEBUG] Importing database module...`);
      const { dbRateLimitCheck } = await import('./rate-limiting-db');

      console.log(`[Rate Limiting DEBUG] Calling dbRateLimitCheck with:`, {
        key,
        clientId: clientId || 'unknown',
        endpoint: endpoint || 'unknown',
        character: character || undefined,
        limit: config.requests,
        window: config.window,
        readOnly
      });

      const result = await dbRateLimitCheck(
        req,
        key,
        clientId || 'unknown',
        endpoint || 'unknown',
        character || undefined,
        config.requests,
        config.window,
        readOnly
      );

      console.log(`[Rate Limiting DEBUG] Database result for ${key}:`, result);

      return {
        allowed: result.allowed,
        count: result.count,
        limit: config.requests,
        remaining: Math.max(0, result.resetTime - now) / 1000,
        resetTime: result.resetTime,
        isBlocked: result.isBlocked,
        blockReason: result.isBlocked ? 'abuse_detected' : undefined,
        violations: result.violations,
      };
    } catch (dbError) {
      console.error('[Rate Limiting] Database fallback failed, using memory (unreliable):', dbError);
    }
  } else {
    console.warn('[Rate Limiting] No request object available for database fallback');
  }

  console.log(`[Rate Limiting DEBUG] Using MEMORY fallback for key: ${key} (WARNING: unreliable in serverless)`);

  // Memory-based fallback (unreliable in serverless environments)
  let entry = memoryStore.get(key);

  console.log(`[Rate Limiting DEBUG] Memory entry for ${key}:`, {
    exists: !!entry,
    entry,
    now,
    expired: entry ? now > entry.resetTime : 'N/A'
  });

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime, violations: 0 };
    if (!readOnly) {
      memoryStore.set(key, entry);
      console.log(`[Rate Limiting DEBUG] Created new memory entry for ${key}:`, entry);
    }
  }

  if (!readOnly) {
    entry.count++;
    console.log(`[Rate Limiting DEBUG] Incremented memory count for ${key}:`, entry);
  }

  const allowed = readOnly ?
    entry.count < config.requests : // Read-only: check if next request would be allowed
    entry.count <= config.requests;  // Normal: check if current request is allowed
  const isBlocked = config.maxViolations && entry.violations > config.maxViolations;

  if (!readOnly && !allowed && !isBlocked) {
    entry.violations++;
  }

  return {
    allowed: allowed && !isBlocked,
    count: entry.count,
    limit: config.requests,
    remaining: Math.max(0, entry.resetTime - now) / 1000,
    resetTime: entry.resetTime,
    isBlocked: !!isBlocked,
    blockReason: isBlocked ? 'abuse_detected' : undefined,
    violations: entry.violations,
  };
}

/**
 * Main rate limiting function
 */
export async function rateLimit(
  req: NextRequest,
  options: {
    endpoint: string;
    userId?: string;
    character?: string;
    userTier?: 'anonymous' | 'free' | 'sfw' | 'nsfw';
    skipForAdmin?: boolean;
    readOnly?: boolean;
  }
): Promise<RateLimitResult> {
  const { endpoint, userId, character, userTier = 'anonymous', skipForAdmin = false, readOnly = false } = options;

  console.log(`[Rate Limiting ENTRY] Function called with:`, {
    endpoint, userId, character, userTier, skipForAdmin, readOnly
  });
  
  // Skip rate limiting for admin allowlisted IPs if requested
  if (skipForAdmin && await isAdminAllowlisted(req)) {
    return {
      allowed: true,
      count: 0,
      limit: Infinity,
      remaining: Infinity,
      resetTime: Date.now() + 86400000,
      isBlocked: false,
      violations: 0,
    };
  }
  
  // Determine rate limit configuration key
  let configKey = `${endpoint}:${userTier}`;
  if (endpoint.startsWith('admin:')) {
    configKey = endpoint;
  } else if (endpoint.startsWith('payment:')) {
    configKey = endpoint;
  } else if (['sfw', 'nsfw'].includes(userTier)) {
    configKey = `${endpoint}:paid`;
  }
  
  const config = await getRateLimitConfig(configKey);
  const clientId = getClientIdentifier(req, userId);
  const rateLimitKey = generateRateLimitKey(clientId, endpoint, character, config.window);

  console.log(`[Rate Limiting] Checking limits for ${clientId} on ${endpoint}${character ? ` (${character})` : ''}`, {
    rateLimitKey,
    configKey,
    config,
    window: config.window,
    readOnly,
    timestamp: Date.now()
  });

  console.log(`[Rate Limiting DEBUG] Main rateLimit function called with:`, {
    endpoint,
    userId,
    character,
    userTier,
    skipForAdmin,
    readOnly,
    clientId,
    rateLimitKey,
    configKey
  });

  const result = await rateLimitCheck(rateLimitKey, config, readOnly, req, clientId, endpoint, character);

  console.log(`[Rate Limiting] Result for ${clientId}:`, {
    rateLimitKey,
    allowed: result.allowed,
    count: result.count,
    limit: result.limit,
    readOnly,
    usingRedis: !!getRedis()
  });
  
  if (!result.allowed) {
    console.warn(`[Rate Limiting] Request blocked for ${clientId} on ${endpoint}:`, {
      count: result.count,
      limit: result.limit,
      isBlocked: result.isBlocked,
      violations: result.violations,
    });
  }
  
  return result;
}

/**
 * Create rate limit headers for client awareness
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.limit - result.count).toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
    'X-RateLimit-Violations': result.violations.toString(),
    ...(result.isBlocked && { 'X-RateLimit-Blocked': 'true' }),
  };
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = createRateLimitHeaders(result);
  
  const body = {
    error: result.isBlocked ? 'Temporarily blocked due to abuse' : 'Rate limit exceeded',
    code: result.isBlocked ? 'TEMPORARILY_BLOCKED' : 'RATE_LIMIT_EXCEEDED',
    limit: result.limit,
    count: result.count,
    resetTime: result.resetTime,
    remaining: result.remaining,
    violations: result.violations,
    ...(result.blockReason && { blockReason: result.blockReason }),
  };
  
  return new NextResponse(JSON.stringify(body), {
    status: result.isBlocked ? 429 : 429, // Both use 429 Too Many Requests
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Rate limiting middleware factory
 */
export function withRateLimit(
  endpoint: string,
  options: {
    getUserInfo?: (req: NextRequest) => Promise<{ userId?: string; userTier?: string; character?: string }>;
    skipForAdmin?: boolean;
  } = {}
) {
  return async function rateLimitMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Get user info if extractor provided
      let userId: string | undefined;
      let userTier: 'anonymous' | 'free' | 'sfw' | 'nsfw' = 'anonymous';
      let character: string | undefined;
      
      if (options.getUserInfo) {
        const userInfo = await options.getUserInfo(req);
        userId = userInfo.userId;
        userTier = (userInfo.userTier as any) || 'anonymous';
        character = userInfo.character;
      }
      
      // Check rate limits
      const result = await rateLimit(req, {
        endpoint,
        userId,
        character,
        userTier,
        skipForAdmin: options.skipForAdmin,
      });
      
      if (!result.allowed) {
        return createRateLimitResponse(result);
      }
      
      // Add rate limit headers to successful response
      const response = await handler(req);
      const headers = createRateLimitHeaders(result);
      
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    } catch (error) {
      console.error('[Rate Limiting] Middleware error:', error);
      // Continue without rate limiting if there's an error
      return handler(req);
    }
  };
}

/**
 * Cleanup memory store (for development)
 */
export function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}

// Periodic cleanup for memory store
if (typeof window === 'undefined') {
  setInterval(cleanupMemoryStore, 300000); // Every 5 minutes
}