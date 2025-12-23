'use client';

import { useEffect, useState } from 'react';
import { useCharacter } from '@/lib/useCharacter';
import { IoClose } from 'react-icons/io5';

interface ReturnVisitorWelcomeProps {
  onDismiss: () => void;
  show: boolean;
}

export default function ReturnVisitorWelcome({ onDismiss, show }: ReturnVisitorWelcomeProps) {
  const character = useCharacter();
  const characterName = character?.displayName || 'me';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Slight delay for animation
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  if (!show) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  };

  const handleContinue = () => {
    handleDismiss();
    // Scroll to chat input or focus it
    const chatInput = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement;
    if (chatInput) {
      chatInput.focus();
      chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Welcome Banner */}
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-auto px-4 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full transition-colors z-10"
            aria-label="Close"
          >
            <IoClose className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="relative z-10">
            <div className="text-4xl mb-3">👋</div>
            <h3 className="text-2xl font-bold mb-2">You came back! 😊</h3>
            <p className="text-white/90 text-sm mb-4">
              I remember you. Want to pick up where we left off?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleContinue}
                className="flex-1 bg-white text-purple-600 font-semibold py-3 px-4 rounded-xl hover:bg-purple-50 transition-colors shadow-lg"
              >
                Continue Chat 💬
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-3 text-white/90 hover:text-white text-sm font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
