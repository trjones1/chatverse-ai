import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { protectAdminEndpoint } from '@/lib/admin-rate-limiting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Apply admin rate limiting
    const rateLimitResponse = await protectAdminEndpoint(req, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check admin environment flag
    if (!process.env.ENABLE_ADMIN_TOOLS) {
      return NextResponse.json({ error: 'Admin tools not enabled' }, { status: 403 });
    }

    // Verify admin access
    const clientSupabase = await createClient();
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAdmin(user);

    // Use admin client for queries
    const admin = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const anonymousId = searchParams.get('anonymousId');
    const characterKey = searchParams.get('character') || 'lexi';

    // Get all user sessions with message counts
    if (!userId && !anonymousId) {
      // Fetch all authenticated user sessions
      const { data: authSessions, error: authError } = await admin
        .from('interaction_log')
        .select('user_id, character_key, created_at')
        .order('created_at', { ascending: false });

      // Fetch all anonymous user sessions
      const { data: anonSessions, error: anonError } = await admin
        .from('anonymous_interactions')
        .select('anonymous_id, character_key, created_at')
        .order('created_at', { ascending: false });

      // Group by user/anon ID and character
      const sessionMap = new Map<string, any>();

      authSessions?.forEach((row) => {
        const key = `auth:${row.user_id}:${row.character_key}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            userId: row.user_id,
            anonymousId: null,
            characterKey: row.character_key,
            messageCount: 0,
            lastActivity: row.created_at,
            isAuthenticated: true,
          });
        }
        sessionMap.get(key).messageCount++;
        if (new Date(row.created_at) > new Date(sessionMap.get(key).lastActivity)) {
          sessionMap.get(key).lastActivity = row.created_at;
        }
      });

      anonSessions?.forEach((row) => {
        const key = `anon:${row.anonymous_id}:${row.character_key}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            userId: null,
            anonymousId: row.anonymous_id,
            characterKey: row.character_key,
            messageCount: 0,
            lastActivity: row.created_at,
            isAuthenticated: false,
          });
        }
        sessionMap.get(key).messageCount++;
        if (new Date(row.created_at) > new Date(sessionMap.get(key).lastActivity)) {
          sessionMap.get(key).lastActivity = row.created_at;
        }
      });

      const sessions = Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

      return NextResponse.json({ sessions });
    }

    // Fetch specific user conversation
    let messages = [];

    if (userId) {
      // Fetch authenticated user messages
      const { data, error } = await admin
        .from('interaction_log')
        .select('*')
        .eq('user_id', userId)
        .eq('character_key', characterKey)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching auth messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
      }

      messages = data || [];
    } else if (anonymousId) {
      // Fetch anonymous user messages
      const { data, error } = await admin
        .from('anonymous_interactions')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .eq('character_key', characterKey)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching anon messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
      }

      messages = data || [];
    }

    // Format messages
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.created_at,
      nsfw: msg.nsfw || false,
      topics: msg.topics || [],
      emotionalTone: msg.emotional_tone,
      metadata: msg.metadata || {},
      selfie: msg.metadata?.selfie?.url || null,
      voiceUrl: msg.metadata?.voice?.url || msg.metadata?.voiceUrl || null,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      userId,
      anonymousId,
      characterKey,
    });

  } catch (error: any) {
    console.error('❌ Chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history', details: error.message },
      { status: 500 }
    );
  }
}
