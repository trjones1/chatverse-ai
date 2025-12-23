import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { protectAdminEndpoint } from '@/lib/admin-rate-limiting';

export const dynamic = 'force-dynamic';

interface UserActivityMetrics {
  totalUsers: number;
  freeUsers: number;
  anonymousUsers: number;
  messagingActivity: {
    totalMessages: number;
    messagesLast7Days: number;
    messagesLast30Days: number;
    avgMessagesPerUser: number;
    avgMessagesPerSession: number;
  };
  userEngagement: {
    bounceRate: number; // Users who send 0-1 messages
    lowEngagement: number; // 2-5 messages
    mediumEngagement: number; // 6-20 messages
    highEngagement: number; // 20+ messages
  };
  sessionData: {
    avgSessionLength: number;
    totalSessions: number;
    returningUsers: number;
    newUsers: number;
  };
  characterPopularity: Array<{
    character: string;
    messageCount: number;
    uniqueUsers: number;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    // Apply admin-specific rate limiting
    const rateLimitResponse = await protectAdminEndpoint(req, 'analytics');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check admin environment flag
    if (!process.env.ENABLE_ADMIN_TOOLS) {
      return NextResponse.json({ error: 'Admin tools not enabled' }, { status: 403 });
    }

    // First verify admin access with client
    const clientSupabase = await createClient();
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireAdmin(user);

    // Use admin client for database queries (bypasses RLS for admin operations)
    const supabase = getSupabaseAdmin();

    // Date ranges for analysis
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get authenticated users count from profiles
    const { count: authenticatedUsersCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' });

    // Get free users (users without active subscriptions)
    const { data: paidUserIds } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('status', 'active');

    const paidUserIdList = paidUserIds?.map(sub => sub.user_id) || [];
    const freeAuthenticatedUsers = Math.max(0, (authenticatedUsersCount || 0) - paidUserIdList.length);

    // Get message activity from interaction_log (authenticated users)
    const { data: authMessages } = await supabase
      .from('interaction_log')
      .select('id, user_id, character_key, created_at')
      .order('created_at', { ascending: false });

    const { data: authMessagesLast7Days } = await supabase
      .from('interaction_log')
      .select('id, user_id, character_key')
      .gte('created_at', last7Days.toISOString());

    const { data: authMessagesLast30Days } = await supabase
      .from('interaction_log')
      .select('id, user_id, character_key')
      .gte('created_at', last30Days.toISOString());

    // Get anonymous message activity (CRITICAL for conversion tracking)
    const { data: anonMessages, error: anonError } = await supabase
      .from('anonymous_interactions')
      .select('id, anonymous_id, character_key, created_at')
      .order('created_at', { ascending: false });

    if (anonError) {
      console.error('❌ Error fetching anonymous messages:', anonError);
    } else {
      console.log('✅ Fetched anonymous messages:', anonMessages?.length || 0);
    }

    const { data: anonMessagesLast7Days, error: anon7dError } = await supabase
      .from('anonymous_interactions')
      .select('id, anonymous_id, character_key')
      .gte('created_at', last7Days.toISOString());

    if (anon7dError) {
      console.error('❌ Error fetching anonymous messages (7d):', anon7dError);
    }

    const { data: anonMessagesLast30Days, error: anon30dError } = await supabase
      .from('anonymous_interactions')
      .select('id, anonymous_id, character_key')
      .gte('created_at', last30Days.toISOString());

    if (anon30dError) {
      console.error('❌ Error fetching anonymous messages (30d):', anon30dError);
    }

    // Combine authenticated and anonymous messages for total stats
    const allMessages = [
      ...(authMessages || []).map(m => ({ ...m, user_id: m.user_id, isAnonymous: false })),
      ...(anonMessages || []).map(m => ({ ...m, user_id: m.anonymous_id, isAnonymous: true }))
    ];

    const messagesLast7Days = [
      ...(authMessagesLast7Days || []).map(m => ({ ...m, user_id: m.user_id })),
      ...(anonMessagesLast7Days || []).map(m => ({ ...m, user_id: m.anonymous_id }))
    ];

    const messagesLast30Days = [
      ...(authMessagesLast30Days || []).map(m => ({ ...m, user_id: m.user_id })),
      ...(anonMessagesLast30Days || []).map(m => ({ ...m, user_id: m.anonymous_id }))
    ];

    // Calculate user engagement levels based on message count
    const userMessageCounts = new Map<string, number>();
    allMessages?.forEach(msg => {
      if (msg.user_id) {
        userMessageCounts.set(msg.user_id, (userMessageCounts.get(msg.user_id) || 0) + 1);
      }
    });

    let bounceUsers = 0; // 0-1 messages
    let lowEngagement = 0; // 2-5 messages
    let mediumEngagement = 0; // 6-20 messages
    let highEngagement = 0; // 20+ messages

    userMessageCounts.forEach(count => {
      if (count <= 1) bounceUsers++;
      else if (count <= 5) lowEngagement++;
      else if (count <= 20) mediumEngagement++;
      else highEngagement++;
    });

    // Calculate bounce rate (users who sent 0-1 messages)
    const usersWithMessages = userMessageCounts.size;
    const bounceRate = usersWithMessages > 0 ? (bounceUsers / usersWithMessages) * 100 : 0;

    // Character popularity analysis
    const characterStats = new Map<string, { messages: number; users: Set<string> }>();
    allMessages?.forEach(msg => {
      const characterKey = msg.character_key;
      if (!characterStats.has(characterKey)) {
        characterStats.set(characterKey, { messages: 0, users: new Set() });
      }
      const stats = characterStats.get(characterKey)!;
      stats.messages++;
      if (msg.user_id) stats.users.add(msg.user_id);
    });

    const characterPopularity = Array.from(characterStats.entries()).map(([character, stats]) => ({
      character,
      messageCount: stats.messages,
      uniqueUsers: stats.users.size
    })).sort((a, b) => b.messageCount - a.messageCount);

    // Session analysis (simplified - based on message timestamps)
    const sessions = new Map<string, Array<Date>>();
    allMessages?.forEach(msg => {
      if (msg.user_id) {
        if (!sessions.has(msg.user_id)) {
          sessions.set(msg.user_id, []);
        }
        sessions.get(msg.user_id)!.push(new Date(msg.created_at));
      }
    });

    // Calculate session metrics
    let totalSessions = 0;
    let totalSessionTime = 0;
    sessions.forEach(userMessages => {
      userMessages.sort((a, b) => a.getTime() - b.getTime());
      let sessionStart = userMessages[0];
      let lastMessage = userMessages[0];

      userMessages.forEach(msgTime => {
        if (msgTime.getTime() - lastMessage.getTime() > 30 * 60 * 1000) { // 30 min gap = new session
          totalSessions++;
          totalSessionTime += lastMessage.getTime() - sessionStart.getTime();
          sessionStart = msgTime;
        }
        lastMessage = msgTime;
      });

      // Add final session
      totalSessions++;
      totalSessionTime += lastMessage.getTime() - sessionStart.getTime();
    });

    const avgSessionLength = totalSessions > 0 ? totalSessionTime / totalSessions / (1000 * 60) : 0; // in minutes

    // Calculate returning vs new users (users who have messages in last 30 days)
    const recentUsers = new Set(messagesLast30Days?.map(msg => msg.user_id).filter(Boolean));
    const returningUsers = recentUsers.size;

    // Count unique users from all messages (authenticated + anonymous)
    const totalUniqueUsers = userMessageCounts.size;
    const newUsers = Math.max(0, totalUniqueUsers - returningUsers);

    // Count unique anonymous users
    const uniqueAnonUsers = new Set(anonMessages?.map(m => m.anonymous_id) || []).size;

    // Calculate active users (users with messages in last 7 days)
    const activeUsers = new Set(messagesLast7Days?.map(msg => msg.user_id).filter(Boolean)).size;

    const metrics: UserActivityMetrics = {
      totalUsers: authenticatedUsersCount || 0,
      freeUsers: Math.max(0, freeAuthenticatedUsers), // Double safety against negatives
      anonymousUsers: uniqueAnonUsers,
      messagingActivity: {
        totalMessages: allMessages?.length || 0,
        messagesLast7Days: messagesLast7Days?.length || 0,
        messagesLast30Days: messagesLast30Days?.length || 0,
        avgMessagesPerUser: usersWithMessages > 0 ? (allMessages?.length || 0) / usersWithMessages : 0,
        avgMessagesPerSession: totalSessions > 0 ? (allMessages?.length || 0) / totalSessions : 0,
      },
      userEngagement: {
        bounceRate: Math.round(bounceRate * 10) / 10,
        lowEngagement,
        mediumEngagement,
        highEngagement,
      },
      sessionData: {
        avgSessionLength: Math.round(avgSessionLength * 10) / 10,
        totalSessions,
        returningUsers,
        newUsers,
      },
      characterPopularity,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        activeUsers, // Users with messages in last 7 days
      },
      generatedAt: now.toISOString(),
      note: 'User activity metrics calculated from messages and user data'
    });

  } catch (error: any) {
    console.error('❌ User activity analytics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user activity metrics',
        details: error.message
      },
      { status: 500 }
    );
  }
}