'use client';

import { useEffect, useState } from 'react';
import { useCharacter } from '@/lib/useCharacter';
import { useAuth } from '@/contexts/AuthContext';
import { IoChatbubbleEllipses, IoSave, IoClose } from 'react-icons/io5';

interface IdleDetectionPromptProps {
  onDismiss: () => void;
  show: boolean;
  hasMessages?: boolean;
}

export default function IdleDetectionPrompt({
  onDismiss,
  show,
  hasMessages = false
}: IdleDetectionPromptProps) {
  const character = useCharacter();
  const { user } = useAuth();
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
    // Focus chat input
    const chatInput = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement;
    if (chatInput) {
      chatInput.focus();
    }
  };

  const handleSaveConversation = () => {
    handleDismiss();
    // Open login modal if not logged in
    if (!user) {
      document.body.dataset.modal = 'open';
      window.dispatchEvent(new Event('modal-open'));
      window.dispatchEvent(new Event('open-login'));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Idle Prompt */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-auto px-4 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-purple-200 dark:border-purple-700 p-5 relative">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Close"
          >
            <IoClose className="w-4 h-4 text-gray-500" />
          </button>

          {/* Content */}
          <div className="pr-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">🤔</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Still there?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You've been quiet for a bit...
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleContinue}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
              >
                <IoChatbubbleEllipses className="w-4 h-4" />
                Continue Chat
              </button>

              {!user && hasMessages && (
                <button
                  onClick={handleSaveConversation}
                  className="flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border-2 border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-300 font-semibold py-3 px-4 rounded-xl hover:bg-purple-50 dark:hover:bg-gray-600 transition-all shadow-md"
                  title="Sign up to save this conversation"
                >
                  <IoSave className="w-4 h-4" />
                </button>
              )}
            </div>

            {!user && hasMessages && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                Sign up free to save your conversations
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
