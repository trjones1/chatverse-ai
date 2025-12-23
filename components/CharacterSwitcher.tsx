'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCharacterConfig } from '@/lib/characters.config';

export interface UserCharacterInfo {
  character_key: string;
  subscription_tier: string;
  subscription_status: string;
  settings: Record<string, any>;
  granted_at: string;
}

interface CharacterSwitcherProps {
  currentCharacter: string;
  onCharacterChange?: (characterKey: string) => void;
  className?: string;
}

export default function CharacterSwitcher({ 
  currentCharacter, 
  onCharacterChange,
  className = '' 
}: CharacterSwitcherProps) {
  const { user } = useAuth();
  const [userCharacters, setUserCharacters] = useState<UserCharacterInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserCharacters = async () => {
      try {
        const response = await fetch('/api/user/characters');
        const data = await response.json();
        
        if (data.success) {
          setUserCharacters(data.characters);
        } else {
          console.error('Error fetching user characters:', data.error);
        }
      } catch (error) {
        console.error('Error fetching user characters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCharacters();
  }, [user]);

  if (loading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  if (userCharacters.length <= 1) {
    // Don't show switcher if user only has access to one character
    return null;
  }

  const handleCharacterClick = (characterKey: string) => {
    if (characterKey === currentCharacter) return;
    
    // Navigate to the character's primary domain
    const domainMappings: Record<string, string> = {
      'lexi': 'chatwithlexi.com',
      'chase': 'fuckboychase.com', 
      'aiko': 'waifuwithaiko.com',
      'dom': 'sirdominic.com',
      'nyx': 'talktonyx.com'
    };
    
    const domain = domainMappings[characterKey];
    if (domain) {
      window.location.href = `https://${domain}`;
    }
    
    onCharacterChange?.(characterKey);
  };

  return (
    <div className={`character-switcher ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Your Characters</h3>
      <div className="flex flex-wrap gap-3">
        {userCharacters.map((charAccess) => {
          const config = getCharacterConfig(charAccess.character_key);
          const isActive = charAccess.character_key === currentCharacter;
          
          if (!config) return null;
          
          return (
            <button
              key={charAccess.character_key}
              onClick={() => handleCharacterClick(charAccess.character_key)}
              className={`
                relative group flex flex-col items-center p-3 rounded-lg border-2 transition-all
                ${isActive 
                  ? 'border-purple-500 bg-purple-50 shadow-lg' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}
              disabled={isActive}
            >
              {/* Character Avatar */}
              <div className={`
                w-12 h-12 rounded-full overflow-hidden mb-2 ring-2 transition-all flex items-center justify-center text-lg font-bold
                ${isActive ? 'ring-purple-500 bg-purple-100 text-purple-700' : 'ring-gray-300 bg-gray-100 text-gray-600 group-hover:ring-gray-400'}
              `}>
                {config.displayName.charAt(0)}
              </div>
              
              {/* Character Name */}
              <span className={`
                text-xs font-medium transition-colors
                ${isActive ? 'text-purple-700' : 'text-gray-600 group-hover:text-gray-800'}
              `}>
                {config.displayName}
              </span>
              
              {/* Subscription Tier Badge */}
              {charAccess.subscription_tier !== 'free' && 
               charAccess.character_key !== 'dom' && 
               charAccess.character_key !== 'nyx' && (
                <span className={`
                  absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold rounded-full
                  ${charAccess.subscription_tier === 'premium' 
                    ? 'bg-gold text-black' 
                    : 'bg-blue-500 text-white'
                  }
                `}>
                  {charAccess.subscription_tier === 'premium' ? '★' : 'PRO'}
                </span>
              )}
              
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg bg-purple-500 bg-opacity-10 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Add New Character CTA */}
      <button 
        className="
          mt-4 w-full py-2 px-4 border-2 border-dashed border-gray-300 
          rounded-lg text-gray-500 text-sm hover:border-gray-400 hover:text-gray-600 
          transition-colors flex items-center justify-center gap-2
        "
        onClick={() => {
          // Could open a modal or redirect to character selection
          window.open('https://chatwithlexi.com', '_blank');
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Explore More Characters
      </button>
    </div>
  );
}