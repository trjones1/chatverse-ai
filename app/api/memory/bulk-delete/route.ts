// app/api/memory/bulk-delete/route.ts
// Bulk delete memories endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { memoryIds, deleteAll } = body;
    const userId = user.id;
    
    let deleteResult;
    
    if (deleteAll) {
      // Delete all memories for the user
      deleteResult = await supabase
        .from('episodic_memories')
        .delete()
        .eq('user_id', userId);
    } else if (memoryIds && Array.isArray(memoryIds) && memoryIds.length > 0) {
      // Delete specific memories
      deleteResult = await supabase
        .from('episodic_memories')
        .delete()
        .eq('user_id', userId)
        .in('id', memoryIds);
    } else {
      return NextResponse.json({ error: 'No memories specified for deletion' }, { status: 400 });
    }
    
    if (deleteResult.error) {
      console.error('Error bulk deleting memories:', deleteResult.error);
      return NextResponse.json({ error: 'Failed to delete memories' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: deleteAll ? 'All memories deleted successfully' : `${memoryIds?.length || 0} memories deleted successfully`,
      deletedCount: deleteAll ? 'all' : memoryIds?.length || 0
    });
    
  } catch (error) {
    console.error('Bulk delete memories API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}