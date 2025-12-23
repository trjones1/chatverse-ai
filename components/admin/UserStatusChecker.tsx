// components/admin/UserStatusChecker.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserStatus {
  user: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
  };
  character: string;
  subscription: {
    active: boolean;
    details: any;
    tier: string;
  };
  voiceCredits: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
  relationship: {
    emotional_state: string | null;
    relationship_score: number;
    total_conversations: number;
    last_interaction: string | null;
  };
  entitlements: any;
  recentActivity: any[];
  features: {
    hasPremium: boolean;
    hasNSFW: boolean;
    hasVoiceCredits: boolean;
  };
}

const characters = [
  { key: 'lexi', name: 'Lexi' },
  { key: 'nyx', name: 'Nyx' },
  { key: 'dom', name: 'Dominic' },
  { key: 'aiko', name: 'Aiko' },
  { key: 'chase', name: 'Chase' },
  { key: 'zaria', name: 'Zaria' },
  { key: 'chloe', name: 'Chloe' },
  { key: 'nova', name: 'Nova' },
  { key: 'ethan', name: 'Ethan' },
  { key: 'jayden', name: 'Jayden' },
  { key: 'miles', name: 'Miles' }
];

export default function UserStatusChecker() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [character, setCharacter] = useState('lexi');
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUserStatus = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUserStatus(null);

    try {
      const response = await fetch('/api/admin/user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          character: character
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch user status');
      }

      setUserStatus(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'nsfw':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">NSFW Premium</span>;
      case 'sfw':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">SFW Premium</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Free</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Status Checker</h3>
        <p className="text-sm text-gray-600 mb-4">
          Look up comprehensive user information including subscriptions, tokens, and relationship stats.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            User Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label htmlFor="character" className="block text-sm font-medium text-gray-700 mb-2">
            Character
          </label>
          <select
            id="character"
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {characters.map((char) => (
              <option key={char.key} value={char.key}>
                {char.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={checkUserStatus}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Checking...' : 'Check Status'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {userStatus && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              User Status: {userStatus.user.email}
            </h4>
            <div className="flex items-center space-x-2">
              {getStatusBadge(userStatus.subscription.tier)}
              <span className="text-sm text-gray-500">
                {characters.find(c => c.key === userStatus.character)?.name || userStatus.character}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Info */}
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">User Info</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">User ID:</span>
                  <div className="font-mono text-xs bg-gray-100 p-1 rounded mt-1">
                    {userStatus.user.id}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <div>{formatDate(userStatus.user.created_at)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Last Sign In:</span>
                  <div>{userStatus.user.last_sign_in_at ? formatDate(userStatus.user.last_sign_in_at) : 'Never'}</div>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Subscription</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="font-semibold">
                    {userStatus.subscription.active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-gray-600">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Tier:</span>
                  <div>{userStatus.subscription.tier}</div>
                </div>
                {userStatus.subscription.details && (
                  <div>
                    <span className="text-gray-600">Expires:</span>
                    <div>{formatDate(userStatus.subscription.details.current_period_end)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Credits */}
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Voice Credits</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Current Balance:</span>
                  <div className="font-semibold text-lg text-blue-600">
                    {userStatus.voiceCredits.balance}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Total Earned:</span>
                  <div>{userStatus.voiceCredits.total_earned}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Spent:</span>
                  <div>{userStatus.voiceCredits.total_spent}</div>
                </div>
              </div>
            </div>

            {/* Relationship Stats */}
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Relationship</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Emotional State:</span>
                  <div>{userStatus.relationship.emotional_state || 'None'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Relationship Score:</span>
                  <div className="font-semibold">{userStatus.relationship.relationship_score}</div>
                </div>
                <div>
                  <span className="text-gray-600">Conversations:</span>
                  <div>{userStatus.relationship.total_conversations}</div>
                </div>
                <div>
                  <span className="text-gray-600">Last Interaction:</span>
                  <div>{userStatus.relationship.last_interaction ? formatDate(userStatus.relationship.last_interaction) : 'Never'}</div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Feature Access</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${userStatus.features.hasPremium ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Premium Features</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${userStatus.features.hasNSFW ? 'bg-purple-500' : 'bg-gray-300'}`}></span>
                  <span>NSFW Content</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${userStatus.features.hasVoiceCredits ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                  <span>Voice Credits</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Recent Activity</h5>
              <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                {userStatus.recentActivity.length > 0 ? (
                  userStatus.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <div className="font-medium">{activity.action_type}</div>
                      <div className="text-gray-500">{formatDate(activity.created_at)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No recent activity</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}