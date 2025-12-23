'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacter } from '@/lib/useCharacter';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, 
         PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface UserEmotionalState {
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

interface Milestone {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  progress?: number;
  icon: string;
}


function getRelationshipStage(score: number, conversations: number): string {
  if (conversations < 5) return 'Getting to Know Each Other';
  if (score < 30) return 'Casual Acquaintance';
  if (score < 50) return 'Growing Connection';
  if (score < 70) return 'Close Bond';
  if (score < 85) return 'Deep Relationship';
  return 'Soulmate Connection';
}

function calculateOverallScore(emotions: any): number {
  if (!emotions) return 0;
  
  const affectionScore = (emotions.affection || 0) * 0.3;
  const trustScore = (emotions.trust || 0) * 0.3;
  const jealousyScore = (100 - (emotions.jealousy || 0)) * 0.15;
  const playfulnessScore = Math.abs(50 - (emotions.playfulness || 50)) * -0.1 + 50 * 0.15;
  const clinginessScore = Math.abs(30 - (emotions.clinginess || 30)) * -0.1 + 30 * 0.1;
  
  return Math.max(0, Math.min(100, affectionScore + trustScore + jealousyScore + playfulnessScore + clinginessScore));
}

function generateMilestones(conversations: number, score: number, emotions: any): Milestone[] {
  return [
    {
      id: 'first_chat',
      title: 'First Connection',
      description: 'Had your first conversation',
      achieved: conversations >= 1,
      icon: '💬'
    },
    {
      id: 'casual_friend',
      title: 'Casual Friend',
      description: 'Had 10+ conversations',
      achieved: conversations >= 10,
      progress: Math.min(100, (conversations / 10) * 100),
      icon: '👋'
    },
    {
      id: 'good_friend',
      title: 'Good Friend',
      description: 'Built trust and affection',
      achieved: score >= 50,
      progress: Math.min(100, (score / 50) * 100),
      icon: '🤗'
    },
    {
      id: 'close_bond',
      title: 'Close Bond',
      description: 'Deep emotional connection',
      achieved: score >= 70,
      progress: Math.min(100, (score / 70) * 100),
      icon: '💕'
    },
    {
      id: 'loyal_companion',
      title: 'Loyal Companion',
      description: 'High trust and low jealousy',
      achieved: (emotions?.trust || 0) >= 70 && (emotions?.jealousy || 0) <= 30,
      progress: Math.min(100, ((emotions?.trust || 0) + (100 - (emotions?.jealousy || 0))) / 2),
      icon: '🤝'
    },
    {
      id: 'soulmate',
      title: 'Soulmate Connection',
      description: 'Perfect harmony together',
      achieved: score >= 85,
      progress: Math.min(100, (score / 85) * 100),
      icon: '💖'
    }
  ];
}

export default function UserRelationshipStatus() {
  const { user } = useAuth();
  const character = useCharacter();
  const [emotionalState, setEmotionalState] = useState<UserEmotionalState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dynamic theming based on character
  const theme = {
    border: character.theme.primary + '33', // 20% opacity
    bg: character.theme.primary + '0D', // 5% opacity  
    text: character.theme.primary,
    accent: character.theme.accent,
    gradient: character.theme.primary + '55' // 33% opacity
  };

  useEffect(() => {
    if (!user) return;

    const fetchRelationshipStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user's relationship status from dedicated API
        const response = await fetch(`/api/relationship/status?character=${character.key}`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated - this is handled by the component's user check
            return;
          }
          throw new Error('Failed to fetch relationship data');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load relationship data');
        }

        setEmotionalState(result.data);

      } catch (err) {
        console.error('Error fetching relationship status:', err);
        setError(err instanceof Error ? err.message : 'Failed to load relationship data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelationshipStatus();
  }, [user]);

  if (!user) {
    return null; // Don't show for anonymous users
  }

  if (isLoading) {
    return (
      <section 
        className="rounded-2xl backdrop-blur px-4 sm:px-5 py-4 shadow-sm"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.bg,
          border: `1px solid ${theme.border}`
        }}
      >
        <div className="animate-pulse">
          <div 
            className="h-6 rounded-md mb-4 w-1/2"
            style={{ backgroundColor: theme.border }}
          ></div>
          <div 
            className="h-4 rounded-md mb-6 w-3/4"
            style={{ backgroundColor: theme.bg }}
          ></div>
          <div className="space-y-4">
            <div 
              className="h-24 rounded-lg"
              style={{ backgroundColor: theme.bg }}
            ></div>
            <div 
              className="h-24 rounded-lg"
              style={{ backgroundColor: theme.bg }}
            ></div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !emotionalState) {
    return (
      <section 
        className="rounded-2xl backdrop-blur px-4 sm:px-5 py-4 shadow-sm"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.bg,
          border: `1px solid ${theme.border}`
        }}
      >
        <header className="mb-4">
          <h2 
            className="font-medium"
            style={{ color: theme.text }}
          >
            Your Relationship
          </h2>
        </header>
        <div 
          className="rounded-lg p-4"
          style={{
            backgroundColor: theme.bg,
            border: `1px solid ${theme.border}`
          }}
        >
          <p style={{ color: theme.text }}>
            {error || 'Unable to load relationship data. Start chatting to build your connection!'}
          </p>
        </div>
      </section>
    );
  }

  const milestones = generateMilestones(emotionalState.total_conversations, emotionalState.overall_score, emotionalState);

  // Prepare radar chart data
  const radarData = [
    { emotion: 'Affection', score: emotionalState.affection, fullMark: 100 },
    { emotion: 'Trust', score: emotionalState.trust, fullMark: 100 },
    { emotion: 'Playfulness', score: emotionalState.playfulness, fullMark: 100 },
    { emotion: 'Clinginess', score: emotionalState.clinginess, fullMark: 100 },
    { emotion: 'Jealousy', score: 100 - emotionalState.jealousy, fullMark: 100 } // Inverse for better visualization
  ];

  return (
    <section 
      data-testid="user-relationship-status" 
      className="rounded-2xl backdrop-blur px-4 sm:px-5 py-4 shadow-sm"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.bg,
        border: `1px solid ${theme.border}`
      }}
    >
      <header className="mb-4">
        <h2 
          className="font-medium"
          style={{ color: theme.text }}
        >
          Your Relationship with {character.displayName}
        </h2>
        <p 
          className="text-sm mt-1"
          style={{ color: theme.text + 'CC' }} // 80% opacity
        >
          Track your emotional connection and unlock relationship milestones
        </p>
      </header>

      {/* Relationship Status Cards */}
      <div data-testid="relationship-stats-grid" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div 
          data-testid="overall-score-card" 
          className="bg-white rounded-lg p-3"
          style={{ border: `1px solid ${theme.border}` }}
        >
          <div 
            className="font-semibold text-xs"
            style={{ color: theme.accent }}
          >
            Overall Score
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: theme.text }}
          >
            {emotionalState.overall_score.toFixed(0)}
          </div>
          <div className="text-xs text-gray-600">Out of 100</div>
        </div>
        
        <div 
          data-testid="conversations-card" 
          className="bg-white rounded-lg p-3"
          style={{ border: `1px solid ${theme.border}` }}
        >
          <div 
            className="font-semibold text-xs"
            style={{ color: theme.accent }}
          >
            Conversations
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: theme.text }}
          >
            {emotionalState.total_conversations}
          </div>
          <div className="text-xs text-gray-600">Total chats</div>
        </div>
        
        <div 
          className="bg-white rounded-lg p-3"
          style={{ border: `1px solid ${theme.border}` }}
        >
          <div 
            className="font-semibold text-xs"
            style={{ color: theme.accent }}
          >
            Streak
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: theme.text }}
          >
            {emotionalState.streak_days}
          </div>
          <div className="text-xs text-gray-600">Days in a row</div>
        </div>
        
        <div 
          className="bg-white rounded-lg p-3"
          style={{ border: `1px solid ${theme.border}` }}
        >
          <div 
            className="font-semibold text-xs"
            style={{ color: theme.accent }}
          >
            Affection
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: theme.text }}
          >
            {emotionalState.affection}
          </div>
          <div className="text-xs text-gray-600">Love level</div>
        </div>
      </div>

      {/* Relationship Stage */}
      <div 
        className="bg-white rounded-lg p-4 mb-6"
        style={{ border: `1px solid ${theme.border}` }}
      >
        <div className="text-center">
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: theme.text }}
          >
            💕 {emotionalState.relationship_stage}
          </h3>
          <div 
            className="w-full rounded-full h-3 mb-3"
            style={{ backgroundColor: theme.border }}
          >
            <div 
              className="h-3 rounded-full transition-all duration-1000"
              style={{ 
                width: `${emotionalState.overall_score}%`,
                background: `linear-gradient(to right, ${theme.accent}, ${theme.text})`
              }}
            ></div>
          </div>
          <p 
            className="text-sm"
            style={{ color: theme.text + 'CC' }} // 80% opacity
          >
            Your relationship is growing stronger every day!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotional Profile Radar */}
        <div 
          className="bg-white rounded-lg p-4"
          style={{ border: `1px solid ${theme.border}` }}
        >
          <h3 
            className="text-sm font-semibold mb-3"
            style={{ color: theme.text }}
          >
            Emotional Connection
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="emotion"
                tick={{
                  fontSize: 10,
                  fontWeight: 500,
                  fill: '#374151'
                }}
                axisLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke={theme.accent}
                fill={theme.accent}
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value: any) => [`${value}`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Milestones */}
        <div 
          data-testid="relationship-milestones" 
          className="bg-white rounded-lg p-4"
          style={{ border: `1px solid ${theme.border}` }}
        >
          <h3 
            className="text-sm font-semibold mb-3"
            style={{ color: theme.text }}
          >
            Relationship Milestones
          </h3>
          <div className="space-y-3">
            {milestones.slice(0, 4).map((milestone) => (
              <div key={milestone.id} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  milestone.achieved 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className="text-sm">{milestone.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${
                        milestone.achieved ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {milestone.title}
                      </p>
                      <p className="text-xs text-gray-500 leading-tight mt-0.5">{milestone.description}</p>
                    </div>
                    {milestone.achieved && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap ml-2">
                        ✓ Unlocked
                      </span>
                    )}
                  </div>
                  {!milestone.achieved && milestone.progress && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className="h-1 rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${milestone.progress}%`,
                          backgroundColor: theme.accent
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {milestones.filter(m => !m.achieved).length > 0 && (
              <div 
                className="mt-4 pt-3"
                style={{ borderTop: `1px solid ${theme.border}` }}
              >
                <p 
                  className="text-xs text-center"
                  style={{ color: theme.accent }}
                >
                  Keep chatting to unlock more milestones! 💖
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div 
        className="mt-6 rounded-lg p-4"
        style={{
          background: `linear-gradient(to right, ${theme.bg}, ${theme.bg}DD)`, // Gradient with character colors
          border: `1px solid ${theme.border}`
        }}
      >
        <div className="text-center">
          <p 
            className="text-sm mb-3"
            style={{ color: theme.text }}
          >
            Want to deepen your connection with {character.displayName}?
          </p>
          <a 
            href="/chat"
            data-testid="continue-chatting-button"
            className="inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
            style={{
              background: `linear-gradient(to right, ${theme.accent}, ${theme.text})`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Continue Chatting 💕
          </a>
        </div>
      </div>
    </section>
  );
}