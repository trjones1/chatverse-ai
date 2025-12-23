import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';

export async function DELETE(req: NextRequest) {
  // Use unified authentication pattern
  const authResult = await authenticateRequest(req, { requireAuth: true });
  const { user, userId, isAuthenticated } = authResult;

  if (!isAuthenticated || !user) {
    return createAuthRequiredResponse();
  }

  console.log('Clear messages: Authenticated user', { userId: user.id, email: user.email });

  // Use admin client for database operations  
  const supabase = getSupabaseAdmin();

  try {
    // Delete from interaction_log table (where chat messages are actually stored)
    const { error: delErr, count } = await supabase
      .from('interaction_log')
      .delete({ count: 'exact' })
      .eq('user_id', user.id);

    if (delErr) {
      console.error('Clear messages: Database error', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    console.log('Clear messages: Successfully deleted', { count, userId: user.id });
    return NextResponse.json({ ok: true, deletedCount: count });
  } catch (error) {
    console.error('Clear messages: Unexpected error', error);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
