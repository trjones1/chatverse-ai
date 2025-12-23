// app/api/memory/stats/route.ts
// Client-safe memory statistics API for dashboard

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    const characterKey = req.nextUrl.searchParams.get('character') || 'lexi';
    
    // Get current counts for display
    const [episodesRes, factsRes, interactionsRes, recentMemoriesRes] = await Promise.all([
      supabase.from('episodic_memories').select('id', { count: 'exact' }).eq('user_id', userId).eq('character_key', characterKey),
      supabase.from('user_facts').select('id', { count: 'exact' }).eq('user_id', userId).eq('character_key', characterKey),
      supabase.from('interaction_log').select('id', { count: 'exact' }).eq('user_id', userId).eq('character_key', characterKey),
      supabase
        .from('episodic_memories')
        .select('id, content, created_at, title, memory_type, summary, topics')
        .eq('user_id', userId)
        .eq('character_key', characterKey)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);
    
    const currentConversations = Math.floor((interactionsRes.count || 0) / 2);
    
    // Get or update achievement milestones using admin client
    const adminSupabase = getSupabaseAdmin();

    let achievementData = null;

    try {
      // Try to update achievement milestones with current counts
      await adminSupabase.rpc('update_achievement_milestones', {
        p_user_id: userId,
        p_character_key: characterKey,
        p_conversation_count: currentConversations,
        p_memory_count: episodesRes.count || 0,
        p_fact_count: factsRes.count || 0
      });
    } catch (updateError) {
      console.log('⚠️  Achievement milestone update failed (non-critical):', updateError);
    }

    try {
      // Get achievement status
      const { data, error: achievementError } = await adminSupabase.rpc('get_achievement_status', {
        p_user_id: userId,
        p_character_key: characterKey
      });

      if (!achievementError) {
        achievementData = data;
      }
    } catch (statusError) {
      console.log('⚠️  Achievement status fetch failed (non-critical):', statusError);
    }
    
    const memoryStats = {
      episodes: episodesRes.count || 0,
      facts: factsRes.count || 0,
      conversations: currentConversations,
      // Use the highest achieved conversation count for milestone display
      achievementConversations: achievementData?.max_conversations_reached || currentConversations,
      achievements: achievementData?.achievements || {}
    };
    
    const memories = recentMemoriesRes.data || [];
    
    // Debug logging
    console.log('🔍 MEMORY STATS DEBUG:', {
      userId,
      characterKey,
      episodeCount: episodesRes.count,
      recentMemoriesCount: memories.length,
      memoriesData: memories.map(m => ({
        id: m.id,
        hasContent: !!m.content,
        hasTitle: !!m.title,
        created_at: m.created_at
      }))
    });
    
    // Try to get basic emotional state from user metadata
    const userMetadata = user.user_metadata || {};
    const emotions = {
      affection: userMetadata.affection || 50,
      trust: userMetadata.trust || 40,
      playfulness: userMetadata.playfulness || 60,
      streak_days: userMetadata.streak_days || 1,
      clinginess: userMetadata.clinginess || 30
    };
    
    return NextResponse.json({
      success: true,
      memoryStats,
      emotions,
      memories
    });
    
  } catch (error) {
    console.error('Memory stats API error:', error);
    
    // Return default values if there's an error
    return NextResponse.json({
      success: true,
      memoryStats: { episodes: 0, facts: 0, conversations: 0 },
      emotions: { affection: 50, trust: 40, playfulness: 60, streak_days: 1, clinginess: 30 }
    });
  }
}