// components/ChatLayout.tsx - Simple chat layout (iMessage style)
"use client";

import React from 'react';
import ChatBox from './ChatBox';
import { type CharacterConfig } from '@/lib/characters.config';

interface ChatLayoutProps {
  config: CharacterConfig;
  onTriggerLogin: () => void;
  onEmoteChange: (src: string) => void;
  nsfwMode: boolean;
  isAnonymous?: boolean;
  // Gallery and Prompts functionality
  onShowGallery?: () => void;
  onTogglePrompts?: () => void;
  showPrompts?: boolean;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  config,
  onTriggerLogin,
  onEmoteChange,
  nsfwMode,
  isAnonymous,
  // Gallery and Prompts functionality
  onShowGallery,
  onTogglePrompts,
  showPrompts
}) => {
  return (
    <div className="h-full w-full">
      {/* Simple Chat Interface - iMessage style */}
      <ChatBox
        config={config}
        onTriggerLogin={onTriggerLogin}
        onEmoteChange={onEmoteChange}
        nsfwMode={nsfwMode}
        isAnonymous={isAnonymous}
        onShowGallery={onShowGallery}
        onTogglePrompts={onTogglePrompts}
        showPrompts={showPrompts}
      />
    </div>
  );
};

export default ChatLayout;