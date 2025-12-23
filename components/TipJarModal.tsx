'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCharacter } from '@/lib/useCharacter';
import { trackModal } from '@/lib/analytics';
import { useAuthState } from '@/hooks/useAuthState';

interface TipJarModalProps {
  isOpen: boolean;
  onClose: () => void;
}


export default function TipJarModal({ isOpen, onClose }: TipJarModalProps) {
  const character = useCharacter();
  const authState = useAuthState();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track modal open/close events
  React.useEffect(() => {
    if (isOpen) {
      trackModal('open', 'tip_jar', character.key);
    }
  }, [isOpen, character.key]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      trackModal('close', 'tip_jar', character.key);
      onClose();
    }
  };

  const handleCloseClick = () => {
    trackModal('close', 'tip_jar', character.key);
    onClose();
  };


  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4 overflow-y-auto"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        zIndex: 99999
      }}
    >
      <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full my-4 sm:my-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl mx-auto relative">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-100 z-10">
          <h2 className="text-xl font-bold">
            💖 Tip {character.displayName}
          </h2>
          <button
            onClick={handleCloseClick}
            className="text-gray-400 hover:text-gray-600 text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 text-sm mb-4">
            Show your appreciation for {character.displayName}! Tips help support development and show up on the monthly leaderboard.
          </p>

          {/* VerseCoins tip option */}
          {authState.user?.id ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-xl text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⭐</span>
                  <span className="font-semibold text-lg">Send VerseCoins Tips!</span>
                </div>
                <p className="text-white/90 text-sm mb-3">
                  Use VerseCoins to tip {character.displayName} and show your appreciation!
                </p>
                <div className="bg-white/20 rounded-lg p-3 mb-3">
                  <div className="text-white/90 text-sm">
                    <div>💰 Small tip: 50 VerseCoins ($0.50)</div>
                    <div>💝 Medium tip: 100 VerseCoins ($1.00)</div>
                    <div>🌟 Large tip: 250 VerseCoins ($2.50)</div>
                    <div>🎉 Amazing tip: 1000+ VerseCoins ($10.00+)</div>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full bg-white text-blue-600 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Get VerseCoins →
                </button>
              </div>

              <p className="text-blue-600 text-xs text-center">
                💡 Set your leaderboard name in your Dashboard → Preferences
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-blue-800 font-medium mb-2">
                💼 Sign in required
              </p>
              <p className="text-blue-700 text-sm">
                Please sign in to send VerseCoins tips!
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleCloseClick}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Render modal at document root using portal */}
      {createPortal(modalContent, document.body)}
    </>
  );
}