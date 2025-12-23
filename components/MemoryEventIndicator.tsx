// components/MemoryEventIndicator.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { type CharacterConfig } from '@/lib/characters.config';

export interface MemoryEvent {
  id: string;
  type: 'emotional' | 'memory' | 'episode';
  character: string;
  message: string;
  icon: string;
  color: string;
  value?: number; // For emotional deltas like +2, -1
  timestamp: Date;
}

interface MemoryEventIndicatorProps {
  character: CharacterConfig;
  events: MemoryEvent[];
  onEventComplete: (eventId: string) => void;
}

// Character-specific icons and colors
const getCharacterTheme = (characterKey: string) => {
  const themes = {
    lexi: { 
      primary: '#FF1493', 
      gradient: 'from-pink-500 to-fuchsia-500',
      icons: { heart: '💋', trust: '✨', jealousy: '😤', memory: '💭' }
    },
    nyx: { 
      primary: '#800080', 
      gradient: 'from-purple-600 to-indigo-600',
      icons: { heart: '🖤', trust: '🔮', jealousy: '⚡', memory: '🌙' }
    },
    aiko: { 
      primary: '#FF69B4', 
      gradient: 'from-pink-400 to-rose-400',
      icons: { heart: '🌸', trust: '✨', jealousy: '😾', memory: '🎀' }
    },
    chloe: { 
      primary: '#F0E68C', 
      gradient: 'from-yellow-300 to-pink-300',
      icons: { heart: '🎀', trust: '📚', jealousy: '🥺', memory: '💝' }
    },
    zaria: { 
      primary: '#FFD700', 
      gradient: 'from-yellow-400 to-orange-400',
      icons: { heart: '✨', trust: '💎', jealousy: '🔥', memory: '👑' }
    },
    nova: { 
      primary: '#00FFFF', 
      gradient: 'from-cyan-400 to-blue-400',
      icons: { heart: '🌟', trust: '🚀', jealousy: '⚡', memory: '💫' }
    }
  };
  return themes[characterKey as keyof typeof themes] || themes.lexi;
};

const MemoryEventIndicator: React.FC<MemoryEventIndicatorProps> = ({ 
  character, 
  events, 
  onEventComplete 
}) => {
  const [visibleEvents, setVisibleEvents] = useState<MemoryEvent[]>([]);
  const theme = getCharacterTheme(character.key);

  useEffect(() => {
    // Show new events with staggered animation
    events.forEach((event, index) => {
      setTimeout(() => {
        setVisibleEvents(prev => {
          if (prev.find(e => e.id === event.id)) return prev;
          return [...prev, event];
        });

        // Auto-hide after 4 seconds
        setTimeout(() => {
          setVisibleEvents(prev => prev.filter(e => e.id !== event.id));
          onEventComplete(event.id);
        }, 4000);
      }, index * 300); // Stagger by 300ms
    });
  }, [events, onEventComplete]);

  if (visibleEvents.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      {visibleEvents.map((event) => (
        <div
          key={event.id}
          className={`
            bg-white/90 backdrop-blur-sm border-2 rounded-xl px-4 py-3 shadow-lg
            transform transition-all duration-500 ease-out
            animate-[slideInRight_0.5s_ease-out,pulse_2s_infinite]
            max-w-xs
          `}
          style={{ borderColor: theme.primary }}
        >
          <div className="flex items-center space-x-3">
            {/* Character-specific icon */}
            <div 
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                bg-gradient-to-r ${theme.gradient}
                shadow-lg animate-bounce
              `}
            >
              {event.icon}
            </div>
            
            {/* Event message */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">
                {event.message}
              </div>
              
              {/* Value indicator for emotional changes */}
              {event.value && (
                <div className={`text-xs font-bold ${event.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {event.value > 0 ? '+' : ''}{event.value}
                </div>
              )}
              
              {/* Character name */}
              <div className="text-xs text-gray-500 capitalize">
                {character.displayName || character.name}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default MemoryEventIndicator;