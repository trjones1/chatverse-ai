// app/api/admin/reset-my-limit/route.ts
/**
 * Admin endpoint to manually reset your own rate limit for testing
 * Usage: Just visit this URL while logged in
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resetRateLimitForUser } from '@/lib/rate-limiting-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.email === 'tramel.jones@gmail.com' ||
                    user.email === 'hello@chatverse.ai' ||
                    user.email === 'nyx@chatverse.ai';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Reset rate limit for this user
    const success = await resetRateLimitForUser(user.id, 'chat');

    if (success) {
      return NextResponse.json({
        success: true,
        message: `✅ Rate limit reset for ${user.email}! You now have 3 free messages.`,
        userId: user.id,
        email: user.email
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to reset rate limit'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Admin] Error resetting rate limit:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
