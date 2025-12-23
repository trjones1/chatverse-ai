'use client';

import React, { useState } from 'react';
import CryptoPricingModal from './CryptoPricingModal';

interface CryptoPaymentButtonProps {
  userId: string;
  characterKey: string;
  characterDisplayName: string;
  userEmail?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSavings?: boolean;
  defaultTab?: 'subscription' | 'voice_pack' | 'tip';
  // User's current subscription status
  hasBasicSubscription?: boolean;
  hasPremiumSubscription?: boolean;
  subscriptionExpiring?: boolean;
}

export default function CryptoPaymentButton({
  userId,
  characterKey,
  characterDisplayName,
  userEmail,
  className = '',
  size = 'lg',
  showSavings = true,
  defaultTab = 'subscription',
  hasBasicSubscription = false,
  hasPremiumSubscription = false,
  subscriptionExpiring = false
}: CryptoPaymentButtonProps) {
  const [showCryptoModal, setShowCryptoModal] = useState(false);

  const handleCryptoPayment = () => {
    setShowCryptoModal(true);
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  return (
    <>
      <button
        onClick={handleCryptoPayment}
        className={`
          bg-gradient-to-r from-orange-500 to-yellow-500
          hover:from-orange-600 hover:to-yellow-600
          text-white font-bold
          border-2 border-orange-400/50
          shadow-lg hover:shadow-xl
          transform hover:scale-105
          transition-all duration-300
          relative overflow-hidden
          ${sizeClasses[size]}
          ${className}
          rounded-xl
        `}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 animate-pulse opacity-20" />

        {/* Content */}
        <div className="relative flex items-center justify-center gap-2">
          <span className={`${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}`}>₿</span>
          <span className="font-semibold">
            Pay with Crypto
          </span>
          {showSavings && (
            <div className="flex items-center gap-1">
              <span className="text-xs">⚡</span>
              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                30% OFF
              </span>
            </div>
          )}
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-20 transform -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-1000" />
      </button>

      <CryptoPricingModal
        isOpen={showCryptoModal}
        onClose={() => setShowCryptoModal(false)}
        userId={userId}
        characterKey={characterKey}
        characterDisplayName={characterDisplayName}
        userEmail={userEmail}
        defaultTab={defaultTab}
        hasBasicSubscription={hasBasicSubscription}
        hasPremiumSubscription={hasPremiumSubscription}
        subscriptionExpiring={subscriptionExpiring}
      />
    </>
  );
}