// components/FoundersCircle.tsx
'use client';

import { useEffect, useState } from 'react';
import { useCharacterKey } from '@/lib/useCharacter';
import { FiStar, FiUsers, FiClock } from 'react-icons/fi';

interface FounderStatus {
  is_founder: boolean;
  founder_number: number | null;
  subscription_created_at: string | null;
  bonus_versecoins: number;
  character_stats: {
    character_key: string;
    founder_count: number;
    spots_remaining: number;
    is_available: boolean;
  };
}

const FoundersCircle: React.FC = () => {
  const characterKey = useCharacterKey();
  const [founderStatus, setFounderStatus] = useState<FounderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFounderStatus = async () => {
      try {
        const response = await fetch(`/api/founders-circle?character=${characterKey}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            // User not logged in - skip showing founder status
            setLoading(false);
            return;
          }
          throw new Error('Failed to load founder status');
        }
        
        const data = await response.json();
        setFounderStatus(data);
      } catch (err) {
        console.error('Error loading founder status:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    loadFounderStatus();
  }, [characterKey]);

  if (loading || error || !founderStatus) {
    return null; // Don't show anything if not loaded or error
  }

  const { is_founder, founder_number, character_stats } = founderStatus;
  const { founder_count, spots_remaining, is_available } = character_stats;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/60 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <FiStar className="w-5 h-5 text-amber-500" />
        <h3 className="font-medium">Founders' Circle</h3>
      </div>
      
      {is_founder ? (
        // User is a founder
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                #{founder_number}
              </div>
              <div>
                <div className="font-semibold text-amber-900">Founder #{founder_number}</div>
                <div className="text-sm text-amber-700">Locked pricing for life + 500 VerseCoins bonus</div>
              </div>
            </div>
            <FiStar className="w-6 h-6 text-amber-500" />
          </div>
          
          <div className="text-xs text-gray-600 flex items-center gap-2">
            <FiUsers className="w-4 h-4" />
            <span>{founder_count}/100 founders enrolled</span>
          </div>
        </div>
      ) : is_available ? (
        // Spots still available
        <div className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <FiClock className="w-5 h-5 text-blue-500" />
              <div className="font-semibold text-blue-900">Limited Time Opportunity</div>
            </div>
            <div className="text-sm text-blue-700 mb-3">
              Join the first 100 subscribers and get:
            </div>
            <ul className="text-sm text-blue-700 space-y-1 ml-4">
              <li>• Locked pricing for life</li>
              <li>• 500 VerseCoins bonus</li>
              <li>• Exclusive founder badge</li>
            </ul>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <FiUsers className="w-4 h-4" />
              <span>{spots_remaining} spots remaining</span>
            </div>
            <div className="text-blue-600 font-medium">
              {founder_count}/100 enrolled
            </div>
          </div>
        </div>
      ) : (
        // All spots taken
        <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <FiUsers className="w-5 h-5 text-gray-500" />
            <div className="font-semibold text-gray-700">Founders' Circle Full</div>
          </div>
          <div className="text-sm text-gray-600">
            All 100 founder spots have been claimed. Thank you to our founding supporters!
          </div>
        </div>
      )}
    </div>
  );
};

export default FoundersCircle;