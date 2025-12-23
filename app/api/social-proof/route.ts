import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface SocialProofData {
  totalSessions: number;
  messagesLast24h: number;
  activeConversations: number;
  characterStats: Array<{
    character: string;
    activeUsers: number;
    recentMessages: number;
  }>;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Date ranges to match analytics dashboard logic
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    // Get ALL anonymous messages (like analytics dashboard)
    const { data: allAnonMessages } = await supabase
      .from('anonymous_interactions')
      .select('id, anonymous_id, character_key, created_at')
      .order('created_at', { ascending: false });

    // Get ALL authenticated messages
    const { data: allAuthMessages } = await supabase
      .from('interaction_log')
      .select('id, user_id, character_key, created_at')
      .order('created_at', { ascending: false });

    // Get recent activity for "active conversations"
    const { data: anonMessagesLastHour } = await supabase
      .from('anonymous_interactions')
      .select('id, anonymous_id, character_key')
      .gte('created_at', lastHour.toISOString());

    // Combine ALL messages for total stats (matches analytics dashboard)
    const allMessages = [
      ...(allAnonMessages || []).map(m => ({
        ...m,
        user_id: m.anonymous_id,
        isAnonymous: true
      })),
      ...(allAuthMessages || []).map(m => ({
        ...m,
        user_id: m.user_id,
        isAnonymous: false
      }))
    ];

    // Calculate total unique sessions (matches analytics "Total Sessions: 46")
    const uniqueUsers = new Set(allMessages.map(m => m.user_id).filter(Boolean));
    const totalSessions = uniqueUsers.size;

    // Calculate active conversations (users who messaged in last hour)
    const recentActiveUsers = new Set([
      ...(anonMessagesLastHour || []).map(m => m.anonymous_id),
    ].filter(Boolean));

    // Character-specific stats for personalized FOMO (matches analytics dashboard)
    const characterStats = new Map<string, { users: Set<string>; messages: number }>();

    allMessages.forEach(msg => {
      const char = msg.character_key;
      if (!characterStats.has(char)) {
        characterStats.set(char, { users: new Set(), messages: 0 });
      }
      const stats = characterStats.get(char)!;
      stats.users.add(msg.user_id);
      stats.messages++;
    });

    const characterStatsArray = Array.from(characterStats.entries()).map(([character, stats]) => ({
      character,
      activeUsers: stats.users.size,
      recentMessages: stats.messages
    }));

    const socialProofData: SocialProofData = {
      totalSessions,
      messagesLast24h: allMessages.length, // Total messages (like analytics "Total Messages: 229")
      activeConversations: recentActiveUsers.size,
      characterStats: characterStatsArray
    };

    // Add cache headers for reasonable freshness (5 minutes)
    const response = NextResponse.json({
      success: true,
      data: socialProofData,
      generatedAt: now.toISOString()
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

    return response;

  } catch (error: any) {
    console.error('❌ Social proof API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch social proof data',
        // Fallback data for graceful degradation
        data: {
          totalSessions: 0,
          messagesLast24h: 0,
          activeConversations: 0,
          characterStats: []
        }
      },
      { status: 500 }
    );
  }
}