// app/api/memory/[id]/route.ts
// Delete specific memory endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const memoryId = params.id;
    const userId = user.id;
    
    // Delete the memory, ensuring it belongs to the authenticated user
    const { error: deleteError } = await supabase
      .from('episodic_memories')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Error deleting memory:', deleteError);
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete memory API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}