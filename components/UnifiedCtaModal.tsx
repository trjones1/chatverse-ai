'use client';

import React, { useState, useEffect, useRef } from 'react';
import { openCheckout } from '@/lib/checkout';
import VerseCoinsButton from './VerseCoinsButton';

// Helper function to map ctaAction to VerseCoins variant
function getVerseCoinsVariantFromAction(ctaAction?: 'sub_sfw' | 'sub_nsfw' | 'voice_pack_10'): 'voice' | 'subscription' {
  switch (ctaAction) {
    case 'voice_pack_10':
      return 'voice';
    case 'sub_sfw':
    case 'sub_nsfw':
    default:
      return 'subscription';
  }
}

interface UnifiedCtaModalProps {
  isOpen: boolean;
  onClose: () => void;
  headline: string;
  body: string;
  cta: string;
  ctaAction?: 'sub_sfw' | 'sub_nsfw' | 'voice_pack_10';
  isAnonymous?: boolean;
  onTriggerLogin?: () => void;
  characterKey?: string;
  session?: any;
}

type ModalState = 'idle' | 'processing' | 'success' | 'error';

export default function UnifiedCtaModal({
  isOpen,
  onClose,
  headline,
  body,
  cta,
  ctaAction,
  isAnonymous,
  onTriggerLogin,
  characterKey,
  session
}: UnifiedCtaModalProps) {
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [error, setError] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get appropriate icon and gradient based on CTA action
  const getModalStyle = () => {
    // Hide NSFW marketing - treat as regular premium during Stripe review
    const hideNsfwMarketing = process.env.NEXT_PUBLIC_HIDE_NSFW_MARKETING === 'true';
    
    switch (ctaAction) {
      case 'sub_nsfw':
        return {
          icon: hideNsfwMarketing ? '💎' : '🔞',
          gradient: hideNsfwMarketing ? 'from-blue-500 to-indigo-500' : 'from-pink-500 to-rose-500',
          bgGradient: hideNsfwMarketing ? 'bg-gradient-to-br from-blue-500 to-indigo-500' : 'bg-gradient-to-br from-pink-500 to-rose-500',
          shadowColor: hideNsfwMarketing ? 'rgba(59,130,246,0.45)' : 'rgba(244,63,94,0.45)'
        };
      case 'voice_pack_10':
        return {
          icon: '🎤',
          gradient: 'from-violet-500 to-purple-500',
          bgGradient: 'bg-gradient-to-br from-violet-500 to-purple-500',
          shadowColor: 'rgba(139,69,193,0.45)'
        };
      case 'sub_sfw':
      default:
        return {
          icon: '💎',
          gradient: 'from-blue-500 to-indigo-500',
          bgGradient: 'bg-gradient-to-br from-blue-500 to-indigo-500',
          shadowColor: 'rgba(59,130,246,0.45)'
        };
    }
  };

  // Focus management and accessibility
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the modal
      modalRef.current?.focus();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Add escape key handler
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
        
        // Restore focus to previous element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
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

  const handleUpgrade = async () => {
    try {
      setError('');
      setModalState('processing');
      
      console.log('🔐 UnifiedCtaModal: Starting checkout process', {
        ctaAction,
        characterKey,
        isAnonymous,
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionUserEmail: session?.user?.email,
        localStorage_user_id: typeof window !== 'undefined' ? localStorage.getItem('user_id') : 'N/A'
      });
      
      // For NSFW upgrades, show age verification modal first
      if (ctaAction === 'sub_nsfw') {
        onClose(); // Close this modal first
        window.dispatchEvent(new Event('gate-nsfw'));
        return;
      }
      
      await openCheckout(ctaAction ?? 'sub_sfw', {
        character_key: characterKey,
        userId: typeof window !== 'undefined' ? (localStorage.getItem('user_id') ?? undefined) : undefined,
        session: session, // Pass the session to checkout
        successUrl: `${window.location.origin}/success?source=modal`,
        cancelUrl: `${window.location.origin}/chat`,
        onStart: () => {
          console.log('🔐 UnifiedCtaModal: Checkout onStart called');
          setModalState('processing');
        },
        onFinish: () => {
          console.log('🔐 UnifiedCtaModal: Checkout onFinish called');
          setModalState('success');
        },
      });
      
      // Show success state briefly before closing
      setTimeout(() => {
        setModalState('idle');
        onClose();
      }, 2000);
      
    } catch (e: any) {
      console.error('🔐 UnifiedCtaModal: Checkout failed', e);
      
      let errorMessage = e?.message || 'Failed to open checkout';
      
      // Provide more specific error messages
      if (errorMessage.includes('Authentication required')) {
        errorMessage = 'Please sign in first to make a purchase';
      } else if (errorMessage.includes('Missing Stripe price')) {
        errorMessage = 'Payment system configuration error. Please try again later.';
      } else if (errorMessage.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
      setModalState('error');
      
      // Auto-reset error state after longer delay for errors
      setTimeout(() => {
        setModalState('idle');
        setError('');
      }, 5000); // Increased timeout for error messages
    }
  };

  const handleSecondaryAction = () => {
    onClose();
    if (isAnonymous && onTriggerLogin) {
      onTriggerLogin();
    }
  };

  if (!isOpen) return null;

  const style = getModalStyle();

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal-backdrop)' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl relative"
        style={{ zIndex: 'var(--z-modal-content)' }}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="text-center">
          {/* Icon with gradient background */}
          <div 
            className={`w-20 h-20 mx-auto mb-4 rounded-full ${style.bgGradient} flex items-center justify-center shadow-lg`}
            style={{ boxShadow: `0 10px 25px -10px ${style.shadowColor}` }}
          >
            <span className="text-3xl">{style.icon}</span>
          </div>
          
          {/* Dynamic headline based on modal state */}
          <h2 id="modal-title" className="text-xl font-semibold mb-2">
            {modalState === 'processing' ? 'Opening checkout...' :
             modalState === 'success' ? 'Success!' :
             modalState === 'error' ? 'Oops!' :
             headline}
          </h2>

          {/* Dynamic body content */}
          <p id="modal-description" className="text-gray-600 text-sm mb-4">
            {modalState === 'processing' ? 'Please wait while we redirect you to checkout.' :
             modalState === 'success' ? 'Redirecting you to complete your purchase!' :
             modalState === 'error' ? (error || 'Something went wrong. Please try again.') :
             body}
          </p>

          {/* Processing indicator */}
          {modalState === 'processing' && (
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          )}

          {/* Error state */}
          {modalState === 'error' && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Action buttons - only show in idle state */}
        {modalState === 'idle' && (
          <div className="space-y-3">
            {/* VerseCoins payment option - now primary */}
            {!isAnonymous && characterKey && session?.user?.id ? (
              <VerseCoinsButton
                userId={session.user.id}
                characterKey={characterKey}
                characterDisplayName={characterKey.charAt(0).toUpperCase() + characterKey.slice(1)}
                className="w-full"
                variant={getVerseCoinsVariantFromAction(ctaAction)}
                defaultTab="spend"
              />
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <p className="text-orange-800 text-sm font-medium mb-2">
                  💼 Sign in required
                </p>
                <p className="text-orange-700 text-xs">
                  Please sign in to use VerseCoins for upgrades
                </p>
              </div>
            )}

            {/* Secondary action */}
            <button
              onClick={handleSecondaryAction}
              data-testid="cta-secondary-button"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium min-h-[44px]"
              aria-label={isAnonymous ? 'Sign in to your account' : 'Close modal'}
            >
              {isAnonymous ? 'Sign In' : 'Not now'}
            </button>
          </div>
        )}

        {/* Success/Error states show auto-closing message */}
        {(modalState === 'success' || modalState === 'error') && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {modalState === 'success' ? 'Closing automatically...' : 'Resetting...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}