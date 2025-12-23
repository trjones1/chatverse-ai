// app/api/content/library/route.ts
// Content Library API - View completed generated content

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { makeServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

interface ContentLibraryParams {
  character_key?: string;
  content_type?: string;
  tags?: string[];
  mood?: string;
  is_nsfw?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'quality_score' | 'usage_count';
  sort_order?: 'asc' | 'desc';
}

// Get content library items
export async function GET(req: NextRequest) {
  try {
    // Check admin environment flag
    if (!process.env.ENABLE_ADMIN_TOOLS) {
      return NextResponse.json({ error: 'Content library access not enabled' }, { status: 403 });
    }

    // Verify admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const url = new URL(req.url);
    const character_key = url.searchParams.get('character_key');
    const content_type = url.searchParams.get('content_type');
    const mood = url.searchParams.get('mood');
    const is_nsfw = url.searchParams.get('is_nsfw') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sort_by = (url.searchParams.get('sort_by') || 'created_at') as 'created_at' | 'quality_score' | 'usage_count';
    const sort_order = (url.searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);

    const admin = getSupabaseAdmin();
    
    let query = admin
      .from('content_library')
      .select(`
        id,
        character_key,
        content_type,
        title,
        file_url,
        thumbnail_url,
        metadata,
        tags,
        mood,
        aesthetic,
        is_nsfw,
        quality_score,
        usage_count,
        last_used_at,
        status,
        created_at,
        updated_at
      `)
      .in('status', ['active', 'waiting_for_approval', 'approved'])
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (character_key) {
      query = query.eq('character_key', character_key);
    }
    
    if (content_type) {
      query = query.eq('content_type', content_type);
    }
    
    if (mood) {
      query = query.eq('mood', mood);
    }
    
    if (typeof is_nsfw === 'boolean') {
      query = query.eq('is_nsfw', is_nsfw);
    }
    
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    const { data: libraryItems, error } = await query;

    if (error) {
      console.error('Failed to fetch content library:', error);
      return NextResponse.json({ error: 'Failed to fetch content library' }, { status: 500 });
    }

    // Get summary statistics
    const { data: stats } = await admin
      .from('content_library')
      .select('character_key, content_type, is_nsfw, quality_score')
      .in('status', ['active', 'waiting_for_approval', 'approved']);

    const statistics = {
      total_items: stats?.length || 0,
      by_character: stats?.reduce((acc: Record<string, number>, item) => {
        acc[item.character_key] = (acc[item.character_key] || 0) + 1;
        return acc;
      }, {}) || {},
      by_content_type: stats?.reduce((acc: Record<string, number>, item) => {
        acc[item.content_type] = (acc[item.content_type] || 0) + 1;
        return acc;
      }, {}) || {},
      nsfw_count: stats?.filter(item => item.is_nsfw).length || 0,
      average_quality: stats?.length ? 
        stats.reduce((sum, item) => sum + (item.quality_score || 0), 0) / stats.length : 0
    };

    return NextResponse.json({
      success: true,
      library_items: libraryItems,
      statistics,
      pagination: {
        limit,
        offset,
        has_more: libraryItems?.length === limit
      }
    });

  } catch (error) {
    console.error('Content library error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update content library item (quality score, tags, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const body = await req.json();
    const { id, quality_score, tags, mood, aesthetic, title } = body;

    if (!id) {
      return NextResponse.json({ error: 'Content ID required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const updateData: any = {};

    if (quality_score !== undefined) updateData.quality_score = quality_score;
    if (tags !== undefined) updateData.tags = tags;
    if (mood !== undefined) updateData.mood = mood;
    if (aesthetic !== undefined) updateData.aesthetic = aesthetic;
    if (title !== undefined) updateData.title = title;

    const { data, error } = await admin
      .from('content_library')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated_item: data
    });

  } catch (error) {
    console.error('Content update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete/archive content library item
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Content ID required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    
    // Soft delete - set status to 'archived'
    const { data, error } = await admin
      .from('content_library')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to archive content' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      archived_item: data
    });

  } catch (error) {
    console.error('Content deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}