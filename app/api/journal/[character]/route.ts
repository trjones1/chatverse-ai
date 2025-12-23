// app/api/journal/[character]/route.ts
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { requireAdmin } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ character: string }> }
) {
  try {
    const supabase = await createClient();
    const { character } = await context.params;

    // Validate character parameter
    if (!character || typeof character !== 'string') {
      return NextResponse.json(
        { error: 'Invalid character parameter' },
        { status: 400 }
      );
    }

    // Get published journal posts for this character
    const { data: posts, error } = await supabase
      .from('character_journal_posts')
      .select('*')
      .eq('character_key', character.toLowerCase())
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(20); // Limit to most recent 20 posts

    if (error) {
      console.error('Error fetching journal posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch journal posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts: posts || [] });
  } catch (error) {
    console.error('Journal API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ character: string }> }
) {
  try {
    const { character } = await context.params;
    const body = await request.json();
    
    // Require admin authentication
    const supabase = await makeServerSupabase(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    // Validate character parameter
    if (!character || typeof character !== 'string') {
      return NextResponse.json(
        { error: 'Invalid character parameter' },
        { status: 400 }
      );
    }

    const { title, content, mood, tags, image_url, published = true } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Create journal post
    const { data: post, error } = await admin
      .from('character_journal_posts')
      .insert({
        character_key: character.toLowerCase(),
        title,
        content,
        mood,
        tags: tags || [],
        image_url,
        published
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating journal post:', error);
      return NextResponse.json(
        { error: 'Failed to create journal post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Journal post created successfully',
      post 
    });
  } catch (error) {
    console.error('Journal POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}