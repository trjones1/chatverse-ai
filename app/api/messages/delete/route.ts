import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest } from '@/lib/auth-headers';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const { messageId, character } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Use unified authentication - supports both authenticated and anonymous users
    const authResult = await authenticateRequest(request, { character: character || 'lexi', debug: true });
    const { userId, isAuthenticated } = authResult;
    
    if (!userId || !isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Delete the specific message, ensuring it belongs to the authenticated user
    const { error: deleteError } = await admin
      .from('interaction_log')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId)
      .eq('character_key', character || 'lexi');

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}