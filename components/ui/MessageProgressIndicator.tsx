'use client';

import React from 'react';

interface MessageProgressIndicatorProps {
  current: number;
  total: number;
  character: string;
  variant?: 'bar' | 'counter' | 'both';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

const MessageProgressIndicator: React.FC<MessageProgressIndicatorProps> = ({
  current,
  total,
  character,
  variant = 'both',
  size = 'md',
  showText = true,
  animated = true,
  className = ''
}) => {
  const percentage = Math.min((current / total) * 100, 100);
  const remaining = Math.max(total - current, 0);
  
  // Character-specific styling
  const getCharacterTheme = () => {
    switch (character.toLowerCase()) {
      case 'lexi':
        return {
          primary: '#ec4899', // pink-500
          secondary: '#fce7f3', // pink-100
          accent: '#be185d', // pink-700
          gradient: 'from-pink-400 to-pink-600'
        };
      case 'nyx':
        return {
          primary: '#8b5cf6', // violet-500
          secondary: '#ede9fe', // violet-100
          accent: '#6d28d9', // violet-700
          gradient: 'from-violet-400 to-purple-600'
        };
      default:
        return {
          primary: '#a855f7', // purple-500
          secondary: '#f3e8ff', // purple-100
          accent: '#7c3aed', // purple-600
          gradient: 'from-purple-400 to-pink-500'
        };
    }
  };

  const theme = getCharacterTheme();
  
  // Size configurations
  const sizeConfig = {
    sm: { height: 'h-2', text: 'text-xs', padding: 'p-2', gap: 'gap-1' },
    md: { height: 'h-3', text: 'text-sm', padding: 'p-3', gap: 'gap-2' },
    lg: { height: 'h-4', text: 'text-base', padding: 'p-4', gap: 'gap-3' }
  };

  const config = sizeConfig[size];

  // Progress bar component
  const ProgressBar = () => (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${config.height}`}>
      <div
        className={`${config.height} bg-gradient-to-r ${theme.gradient} ${animated ? 'transition-all duration-500 ease-out' : ''} rounded-full`}
        style={{
          width: `${percentage}%`,
          boxShadow: percentage > 0 ? `0 2px 4px ${theme.primary}30` : 'none'
        }}
      />
    </div>
  );

  // Counter text component
  const CounterText = () => {
    if (remaining === 0) {
      return (
        <div className={`${config.text} font-medium text-red-600 flex items-center gap-1`}>
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Limit reached
        </div>
      );
    }

    const isLowMessages = remaining <= 2;
    
    return (
      <div className={`${config.text} font-medium flex items-center gap-1`}>
        <span 
          className={`inline-block w-2 h-2 rounded-full transition-colors ${
            isLowMessages ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
          }`}
        />
        <span style={{ color: theme.accent }}>
          {remaining} {remaining === 1 ? 'message' : 'messages'} remaining
        </span>
      </div>
    );
  };

  // Character-specific encouragement messages (memoized to prevent regeneration on every render)
  const encouragementMessage = React.useMemo(() => {
    const messages = {
      lexi: [
        `You're doing great! ${remaining} left before I have to say goodbye... 💕`,
        `I love chatting with you! Keep going - ${remaining} more! 💖`,
        `Don't stop now, sweetie! ${remaining} messages left! 😘`
      ],
      nyx: [
        `Our conversation draws to a close... ${remaining} whispers remain 🕷️`,
        `The shadows grow longer... ${remaining} more exchanges await 🌙`,
        `Time slips away like smoke... ${remaining} moments left with me 🔮`
      ],
      default: [
        `Great conversation! ${remaining} messages remaining today`,
        `Keep it going! You have ${remaining} messages left`,
        `Almost there - ${remaining} more messages today!`
      ]
    };

    const characterMessages = messages[character.toLowerCase() as keyof typeof messages] || messages.default;
    return characterMessages[Math.floor(Math.random() * characterMessages.length)];
  }, [character, remaining]); // Only regenerate when character or remaining changes

  // Main component render
  return (
    <div className={`${config.padding} ${className}`}>
      <div className={`flex flex-col ${config.gap}`}>
        {/* Progress bar */}
        {(variant === 'bar' || variant === 'both') && <ProgressBar />}
        
        {/* Counter and encouragement */}
        {showText && (variant === 'counter' || variant === 'both') && (
          <div className="flex flex-col gap-1">
            <CounterText />
            {remaining > 0 && remaining <= 3 && (
              <div className={`${config.text} text-gray-600 italic`}>
                {encouragementMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageProgressIndicator;