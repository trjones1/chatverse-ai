import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

/**
 * Standard server-side user retrieval from Supabase
 * Returns null for anonymous users without throwing errors
 */
export async function getUserFromServerClient(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error:', error.message);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Server client auth error:', error);
    return null;
  }
}

/**
 * Validate that user is authenticated - for protected routes
 * Throws error with proper status code if not authenticated
 */
export async function validateAuthenticatedUser(): Promise<User> {
  const user = await getUserFromServerClient();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Get user ID from various sources with fallback chain
 * Supports both authenticated users and anonymous session IDs
 */
export async function resolveUserId(request: NextRequest): Promise<{
  userId: string | null;
  userIdSource: 'authenticated' | 'anonymous';
  isAuthenticated: boolean;
}> {
  // First try to get authenticated user
  const user = await getUserFromServerClient();
  
  if (user?.id) {
    return {
      userId: user.id,
      userIdSource: 'authenticated',
      isAuthenticated: true
    };
  }
  
  // Fallback to anonymous session ID from headers
  const anonymousId = request.headers.get('x-user-id');
  
  if (anonymousId) {
    return {
      userId: anonymousId,
      userIdSource: 'anonymous',
      isAuthenticated: false
    };
  }
  
  return {
    userId: null,
    userIdSource: 'anonymous',
    isAuthenticated: false
  };
}

/**
 * Standard admin client access - only for true admin operations
 * Use sparingly - most operations should use user-scoped client
 */
export function getAdminClient() {
  return getSupabaseAdmin();
}

/**
 * Create consistent auth response for API routes
 */
export interface AuthResponse {
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
  userIdSource: 'authenticated' | 'anonymous';
}

export async function getAuthContext(request: NextRequest): Promise<AuthResponse> {
  const user = await getUserFromServerClient();
  const { userId, userIdSource, isAuthenticated } = await resolveUserId(request);
  
  return {
    user,
    userId,
    isAuthenticated,
    userIdSource
  };
}

/**
 * Check if user has admin privileges
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const admin = getAdminClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Admin check error:', error);
      return false;
    }
    
    return profile?.is_admin === true;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

/**
 * Consistent error responses for auth failures
 */
export const AuthErrors = {
  UNAUTHORIZED: { error: 'Authentication required', status: 401 },
  FORBIDDEN: { error: 'Insufficient permissions', status: 403 },
  INVALID_SESSION: { error: 'Invalid or expired session', status: 401 },
  MISSING_USER_ID: { error: 'User ID required', status: 400 }
} as const;