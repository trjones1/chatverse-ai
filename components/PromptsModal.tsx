'use client';

import React, { useEffect, useRef } from 'react';
import SuggestedPrompts from './SuggestedPrompts';

interface PromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterKey: string;
  onPromptSelect: (prompt: string) => void;
}

export default function PromptsModal({
  isOpen,
  onClose,
  characterKey,
  onPromptSelect
}: PromptsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Focus trap within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  };

  // Handle prompt selection
  const handlePromptSelect = (prompt: string) => {
    onPromptSelect(prompt);
    onClose(); // Close modal after selecting a prompt
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal-backdrop, 50)' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompts-modal-title"
      aria-describedby="prompts-modal-description"
    >
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl relative"
        style={{ zIndex: 'var(--z-modal-content, 51)' }}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="prompts-modal-title" className="text-xl font-semibold text-white">
              💬 Conversation Starters
            </h2>
            <p id="prompts-modal-description" className="text-sm text-gray-400 mt-1">
              Choose a prompt to start your conversation
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            aria-label="Close prompts modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Prompts content */}
        <SuggestedPrompts
          characterKey={characterKey}
          onPromptSelect={handlePromptSelect}
          className="text-white"
        />
      </div>
    </div>
  );
}