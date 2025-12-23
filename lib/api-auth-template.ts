/**
 * STANDARDIZED API ROUTE AUTHENTICATION TEMPLATE
 * 
 * This template demonstrates the consistent authentication pattern
 * that ALL API routes should follow for 100% SSR compliance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, AuthErrors } from '@/lib/auth-server-utils';

// EXAMPLE 1: API route that supports both authenticated and anonymous users
export async function GET_TEMPLATE_MIXED(request: NextRequest) {
  try {
    // Get consistent auth context
    const { user, userId, isAuthenticated, userIdSource } = await getAuthContext(request);
    
    // Handle case where neither authenticated user nor anonymous ID exists
    if (!userId) {
      return NextResponse.json(AuthErrors.MISSING_USER_ID, { status: 400 });
    }
    
    // Your API logic here - works for both authenticated and anonymous
    const responseData = {
      userId,
      isAuthenticated,
      userIdSource,
      // ... your response data
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// EXAMPLE 2: API route that REQUIRES authentication
export async function POST_TEMPLATE_AUTHENTICATED_ONLY(request: NextRequest) {
  try {
    // Get auth context
    const { user, userId, isAuthenticated } = await getAuthContext(request);
    
    // Require authentication for this endpoint
    if (!isAuthenticated || !user) {
      return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: 401 });
    }
    
    // Your authenticated API logic here
    const responseData = {
      userId: user.id,
      // ... your response data
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// EXAMPLE 3: Admin-only API route
export async function DELETE_TEMPLATE_ADMIN_ONLY(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await getAuthContext(request);
    
    // Require authentication
    if (!isAuthenticated || !user) {
      return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: 401 });
    }
    
    // Check admin privileges
    const { isUserAdmin } = await import('@/lib/auth-server-utils');
    const isAdmin = await isUserAdmin(user.id);
    
    if (!isAdmin) {
      return NextResponse.json(AuthErrors.FORBIDDEN, { status: 403 });
    }
    
    // Your admin API logic here
    const responseData = {
      message: 'Admin operation completed',
      adminUserId: user.id
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * MIGRATION CHECKLIST FOR EXISTING API ROUTES:
 * 
 * 1. Replace inconsistent auth patterns with getAuthContext(request)
 * 2. Remove direct createClient() calls in favor of auth utilities
 * 3. Use getAdminClient() only for true admin operations
 * 4. Handle anonymous users gracefully (no 401 for valid anonymous requests)
 * 5. Use consistent error responses from AuthErrors
 * 6. Maintain backward compatibility with existing functionality
 * 7. Test both authenticated and anonymous user flows
 * 8. Update any custom user ID resolution to use resolveUserId()
 */