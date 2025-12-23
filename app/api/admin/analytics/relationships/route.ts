// API endpoint for relationship score analytics
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminUser } from '@/lib/admin';
import { createClient } from '@/utils/supabase/server';

interface RelationshipScore {
  user_id: string;
  character_key: string;
  affection: number;
  trust: number;
  jealousy: number;
  playfulness: number;
  clinginess: number;
  total_conversations: number;
  streak_days: number;
  last_visit_at: string;
  overall_score: number;
  relationship_stage: string;
}

interface RelationshipAnalytics {
  totalUsers: number;
  averageScores: {
    affection: number;
    trust: number;
    jealousy: number;
    playfulness: number;
    clinginess: number;
    overall: number;
  };
  relationshipDistribution: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  topUsers: RelationshipScore[];
  characterComparison: {
    character: string;
    avgScore: number;
    userCount: number;
  }[];
}

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

export async function GET(request: NextRequest) {
  try {
    // Create server-side client for auth verification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || !isAdminUser(user)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    
    // Fetch emotional states with user context
    const { data: emotionalStates, error: emotionsError } = await admin
      .from('emotional_states')
      .select(`
        user_id,
        character_key,
        affection,
        trust,
        jealousy,
        playfulness,
        clinginess,
        total_conversations,
        streak_days,
        last_visit_at,
        updated_at
      `)
      .order('updated_at', { ascending: false });

    if (emotionsError) {
      console.error('Error fetching emotional states:', emotionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch relationship data' },
        { status: 500 }
      );
    }

    if (!emotionalStates || emotionalStates.length === 0) {
      // Return empty analytics if no data
      const emptyAnalytics: RelationshipAnalytics = {
        totalUsers: 0,
        averageScores: {
          affection: 0,
          trust: 0,
          jealousy: 0,
          playfulness: 0,
          clinginess: 0,
          overall: 0
        },
        relationshipDistribution: [
          { stage: 'Getting to Know Each Other', count: 0, percentage: 0 },
          { stage: 'Casual Acquaintance', count: 0, percentage: 0 },
          { stage: 'Growing Connection', count: 0, percentage: 0 },
          { stage: 'Close Bond', count: 0, percentage: 0 },
          { stage: 'Deep Relationship', count: 0, percentage: 0 },
          { stage: 'Soulmate Connection', count: 0, percentage: 0 }
        ],
        topUsers: [],
        characterComparison: []
      };
      
      return NextResponse.json({
        success: true,
        data: emptyAnalytics
      });
    }

    // Process relationship scores
    const relationshipScores: RelationshipScore[] = emotionalStates.map(state => {
      const overallScore = calculateOverallScore(state);
      return {
        user_id: state.user_id,
        character_key: state.character_key || 'unknown',
        affection: state.affection || 0,
        trust: state.trust || 0,
        jealousy: state.jealousy || 0,
        playfulness: state.playfulness || 0,
        clinginess: state.clinginess || 0,
        total_conversations: state.total_conversations || 0,
        streak_days: state.streak_days || 0,
        last_visit_at: state.last_visit_at || state.updated_at,
        overall_score: overallScore,
        relationship_stage: getRelationshipStage(overallScore, state.total_conversations || 0)
      };
    });

    // Calculate analytics
    const totalUsers = relationshipScores.length;
    
    // Average scores
    const averageScores = {
      affection: relationshipScores.reduce((sum, r) => sum + r.affection, 0) / totalUsers,
      trust: relationshipScores.reduce((sum, r) => sum + r.trust, 0) / totalUsers,
      jealousy: relationshipScores.reduce((sum, r) => sum + r.jealousy, 0) / totalUsers,
      playfulness: relationshipScores.reduce((sum, r) => sum + r.playfulness, 0) / totalUsers,
      clinginess: relationshipScores.reduce((sum, r) => sum + r.clinginess, 0) / totalUsers,
      overall: relationshipScores.reduce((sum, r) => sum + r.overall_score, 0) / totalUsers
    };

    // Relationship stage distribution
    const stageCount = new Map<string, number>();
    relationshipScores.forEach(r => {
      stageCount.set(r.relationship_stage, (stageCount.get(r.relationship_stage) || 0) + 1);
    });

    const relationshipDistribution = Array.from(stageCount.entries()).map(([stage, count]) => ({
      stage,
      count,
      percentage: (count / totalUsers) * 100
    })).sort((a, b) => b.count - a.count);

    // Top users by overall score
    const topUsers = relationshipScores
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 10)
      .map(user => ({
        ...user,
        user_id: user.user_id.substring(0, 8) + '...' // Anonymize for privacy
      }));

    // Character comparison
    const characterStats = new Map<string, { totalScore: number; count: number }>();
    relationshipScores.forEach(r => {
      const existing = characterStats.get(r.character_key) || { totalScore: 0, count: 0 };
      characterStats.set(r.character_key, {
        totalScore: existing.totalScore + r.overall_score,
        count: existing.count + 1
      });
    });

    const characterComparison = Array.from(characterStats.entries()).map(([character, stats]) => ({
      character,
      avgScore: stats.totalScore / stats.count,
      userCount: stats.count
    })).sort((a, b) => b.avgScore - a.avgScore);

    const analytics: RelationshipAnalytics = {
      totalUsers,
      averageScores,
      relationshipDistribution,
      topUsers,
      characterComparison
    };

    return NextResponse.json({
      success: true,
      data: analytics,
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataPoints: totalUsers
      }
    });

  } catch (error) {
    console.error('Relationship analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}