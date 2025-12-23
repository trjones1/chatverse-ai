// API endpoint for user's own relationship status
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest } from '@/lib/auth-headers';
import { getMemoryForUser } from '@/lib/memorySystem';

export const dynamic = 'force-dynamic';

const admin = getSupabaseAdmin();

function calculateOverallScore(emotions: any): number {
  if (!emotions) return 0;
  
  // Weighted scoring: Higher affection and trust are positive,
  // Lower jealousy is positive, moderate playfulness and clinginess are optimal
  const affectionScore = (emotions.affection || 0) * 0.3;
  const trustScore = (emotions.trust || 0) * 0.3;
  const jealousyScore = (100 - (emotions.jealousy || 0)) * 0.15; // Inverse scoring
  const playfulnessScore = Math.abs(50 - (emotions.playfulness || 50)) * -0.1 + 50 * 0.15; // Optimal at 50
  const clinginessScore = Math.abs(30 - (emotions.clinginess || 30)) * -0.1 + 30 * 0.1; // Optimal at 30
  
  return Math.max(0, Math.min(100, affectionScore + trustScore + jealousyScore + playfulnessScore + clinginessScore));
}

function getRelationshipStage(score: number, conversations: number): string {
  if (conversations < 5) return 'Getting to Know Each Other';
  if (score < 30) return 'Casual Acquaintance';
  if (score < 50) return 'Growing Connection';
  if (score < 70) return 'Close Bond';
  if (score < 85) return 'Deep Relationship';
  return 'Soulmate Connection';
}

export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`💕 [${requestId}] Relationship Status API: Fetching user relationship data`);

  try {
    const url = new URL(req.url);
    const character = (url.searchParams.get('character') || 'lexi').toLowerCase();
    
    // Use unified authentication utility
    const authResult = await authenticateRequest(req, { character, requireAuth: false });
    const { user, userId, isAuthenticated } = authResult;
    
    if (!isAuthenticated || !user) {
      console.log(`💕 [${requestId}] Anonymous user - no relationship data available`);
      return NextResponse.json({
        success: false,
        error: 'Authentication required to view relationship status',
        isAnonymous: true
      }, { status: 401 });
    }

    console.log(`💕 [${requestId}] Authenticated user: ${userId.substring(0, 8)}... character: ${character}`);

    try {
      // Try to get conversation count from achievement milestones (fallback to interaction_log if not available)
      let actualConversationCount = 0;

      try {
        const { data: achievementData } = await admin
          .from('user_achievement_milestones')
          .select('max_conversations_reached')
          .eq('user_id', userId)
          .eq('character_key', character)
          .single();

        actualConversationCount = achievementData?.max_conversations_reached || 0;
        console.log(`💕 [${requestId}] Achievement-based conversation count: ${actualConversationCount}`);
      } catch (achievementError) {
        console.log(`💕 [${requestId}] Achievement milestones not available, using interaction_log`);

        // Fallback to counting from interaction_log
        try {
          const { count } = await admin
            .from('interaction_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('character_key', character);

          actualConversationCount = Math.floor((count || 0) / 2); // Roughly half are user messages
        } catch (interactionError) {
          console.log(`💕 [${requestId}] Interaction log not available, using 0`);
          actualConversationCount = 0;
        }
      }

      // Try to get comprehensive memory data including emotional state
      let memoryBundle = null;
      try {
        memoryBundle = await getMemoryForUser(userId, character, 10);
      } catch (memoryError) {
        console.log(`💕 [${requestId}] Memory system not available`);
      }

      // Try to get emotional state directly from the database
      let emotionalState = null;
      let emotionError = null;

      try {
        const { data, error } = await admin
          .from('emotional_states')
          .select('*')
          .eq('user_id', userId)
          .eq('character_key', character)
          .single();

        emotionalState = data;
        emotionError = error;
      } catch (dbError) {
        console.log(`💕 [${requestId}] Emotional states table not available`);
        emotionError = dbError;
      }

      let relationshipData = {
        affection: 25,
        trust: 25,
        jealousy: 20,
        playfulness: 45,
        clinginess: 25,
        total_conversations: actualConversationCount,
        streak_days: 1,
        last_visit_at: new Date().toISOString()
      };

      // If we have real emotional state data, use it but prioritize actual message count
      if (emotionalState && !emotionError) {
        console.log(`💕 [${requestId}] Found emotional state data for user`);
        relationshipData = {
          affection: emotionalState.affection || 25,
          trust: emotionalState.trust || 25,
          jealousy: emotionalState.jealousy || 20,
          playfulness: emotionalState.playfulness || 45,
          clinginess: emotionalState.clinginess || 25,
          total_conversations: actualConversationCount, // Use actual count, not stored count
          streak_days: emotionalState.streak_days || 1,
          last_visit_at: emotionalState.last_visit_at || new Date().toISOString()
        };
      } else {
        console.log(`💕 [${requestId}] No emotional state found, using defaults with actual message count: ${actualConversationCount}`);

        // If we have conversation history, adjust the defaults based on interaction count
        if (actualConversationCount > 0) {
          // Gradually increase affection and trust based on conversation history
          const conversationBoost = Math.min(actualConversationCount * 2, 40); // Up to +40 points
          relationshipData.affection = Math.min(100, 25 + conversationBoost);
          relationshipData.trust = Math.min(100, 25 + conversationBoost * 0.8);
          relationshipData.total_conversations = actualConversationCount;

          // Calculate streak based on recent messages
          if (actualConversationCount >= 5) relationshipData.streak_days = Math.min(7, Math.floor(actualConversationCount / 3));
        }
      }

      const overallScore = calculateOverallScore(relationshipData);
      const relationshipStage = getRelationshipStage(overallScore, relationshipData.total_conversations);

      const response = {
        success: true,
        data: {
          ...relationshipData,
          overall_score: overallScore,
          relationship_stage: relationshipStage,
          character_key: character
        },
        metadata: {
          hasEmotionalStateData: !emotionError && !!emotionalState,
          episodeCount: memoryBundle?.episodes?.length || 0,
          actualMessageCount: actualConversationCount,
          lastUpdated: new Date().toISOString()
        }
      };

      console.log(`💕 [${requestId}] Relationship data retrieved successfully - score: ${overallScore.toFixed(1)}, stage: ${relationshipStage}`);
      return NextResponse.json(response);

    } catch (memoryError) {
      console.error(`💕 [${requestId}] Error fetching memory/emotional data:`, memoryError);
      
      // Return basic starter relationship data
      const starterData = {
        affection: 10,
        trust: 10,
        jealousy: 15,
        playfulness: 30,
        clinginess: 20,
        total_conversations: 0,
        streak_days: 0,
        last_visit_at: new Date().toISOString(),
        overall_score: 15,
        relationship_stage: 'Getting to Know Each Other',
        character_key: character
      };

      return NextResponse.json({
        success: true,
        data: starterData,
        metadata: {
          hasEmotionalStateData: false,
          isStarterData: true,
          lastUpdated: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error(`💕 [${requestId}] Relationship Status API error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch relationship status'
    }, { status: 500 });
  }
}