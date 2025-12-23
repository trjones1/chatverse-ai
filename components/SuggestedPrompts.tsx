'use client';

import React from 'react';

interface SuggestedPromptsProps {
  characterKey: string;
  onPromptSelect: (prompt: string) => void;
  className?: string;
}

export default function SuggestedPrompts({
  characterKey,
  onPromptSelect,
  className = ''
}: SuggestedPromptsProps) {

  // Character-specific conversation starters
  const promptSets = {
    lexi: [
      { emoji: '📸', text: 'Send me a selfie', category: 'request' },
      { emoji: '💕', text: 'How are you feeling today?', category: 'casual' },
      { emoji: '😘', text: 'You look amazing', category: 'flirty' },
      { emoji: '🎮', text: 'Want to play a game?', category: 'playful' },
      { emoji: '🌟', text: 'Tell me something about yourself', category: 'personal' },
      { emoji: '💭', text: 'What are you thinking about?', category: 'intimate' }
    ],
    nyx: [
      { emoji: '🌙', text: 'Show me your dark side', category: 'request' },
      { emoji: '🖤', text: 'What mysteries do you hold?', category: 'mysterious' },
      { emoji: '😈', text: 'Are you feeling wicked today?', category: 'flirty' },
      { emoji: '🔮', text: 'Read my mind', category: 'playful' },
      { emoji: '💜', text: 'Share your deepest thoughts', category: 'intimate' },
      { emoji: '🌌', text: 'Tell me about the darkness', category: 'personal' }
    ],
    default: [
      { emoji: '📷', text: 'Send me a picture', category: 'request' },
      { emoji: '💖', text: 'How are you doing?', category: 'casual' },
      { emoji: '😊', text: 'You seem lovely', category: 'flirty' },
      { emoji: '🎯', text: 'Let\'s chat about something fun', category: 'playful' },
      { emoji: '✨', text: 'What makes you happy?', category: 'personal' },
      { emoji: '💫', text: 'What\'s on your mind?', category: 'intimate' }
    ]
  };

  const prompts = promptSets[characterKey as keyof typeof promptSets] || promptSets.default;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          💬 Conversation starters
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptSelect(prompt.text)}
            className="group relative bg-gray-800/50 hover:bg-gray-700/70 border border-gray-700 hover:border-gray-600 rounded-lg p-3 text-left transition-all duration-200 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg flex-shrink-0">{prompt.emoji}</span>
              <span className="text-sm text-gray-300 group-hover:text-white">
                {prompt.text}
              </span>
            </div>

            {/* Category indicator */}
            <div className="absolute top-2 right-2">
              <div className={`w-2 h-2 rounded-full ${
                prompt.category === 'request' ? 'bg-pink-500' :
                prompt.category === 'flirty' ? 'bg-red-500' :
                prompt.category === 'playful' ? 'bg-yellow-500' :
                prompt.category === 'intimate' ? 'bg-purple-500' :
                prompt.category === 'mysterious' ? 'bg-indigo-500' :
                'bg-blue-500'
              }`}></div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick tip */}
      <div className="text-center mt-4">
        <p className="text-xs text-gray-500">
          💡 Tip: Ask for photos to build your gallery
        </p>
      </div>
    </div>
  );
}