'use client';

import React, { useState } from 'react';
import VerseCoinsModal from './VerseCoinsModal';
import { getCharacterCurrency } from '@/lib/verseCoins';
import { trackPremiumCTAClick } from '@/lib/metaPixel';

interface VerseCoinsButtonProps {
  userId: string;
  characterKey: string;
  characterDisplayName: string;
  className?: string;
  defaultTab?: 'purchase' | 'spend' | 'redeem' | 'balance';
  children?: React.ReactNode;
  variant?: 'upgrade' | 'voice' | 'subscription' | 'tip';
  onMessageAdded?: (message: any) => void;
}

export default function VerseCoinsButton({
  userId,
  characterKey,
  characterDisplayName,
  className = '',
  defaultTab = 'purchase',
  children,
  variant = 'upgrade',
  onMessageAdded
}: VerseCoinsButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const characterCurrency = getCharacterCurrency(0, characterKey);

  const getButtonContent = () => {
    if (children) return children;

    switch (variant) {
      case 'voice':
        return (
          <>
            <span className="mr-2">🎤</span>
            Get {characterCurrency.name}
          </>
        );
      case 'subscription':
        return (
          <>
            <span className="mr-2">👑</span>
            Unlock Premium+ All Access
          </>
        );
      case 'tip':
        return (
          <>
            <span className="mr-2">💕</span>
            Send Tips & Gifts
          </>
        );
      default:
        return (
          <>
            <span className="mr-2">{characterCurrency.icon}</span>
            Get {characterCurrency.name}
          </>
        );
    }
  };

  const getDefaultClassName = () => {
    const baseClasses = 'inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ease-in-out cursor-pointer select-none';

    switch (variant) {
      case 'voice':
        return `${baseClasses} bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transform hover:scale-105`;
      case 'subscription':
        return `${baseClasses} w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 text-white shadow-xl hover:shadow-2xl transform hover:scale-[1.02] border border-purple-400/30 hover:border-pink-400/50 px-8 py-4 text-base font-bold`;
      case 'tip':
        return `${baseClasses} bg-pink-600 hover:bg-pink-700 text-white shadow-md hover:shadow-lg transform hover:scale-105`;
      default:
        return `${baseClasses} bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-purple-400/20 hover:border-purple-300/40 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700`;
    }
  };

  return (
    <>
      <button
        onClick={() => {
          // Track Meta Pixel CTA click
          const tierType = variant === 'subscription' ? 'nsfw' : variant === 'voice' ? undefined : 'sfw';
          trackPremiumCTAClick(characterKey, `versecoins_button_${variant}`, tierType);

          setModalOpen(true);
        }}
        className={className ? `${getDefaultClassName()} ${className}` : getDefaultClassName()}
      >
        {getButtonContent()}
      </button>

      <VerseCoinsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        characterKey={characterKey}
        characterDisplayName={characterDisplayName}
        defaultTab={defaultTab}
        onMessageAdded={onMessageAdded}
      />
    </>
  );
}