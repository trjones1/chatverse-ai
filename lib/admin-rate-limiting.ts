/**
 * Admin-specific rate limiting with IP allowlisting
 * 
 * Provides enhanced protection for admin endpoints with:
 * - Strict rate limits
 * - IP allowlisting capability
 * - User role verification
 * - Extended blocking for violations
 */

import { NextRequest, NextResponse } from 'next/server';
import { get as getEdgeConfig } from '@vercel/edge-config';
import { rateLimit, createRateLimitHeaders } from './rate-limiting';
import { authenticateRequest } from './auth-headers';
import { getSupabaseAdmin } from './supabaseAdmin';

interface AdminRateLimitOptions {
  /** Admin endpoint category (analytics, cleanup, etc.) */
  category: 'analytics' | 'cleanup' | 'user-management' | 'general';
  /** Whether to require specific admin role */
  requireRole?: string;
  /** Whether to bypass for allowlisted IPs */
  allowIpBypass?: boolean;
}

/**
 * Check if Edge Config is available
 */
function isEdgeConfigAvailable(): boolean {
  return Boolean(process.env.EDGE_CONFIG);
}

/**
 * Check if IP is in admin allowlist via Edge Config
 */
async function isAdminAllowlisted(req: NextRequest): Promise<boolean> {
  // Check if Edge Config is available
  if (!isEdgeConfigAvailable()) {
    console.debug('[Admin Rate Limiting] Edge Config not configured - IP allowlist disabled');
    return false;
  }

  try {
    const allowlist = await getEdgeConfig('adminIpAllowlist') as string[] | null;
    if (!allowlist || !Array.isArray(allowlist)) {
      console.debug('[Admin Rate Limiting] No admin IP allowlist configured in Edge Config');
      return false;
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               req.headers.get('x-real-ip') ||
               'unknown';

    const isAllowed = allowlist.includes(ip);

    console.log('[Admin Rate Limiting] IP allowlist check:', {
      ip: ip.substring(0, 12) + '...',
      isAllowed,
      allowlistSize: allowlist.length
    });

    return isAllowed;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn('[Admin Rate Limiting] Failed to check admin allowlist - Edge Config may not be available:', errorMsg);
    return false;
  }
}

/**
 * Check if user has required admin role
 */
async function hasAdminRole(userId: string, requiredRole?: string): Promise<boolean> {
  if (!requiredRole) return true; // No specific role required
  
  try {
    const admin = getSupabaseAdmin();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('role, admin_permissions')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      console.warn('[Admin Rate Limiting] Failed to get user profile:', error);
      return false;
    }
    
    // Check if user has required role or is super admin
    const hasRole = profile.role === requiredRole || 
                   profile.role === 'super_admin' ||
                   profile.admin_permissions?.includes(requiredRole);
    
    console.log('[Admin Rate Limiting] Role check:', {
      userId: userId.substring(0, 8) + '...',
      userRole: profile.role,
      requiredRole,
      hasRole
    });
    
    return hasRole;
  } catch (error) {
    console.error('[Admin Rate Limiting] Error checking admin role:', error);
    return false;
  }
}

/**
 * Admin-specific rate limiting middleware
 */
export async function adminRateLimit(
  req: NextRequest,
  options: AdminRateLimitOptions
): Promise<{ allowed: boolean; response?: NextResponse; headers?: Record<string, string> }> {
  const { category, requireRole, allowIpBypass = true } = options;
  
  console.log(`[Admin Rate Limiting] Checking ${category} endpoint for admin access`);

  // Check IP allowlist first if enabled
  if (allowIpBypass) {
    if (!isEdgeConfigAvailable()) {
      console.debug('[Admin Rate Limiting] IP allowlist bypass disabled - Edge Config not configured');
    } else if (await isAdminAllowlisted(req)) {
      console.log('[Admin Rate Limiting] Request allowed via IP allowlist');
      return {
        allowed: true,
        headers: { 'X-Admin-Bypass': 'ip-allowlist' }
      };
    }
  }
  
  // Authenticate the request
  const authResult = await authenticateRequest(req, { requireAuth: true });
  
  if (!authResult.isAuthenticated || !authResult.user) {
    console.warn('[Admin Rate Limiting] Unauthorized admin request');
    return {
      allowed: false,
      response: new NextResponse(
        JSON.stringify({
          error: 'Admin authentication required',
          code: 'ADMIN_AUTH_REQUIRED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    };
  }
  
  // Check admin role if required
  if (requireRole && !await hasAdminRole(authResult.user.id, requireRole)) {
    console.warn(`[Admin Rate Limiting] Insufficient permissions for ${category}:`, {
      userId: authResult.user.id.substring(0, 8) + '...',
      requiredRole: requireRole
    });
    return {
      allowed: false,
      response: new NextResponse(
        JSON.stringify({
          error: 'Insufficient admin permissions',
          code: 'ADMIN_INSUFFICIENT_PERMISSIONS',
          requiredRole: requireRole
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    };
  }
  
  // Apply admin-specific rate limiting
  const endpoint = `admin:${category}`;
  const rateLimitResult = await rateLimit(req, {
    endpoint,
    userId: authResult.user.id,
    userTier: 'sfw', // Admin users treated as paid tier for limits
    skipForAdmin: false // Always apply limits for admins (no bypass)
  });
  
  console.log(`[Admin Rate Limiting] ${category} rate limit check:`, {
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
          error: rateLimitResult.isBlocked ? 'Admin temporarily blocked due to abuse' : 'Admin rate limit exceeded',
          code: rateLimitResult.isBlocked ? 'ADMIN_TEMPORARILY_BLOCKED' : 'ADMIN_RATE_LIMIT_EXCEEDED',
          limit: rateLimitResult.limit,
          count: rateLimitResult.count,
          resetTime: rateLimitResult.resetTime,
          remaining: rateLimitResult.remaining,
          violations: rateLimitResult.violations,
          category
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
  
  // Return success with rate limit headers
  const headers = createRateLimitHeaders(rateLimitResult);
  return { 
    allowed: true, 
    headers: {
      ...headers,
      'X-Admin-Category': category
    }
  };
}

/**
 * Admin rate limiting middleware wrapper
 */
export function withAdminRateLimit(options: AdminRateLimitOptions) {
  return async function adminRateLimitMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const result = await adminRateLimit(req, options);
    
    if (!result.allowed && result.response) {
      return result.response;
    }
    
    try {
      const response = await handler(req);
      
      // Add admin rate limit headers to successful response
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
    } catch (error) {
      console.error(`[Admin Rate Limiting] Handler error for ${options.category}:`, error);
      return new NextResponse(
        JSON.stringify({
          error: 'Internal admin error',
          code: 'ADMIN_INTERNAL_ERROR'
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
 * Quick admin endpoint protection for existing routes
 */
export async function protectAdminEndpoint(
  req: NextRequest,
  category: AdminRateLimitOptions['category'],
  requireRole?: string
): Promise<NextResponse | null> {
  const result = await adminRateLimit(req, { category, requireRole });
  
  if (!result.allowed && result.response) {
    return result.response;
  }
  
  return null; // Continue with normal processing
}