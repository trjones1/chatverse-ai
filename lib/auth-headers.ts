/**
 * Consolidated Authentication Utility
 * 
 * This module provides a unified authentication pattern for all API routes,
 * replacing the three different patterns previously scattered across the codebase.
 * 
 * Key improvements:
 * - Consistent user authentication with fallback handling
 * - Unified anonymous user ID generation 
 * - Proper TypeScript interfaces
 * - Centralized error handling
 * - Support for both authenticated and anonymous users
 */

import { NextRequest } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { User } from '@supabase/supabase-js';

export interface AuthResult {
  /** Authenticated user if available, null for anonymous users */
  user: User | null;
  /** Unique user ID for both authenticated and anonymous users */
  userId: string;
  /** Source of user ID: 'authenticated' or 'anonymous' */
  userIdSource: 'authenticated' | 'anonymous';
  /** Whether this is an authenticated user with a valid session */
  isAuthenticated: boolean;
  /** Any authentication error that occurred */
  authError: Error | null;
}

export interface AuthOptions {
  /** Whether to require authentication (return 401 for anonymous users) */
  requireAuth?: boolean;
  /** Character key for anonymous ID generation */
  character?: string;
  /** Whether to include detailed debug logging */
  debug?: boolean;
}

/**
 * Unified authentication function for all API routes
 * 
 * @param req - NextRequest object
 * @param options - Authentication options
 * @returns AuthResult with user info and generated user ID
 */
export async function authenticateRequest(
  req: NextRequest, 
  options: AuthOptions = {}
): Promise<AuthResult> {
  const { requireAuth = false, character = 'lexi', debug = false } = options;
  const requestId = Math.random().toString(36).substr(2, 9);
  
  if (debug) {
    console.log(`🔐 [${requestId}] Starting unified authentication`, { requireAuth, character });
  }

  let user: User | null = null;
  let authError: Error | null = null;

  try {
    // Use the standard server-side Supabase client
    const supabase = await makeServerSupabase(req);
    
    // Primary authentication: try to get user from token
    try {
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
      authError = result.error as Error || null;
    } catch (error) {
      authError = error as Error;
      if (debug) {
        console.error(`🔐 [${requestId}] Error getting user from token:`, error);
      }
    }
    
    // Fallback authentication: try to get user from session
    if (!user && !authError) {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session?.user && !sessionError) {
          user = session.user;
          if (debug) {
            console.log(`🔐 [${requestId}] Retrieved user from session fallback`);
          }
        } else if (sessionError) {
          authError = sessionError as Error;
        }
      } catch (sessionError) {
        authError = sessionError as Error;
        if (debug) {
          console.error(`🔐 [${requestId}] Error getting session:`, sessionError);
        }
      }
    }

    if (debug) {
      console.log(`🔐 [${requestId}] Authentication result:`, {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        error: authError?.message || null
      });
    }

    // Generate consistent user ID for both authenticated and anonymous users
    let userId: string;
    let userIdSource: 'authenticated' | 'anonymous';
    
    if (user?.id) {
      // Authenticated user: use their UUID directly
      userId = user.id;
      userIdSource = 'authenticated';
    } else {
      // Anonymous user: Try to use frontend-provided ID first for consistency
      const frontendUserId = req.headers.get('x-user-id');

      if (frontendUserId && frontendUserId.startsWith('anon-')) {
        // Use the frontend-provided anonymous ID for consistent rate limiting
        userId = frontendUserId;
        userIdSource = 'anonymous';

        if (debug) {
          console.log(`🔐 [${requestId}] Using frontend-provided anonymous user ID:`, {
            userId,
            character,
            source: 'frontend'
          });
        }
      } else {
        // Fallback: Generate secure server-side ID only if frontend didn't provide one
        // STABILITY: Use only IP + character (no User-Agent which can vary between page loads)
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                   req.headers.get('x-real-ip') ||
                   'unknown';

        // Create anonymous ID based on ONLY IP and character for consistency
        const anonymousData = `${ip}_${character}`;
        userId = `anon_${Buffer.from(anonymousData).toString('base64').slice(0, 16)}`;
        userIdSource = 'anonymous';

        if (debug) {
          console.log(`🔐 [${requestId}] Generated server-side anonymous user ID (fallback):`, {
            userId,
            character,
            ip: ip.substring(0, 20) + '...',
            method: 'IP + character fallback'
          });
        }
      }
    }

    return {
      user,
      userId,
      userIdSource,
      isAuthenticated: !!user?.id,
      authError
    };

  } catch (error) {
    authError = error as Error;
    if (debug) {
      console.error(`🔐 [${requestId}] Unexpected authentication error:`, error);
    }

    // Even on error, provide a fallback anonymous ID (consistent with main logic)
    const frontendUserId = req.headers.get('x-user-id');
    let userId: string;

    if (frontendUserId && frontendUserId.startsWith('anon-')) {
      userId = frontendUserId;
    } else {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                 req.headers.get('x-real-ip') ||
                 'unknown';
      const anonymousData = `${ip}_${character}`;
      userId = `anon_${Buffer.from(anonymousData).toString('base64').slice(0, 16)}`;
    }

    return {
      user: null,
      userId,
      userIdSource: 'anonymous',
      isAuthenticated: false,
      authError
    };
  }
}

/**
 * Convenience function for getting user ID header value
 * This maintains compatibility if x-user-id headers are needed in the future
 * 
 * @param authResult - Result from authenticateRequest
 * @returns Object with headers that can be passed to external APIs
 */
export function getAuthHeaders(authResult: AuthResult): { 'x-user-id': string } {
  return {
    'x-user-id': authResult.userId
  };
}

/**
 * TypeScript type guard to check if user is authenticated
 */
export function isAuthenticatedUser(authResult: AuthResult): authResult is AuthResult & { user: User } {
  return authResult.isAuthenticated && !!authResult.user;
}

/**
 * Get default free tier entitlements for anonymous users
 * This provides consistent fallback behavior across APIs
 */
export function getAnonymousUserEntitlements(character: string) {
  return {
    tier: 'free',
    can_chat: true,
    can_use_nsfw: false,
    can_use_voice: true, // Allow voice for the special sample message
    can_buy_credits: false,
    daily_chat_count: 0,
    daily_chat_limit: 5,
    voice_credits: 1, // Give 1 voice credit for the sample
    character,
    status: 'active'
  };
}

/**
 * Common response for authentication required errors
 */
export function createAuthRequiredResponse() {
  return new Response(
    JSON.stringify({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }), 
    { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Common response for insufficient permissions
 */
export function createInsufficientPermissionsResponse(requiredTier: string = 'sfw') {
  return new Response(
    JSON.stringify({ 
      error: 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      requiresTier: requiredTier 
    }), 
    { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}