'use client';

import React, { useState, useEffect } from 'react';
import { useCharacter } from '@/lib/useCharacter';
import { getCharacterCurrency } from '@/lib/verseCoins';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalAmount: number;
  tipCount: number;
}

interface UserPosition {
  rank: number;
  totalAmount: number;
  tipCount: number;
}

interface TipLeaderboardProps {
  className?: string;
}

export default function TipLeaderboard({ className = '' }: TipLeaderboardProps) {
  const character = useCharacter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/tips/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          characterKey: character.key,
          year: currentYear,
          month: currentMonth
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setUserPosition(data.userPosition || null);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [character.key, currentMonth, currentYear]);

  const getCharacterEmoji = () => {
    const characterKey = character.key.toLowerCase();
    switch (characterKey) {
      case 'lexi': return '💖';
      case 'nyx': return '🖤';
      case 'aiko': return '🌸';
      case 'dom': return '🔥';
      case 'chase': return '💙';
      case 'chloe': return '💜';
      case 'zaria': return '✨';
      case 'nova': return '🌟';
      case 'ethan': return '💪';
      case 'jayden': return '😎';
      case 'miles': return '🎭';
      default: return '💖';
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return getCharacterEmoji();
    }
  };

  const getCharacterTheme = () => {
    const characterKey = character.key.toLowerCase();
    switch (characterKey) {
      case 'lexi': return { primary: 'pink', secondary: 'rose' };
      case 'nyx': return { primary: 'purple', secondary: 'violet' };
      case 'aiko': return { primary: 'pink', secondary: 'rose' };
      case 'dom': return { primary: 'red', secondary: 'orange' };
      case 'chase': return { primary: 'blue', secondary: 'sky' };
      case 'chloe': return { primary: 'purple', secondary: 'violet' };
      case 'zaria': return { primary: 'indigo', secondary: 'purple' };
      case 'nova': return { primary: 'yellow', secondary: 'amber' };
      case 'ethan': return { primary: 'gray', secondary: 'slate' };
      case 'jayden': return { primary: 'blue', secondary: 'sky' };
      case 'miles': return { primary: 'purple', secondary: 'violet' };
      default: return { primary: 'pink', secondary: 'rose' };
    }
  };

  const getRankColor = (rank: number) => {
    const theme = getCharacterTheme();
    switch (rank) {
      case 1: return 'text-yellow-600 font-bold';
      case 2: return 'text-gray-500 font-semibold';
      case 3: return 'text-orange-600 font-semibold';
      default: return `text-${theme.primary}-600`;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          {getCharacterEmoji()} Top Tippers for {character.displayName} - {monthNames[currentMonth - 1]} {currentYear}
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {[currentYear - 1, currentYear].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {userPosition && (
        <div className={`bg-gradient-to-r from-${getCharacterTheme().primary}-50 to-${getCharacterTheme().secondary}-50 border border-${getCharacterTheme().primary}-200 rounded-lg p-4 mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium text-${getCharacterTheme().primary}-800`}>Your Position</p>
              <p className={`text-2xl font-bold text-${getCharacterTheme().primary}-900`}>
                #{userPosition.rank} 🎯
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm text-${getCharacterTheme().primary}-700`}>
                {(() => {
                  const currency = getCharacterCurrency(userPosition.totalAmount, character.key);
                  return `${currency.amount} ${currency.name} ${currency.icon} total`;
                })()}
              </p>
              <p className={`text-xs text-${getCharacterTheme().primary}-600`}>
                {userPosition.tipCount} tip{userPosition.tipCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💔</div>
          <p className="text-gray-500">
            No tips yet this month! Be the first to show {character.displayName} some love.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-${getCharacterTheme().primary}-200`}>
                  <span className="text-lg">{getRankEmoji(entry.rank)}</span>
                </div>
                <div>
                  <p className={`font-medium ${getRankColor(entry.rank)}`}>
                    #{entry.rank} {entry.displayName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.tipCount} tip{entry.tipCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">
                  {(() => {
                    const currency = getCharacterCurrency(entry.totalAmount, character.key);
                    return `${currency.amount} ${currency.name} ${currency.icon}`;
                  })()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {getCharacterEmoji()} Tip {character.displayName} to climb the leaderboard and show your appreciation!
        </p>
      </div>
    </div>
  );
}