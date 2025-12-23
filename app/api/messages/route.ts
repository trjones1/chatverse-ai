// app/api/messages/route.ts - Enhanced with pagination, session management, and performance monitoring
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest } from '@/lib/auth-headers';

export const dynamic = 'force-dynamic';

interface MessageResponse {
  messages: any[];
  count: number;
  character: string;
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalMessages: number;
    userLimit: number;
    currentPage: number;
  };
  session: {
    sessionId: string | null;
    sessionTitle: string | null;
    sessionStarted: string | null;
  };
  performance: {
    loadTimeMs: number;
    warningLevel: 'none' | 'approaching_limit' | 'performance_warning' | 'critical';
    archivedCount: number;
  };
}

// Helper function to get user's subscription tier and corresponding message limit
async function getUserMessageLimit(admin: any, userId: string): Promise<number> {
  try {
    const { data: orders } = await admin
      .from('orders')
      .select('tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (orders && orders.length > 0) {
      const tier = orders[0].tier;
      switch (tier) {
        case 'premium_plus': return 500;
        case 'premium': return 200;
        default: return 50;
      }
    }
    return 50; // Free tier default
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 50; // Fallback to free tier
  }
}


// Helper function to update performance metrics
async function updatePerformanceMetrics(
  admin: any,
  userId: string,
  character: string,
  currentMessageCount: number,
  userLimit: number
): Promise<{ warningLevel: string; archivedCount: number }> {
  try {
    // Get archived messages count
    const { count: archivedCount } = await admin
      .from('archived_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('character_key', character);

    // Determine warning level
    let warningLevel = 'none';
    if (currentMessageCount >= userLimit) {
      warningLevel = 'critical';
    } else if (currentMessageCount >= userLimit * 0.9) {
      warningLevel = 'performance_warning';
    } else if (currentMessageCount >= userLimit * 0.8) {
      warningLevel = 'approaching_limit';
    }

    // Update or insert performance metrics (with graceful error handling)
    try {
      await admin
        .from('message_performance_metrics')
        .upsert({
          user_id: userId,
          character_key: character,
          metric_date: new Date().toISOString().split('T')[0],
          total_messages: currentMessageCount,
          archived_messages: archivedCount || 0,
          warning_level: warningLevel,
          updated_at: new Date().toISOString()
        });
    } catch (metricsError) {
      // Log but don't fail the entire operation if metrics update fails
      console.warn('⚠️ Failed to update performance metrics:', {
        error: (metricsError as any)?.message || String(metricsError),
        userId: userId?.substring(0, 8) + '...',
        character,
        warningLevel
      });
    }

    return { warningLevel, archivedCount: archivedCount || 0 };
  } catch (error) {
    console.error('Error updating performance metrics:', error);
    return { warningLevel: 'none', archivedCount: 0 };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse<MessageResponse>> {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(req.url);
    const character = searchParams.get('character') || 'lexi';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per request
    const cursor = searchParams.get('cursor'); // ISO timestamp for cursor-based pagination
    const direction = searchParams.get('direction') || 'before'; // 'before' (older) or 'after' (newer)
    
    // Use unified authentication - supports both authenticated and anonymous users
    const authResult = await authenticateRequest(req, { character, debug: true });
    const { user, userId, isAuthenticated, userIdSource } = authResult;
    
    if (!isAuthenticated || !userId) {
      console.log('🔍 MESSAGES API: Unauthenticated user - returning empty messages', {
        isAuthenticated,
        userIdSource,
        userId: userId ? 'present' : 'missing'
      });
      // Return empty messages array for unauthenticated users instead of 401
      return NextResponse.json({
        messages: [],
        count: 0,
        character,
        pagination: {
          hasMore: false,
          nextCursor: null,
          totalMessages: 0,
          userLimit: 50,
          currentPage: 1
        },
        session: {
          sessionId: null,
          sessionTitle: null,
          sessionStarted: null
        },
        performance: {
          loadTimeMs: Date.now() - startTime,
          warningLevel: 'none',
          archivedCount: 0
        }
      });
    }

    // Use admin client for database operations
    const admin = getSupabaseAdmin();
    
    console.log('🔍 MESSAGES API: Enhanced query with pagination:', {
      userId: userId,
      character,
      limit,
      cursor,
      direction,
      authUser: user?.id,
      userIdSource,
      isAuthenticated,
      timestamp: new Date().toISOString()
    });

    // Get user's message limit based on subscription tier
    const userLimit = await getUserMessageLimit(admin, userId);
    
    // Simple session info without conversation management
    const sessionInfo = { sessionId: null, sessionTitle: null, sessionStarted: null };
    
    // Build the query with cursor-based pagination
    console.log('🔍 MESSAGES API: Building database query with:', {
      table: 'interaction_log',
      user_id: userId,
      character_key: character,
      userId_length: userId.length,
      character_length: character.length
    });

    let query = admin
      .from('interaction_log')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character);


    // Apply cursor-based filtering
    if (cursor) {
      if (direction === 'before') {
        query = query.lt('created_at', cursor);
      } else {
        query = query.gt('created_at', cursor);
      }
    }

    // Apply ordering and limit (get one extra to check if there are more)
    if (direction === 'before') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: true });
    }
    
    query = query.limit(limit + 1); // Get one extra to check for more

    const { data, error } = await query;

    if (error) {
      console.error('🔍 MESSAGES API: Database error:', error);
      return NextResponse.json({
        error: 'Failed to load messages'
      } as any, { status: 500 });
    }

    console.log('🔍 MESSAGES API: Query result:', {
      messageCount: data?.length || 0,
      userId,
      character,
      direction,
      cursor
    });

    // Check if there are more messages
    const hasMore = (data || []).length > limit;
    const messages = hasMore ? (data || []).slice(0, limit) : (data || []);

    // Get next cursor (last message timestamp)
    let nextCursor: string | null = null;
    if (hasMore && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      nextCursor = lastMessage.created_at;
    }

    // Get total message count for this user/character
    const { count: totalMessages } = await admin
      .from('interaction_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('character_key', character);

    // Update performance metrics
    const performanceInfo = await updatePerformanceMetrics(
      admin,
      userId,
      character,
      totalMessages || 0,
      userLimit
    );

    // Auto-archive if user is over limit
    if (totalMessages && totalMessages > userLimit) {
      try {
        await admin.rpc('archive_old_messages', {
          p_user_id: userId,
          p_character_key: character,
          p_force_archive: true
        });
      } catch (archiveError) {
        console.error('Error auto-archiving messages:', archiveError);
      }
    }

    // Format messages for display (reverse for chronological order if getting older messages)
    const formatted = (direction === 'before' ? messages.reverse() : messages).map(msg => {
      const hasNsfwFlag = Boolean(msg.nsfw);
      const selfieData = msg.metadata?.selfie || null;
      const isTipAck = Boolean(msg.metadata?.is_tip_acknowledgment);
      const tipAmount = msg.metadata?.tip_amount_cents || null;
      const fanfareLevel = msg.metadata?.fanfare_level || null;
      const isGiftAck = Boolean(msg.metadata?.is_gift_acknowledgment);
      const giftAmount = msg.metadata?.gift_amount || null;
      const relationshipBonus = msg.metadata?.relationship_bonus || null;

      return {
        id: msg.id,
        isUser: msg.role === 'user',
        text: msg.content,
        created_at: new Date(msg.created_at),
        nsfw: hasNsfwFlag,
        sessionId: msg.session_id,
        topics: msg.topics || [],
        emotionalTone: msg.emotional_tone,
        metadata: msg.metadata || {},
        selfie: selfieData,
        is_tip_acknowledgment: isTipAck,
        tip_amount_cents: tipAmount,
        fanfare_level: fanfareLevel,
        is_gift_acknowledgment: isGiftAck,
        gift_amount: giftAmount,
        relationship_bonus: relationshipBonus
      };
    });

    const loadTimeMs = Date.now() - startTime;

    console.log('🔍 MESSAGES API: Enhanced query result:', {
      success: !error,
      messageCount: formatted.length,
      hasMore,
      nextCursor,
      totalMessages,
      userLimit,
      warningLevel: performanceInfo.warningLevel,
      loadTimeMs,
      sessionId: sessionInfo.sessionId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      messages: formatted,
      count: formatted.length,
      character,
      pagination: {
        hasMore,
        nextCursor,
        totalMessages: totalMessages || 0,
        userLimit,
        currentPage: Math.floor((totalMessages || 0) / limit) + 1
      },
      session: sessionInfo,
      performance: {
        loadTimeMs,
        warningLevel: performanceInfo.warningLevel as any,
        archivedCount: performanceInfo.archivedCount
      }
    });
    
  } catch (error) {
    console.error('🔍 MESSAGES API: Unexpected error:', error);
    const loadTimeMs = Date.now() - startTime;
    
    return NextResponse.json({ 
      error: 'Internal server error',
      performance: { loadTimeMs }
    } as any, { status: 500 });
  }
}