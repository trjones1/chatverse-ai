// app/api/debug/user-metadata/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-headers';
import { makeServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Test both auth methods to compare
    
    // Method 1: authenticateRequest (used by chat API)
    const authResult = await authenticateRequest(req, { requireAuth: true });
    const { user: authUser, isAuthenticated } = authResult;
    
    // Method 2: makeServerSupabase (used by NSFW API)
    const supabase = await makeServerSupabase(req);
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
    
    return NextResponse.json({
      authenticated: isAuthenticated,
      authUser: {
        id: authUser?.id,
        email: authUser?.email,
        user_metadata: authUser?.user_metadata,
        nsfwMode: authUser?.user_metadata?.nsfwMode,
      },
      supabaseUser: {
        id: supabaseUser?.id,
        email: supabaseUser?.email,
        user_metadata: supabaseUser?.user_metadata,
        nsfwMode: supabaseUser?.user_metadata?.nsfwMode,
      },
      metadataMatch: authUser?.user_metadata?.nsfwMode === supabaseUser?.user_metadata?.nsfwMode,
      error: error?.message
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}