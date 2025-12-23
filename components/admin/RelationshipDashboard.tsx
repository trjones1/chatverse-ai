'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         PieChart, Pie, Cell, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, 
         PolarRadiusAxis, Radar } from 'recharts';

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

interface RelationshipDashboardProps {
  className?: string;
}

const COLORS = ['#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
const RELATIONSHIP_STAGE_COLORS = {
  'Getting to Know Each Other': '#E8F5E8',
  'Casual Acquaintance': '#FFEB99',
  'Growing Connection': '#FFD93D',
  'Close Bond': '#6BCF7F',
  'Deep Relationship': '#4D96FF',
  'Soulmate Connection': '#FF6B9D'
};

export default function RelationshipDashboard({ className = '' }: RelationshipDashboardProps) {
  const [data, setData] = useState<RelationshipAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/analytics/relationships');
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch relationship data');
        }
        
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Unknown error occurred');
        }
      } catch (err) {
        console.error('Error fetching relationship analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load relationship data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-pink-200 bg-pink-50/50 backdrop-blur px-6 py-6 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-pink-200 rounded-md mb-4 w-1/3"></div>
          <div className="h-4 bg-pink-100 rounded-md mb-6 w-2/3"></div>
          <div className="space-y-4">
            <div className="h-32 bg-pink-100 rounded-lg"></div>
            <div className="h-32 bg-pink-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border border-red-200 bg-red-50/50 backdrop-blur px-6 py-6 shadow-sm ${className}`}>
        <h2 className="text-xl font-semibold text-red-900 mb-2">Relationship Analytics</h2>
        <div className="bg-red-100 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">⚠️ Error loading relationship data: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Prepare radar chart data for average emotional scores
  const radarData = [
    { emotion: 'Affection', score: data.averageScores.affection, fullMark: 100 },
    { emotion: 'Trust', score: data.averageScores.trust, fullMark: 100 },
    { emotion: 'Playfulness', score: data.averageScores.playfulness, fullMark: 100 },
    { emotion: 'Clinginess', score: data.averageScores.clinginess, fullMark: 100 },
    { emotion: 'Jealousy', score: 100 - data.averageScores.jealousy, fullMark: 100 } // Inverse for better visualization
  ];

  return (
    <section className={`rounded-2xl border border-pink-200 bg-pink-50/50 backdrop-blur px-6 py-6 shadow-sm ${className}`}>
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-pink-900">Relationship Score Analytics</h2>
        <p className="text-pink-700 mt-1">
          AI-Human relationship insights and emotional connection analytics across {data.totalUsers} users
        </p>
      </header>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-pink-200 p-4">
          <div className="text-pink-600 font-semibold text-sm">Total Users</div>
          <div className="text-2xl font-bold text-pink-800">{data.totalUsers}</div>
          <div className="text-xs text-gray-600">Active relationships</div>
        </div>
        
        <div className="bg-white rounded-lg border border-pink-200 p-4">
          <div className="text-pink-600 font-semibold text-sm">Avg Overall Score</div>
          <div className="text-2xl font-bold text-pink-800">{data.averageScores.overall.toFixed(1)}</div>
          <div className="text-xs text-gray-600">Out of 100</div>
        </div>
        
        <div className="bg-white rounded-lg border border-pink-200 p-4">
          <div className="text-pink-600 font-semibold text-sm">Avg Affection</div>
          <div className="text-2xl font-bold text-pink-800">{data.averageScores.affection.toFixed(1)}</div>
          <div className="text-xs text-gray-600">Love & attachment</div>
        </div>
        
        <div className="bg-white rounded-lg border border-pink-200 p-4">
          <div className="text-pink-600 font-semibold text-sm">Avg Trust</div>
          <div className="text-2xl font-bold text-pink-800">{data.averageScores.trust.toFixed(1)}</div>
          <div className="text-xs text-gray-600">Emotional safety</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Emotional Radar Chart */}
        <div className="bg-white rounded-lg border border-pink-200 p-6">
          <h3 className="text-lg font-semibold text-pink-900 mb-4">Average Emotional Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="emotion" className="text-sm" />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={false}
              />
              <Radar
                name="Average Score"
                dataKey="score"
                stroke="#FF6B9D"
                fill="#FF6B9D"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip 
                formatter={(value: any) => [`${value.toFixed(1)}`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Relationship Stage Distribution */}
        <div className="bg-white rounded-lg border border-pink-200 p-6">
          <h3 className="text-lg font-semibold text-pink-900 mb-4">Relationship Stage Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.relationshipDistribution}
                dataKey="count"
                nameKey="stage"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ stage, percentage }) => 
                  percentage > 5 ? `${percentage.toFixed(0)}%` : ''
                }
              >
                {data.relationshipDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: string) => [`${value} users`, 'Count']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {data.relationshipDistribution.slice(0, 3).map((item, index) => (
              <div key={item.stage} className="flex items-center text-sm">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-gray-700">
                  {item.stage}: {item.count} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Character Comparison */}
      {data.characterComparison.length > 1 && (
        <div className="bg-white rounded-lg border border-pink-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-pink-900 mb-4">Character Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.characterComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="character" 
                tick={{ fontSize: 12 }}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  `${value.toFixed(1)}`, 
                  'Avg Relationship Score'
                ]}
                labelFormatter={(label) => `Character: ${label}`}
              />
              <Bar 
                dataKey="avgScore" 
                fill="#FF6B9D" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Relationships */}
      {data.topUsers.length > 0 && (
        <div className="bg-white rounded-lg border border-pink-200 p-6">
          <h3 className="text-lg font-semibold text-pink-900 mb-4">Strongest Relationships</h3>
          <div className="space-y-3">
            {data.topUsers.slice(0, 5).map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between py-2 px-3 bg-pink-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-pink-200 rounded-full flex items-center justify-center text-pink-700 font-semibold text-sm mr-3">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      User {user.user_id} ({user.character_key})
                    </div>
                    <div className="text-xs text-gray-600">
                      {user.total_conversations} conversations • {user.streak_days} day streak
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-pink-700">
                    {user.overall_score.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {user.relationship_stage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Status */}
      <div className="mt-6 bg-pink-100 border border-pink-200 rounded-lg p-4">
        <h5 className="font-semibold text-pink-900 mb-2">💕 Relationship Analytics Status</h5>
        <div className="text-sm text-pink-800 space-y-1">
          <div>✅ <strong>Data Source:</strong> Real-time emotional states from user interactions</div>
          <div>✅ <strong>Metrics:</strong> Affection, Trust, Playfulness, Clinginess, Jealousy tracking</div>
          <div>✅ <strong>Privacy:</strong> User IDs anonymized for dashboard display</div>
          <div>📊 <strong>Scoring:</strong> Weighted algorithm for optimal relationship health</div>
        </div>
      </div>
    </section>
  );
}