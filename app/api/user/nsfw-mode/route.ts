// app/api/user/nsfw-mode/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';
import { makeServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest): Promise<NextResponse | Response> {
  try {
    console.log('🔍 NSFW API: Request received');
    
    // Use unified authentication pattern
    const authResult = await authenticateRequest(req, { requireAuth: true });
    const { user, userId, isAuthenticated } = authResult;
    
    console.log('🔍 NSFW API: Auth check:', {
      hasUser: !!user,
      userId: userId,
      isAuthenticated: isAuthenticated
    });
    
    if (!isAuthenticated || !user) {
      console.error('🔍 NSFW API: Authentication required');
      return createAuthRequiredResponse();
    }

    const body = await req.json();
    const { nsfwMode } = body;
    
    if (typeof nsfwMode !== 'boolean') {
      return NextResponse.json({ error: 'nsfwMode must be a boolean' }, { status: 400 });
    }

    console.log('🔍 NSFW API: Updating user metadata:', {
      userId: user.id,
      nsfwMode,
      userEmail: user.email
    });

    // Update user metadata - need to create authenticated supabase client for user updates
    const supabase = await makeServerSupabase(req);
    const { data, error } = await supabase.auth.updateUser({
      data: { nsfwMode }
    });

    console.log('🔍 NSFW API: Update result:', {
      success: !!data && !error,
      error: error?.message,
      hasUser: !!data?.user,
      savedMetadata: data?.user?.user_metadata,
      savedNsfwMode: data?.user?.user_metadata?.nsfwMode,
      updateMethod: 'makeServerSupabase + updateUser'
    });

    if (error) {
      console.error('🔍 NSFW API: Error updating user metadata:', error);
      return NextResponse.json({ 
        error: 'Failed to update NSFW mode',
        details: error.message 
      }, { status: 500 });
    }

    console.log('🔍 NSFW API: Successfully updated NSFW mode');
    return NextResponse.json({ 
      success: true, 
      nsfwMode,
      user: data.user 
    });

  } catch (error) {
    console.error('🔍 NSFW API: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}