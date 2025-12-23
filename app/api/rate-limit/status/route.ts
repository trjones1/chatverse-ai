import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-headers';
import { rateLimit, createRateLimitHeaders } from '@/lib/rate-limiting';
import { getCharacterConfig } from '@/lib/characters.config';

/**
 * Rate Limit Status API
 *
 * Returns the current rate limit status for a user without incrementing the count.
 * This allows the frontend to display accurate remaining message counts.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Determine character based on hostname
    const host = req.headers.get('host') || 'chatwithlexi.com';
    const config = getCharacterConfig(host);
    const character = config.key;

    // Use standardized authentication
    const authResult = await authenticateRequest(req, {
      character,
      debug: true
    });

    const { user, userId: resolvedUserId, userIdSource, isAuthenticated } = authResult;

    // Get user tier for rate limiting
    const userTier = isAuthenticated
      ? (user?.user_metadata?.subscription_tier || 'free')
      : 'anonymous';

    // Check current rate limit status WITHOUT incrementing count
    const rateLimitResult = await rateLimit(req, {
      endpoint: 'chat', // Use the same endpoint as the actual chat API
      userId: resolvedUserId,
      character,
      userTier: userTier as 'anonymous' | 'free' | 'sfw' | 'nsfw',
      readOnly: true // Don't increment counters
    });

    // Use the remaining value from rate limit result (it's already calculated correctly)
    const remaining = Math.max(0, rateLimitResult.limit - rateLimitResult.count);

    console.log('📊 RATE LIMIT STATUS - Retrieved status:', {
      userId: resolvedUserId,
      userIdSource,
      character,
      userTier,
      count: rateLimitResult.count,
      limit: rateLimitResult.limit,
      remaining,
      isBlocked: rateLimitResult.isBlocked,
      timestamp: new Date().toISOString()
    });

    // Add rate limit headers
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    return NextResponse.json({
      remaining,
      limit: rateLimitResult.limit,
      count: rateLimitResult.count,
      resetTime: rateLimitResult.resetTime,
      isBlocked: rateLimitResult.isBlocked,
      blockReason: rateLimitResult.blockReason,
      violations: rateLimitResult.violations,
      userTier,
      character
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...rateLimitHeaders
      }
    });

  } catch (error) {
    console.error('❌ RATE LIMIT STATUS - Error retrieving status:', error);

    return NextResponse.json({
      error: 'Failed to retrieve rate limit status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}