// components/EmailVerificationBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacter } from '@/lib/useCharacter';

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const character = useCharacter();
  const [isVisible, setIsVisible] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Show banner if user is logged in but email not confirmed
    if (user && !user.email_confirmed_at && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [user, isDismissed]);

  const handleResendVerification = async () => {
    if (!user?.email || !character) return;
    
    setIsResending(true);
    setResendMessage('');

    try {
      // Use the dedicated resend verification endpoint
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          characterKey: character.key,
          hostname: window.location.hostname
        })
      });

      const result = await response.json();

      if (response.ok) {
        setResendMessage('✅ Verification email sent! Check your inbox.');
      } else {
        setResendMessage(`❌ ${result.error || 'Failed to send email. Please try again.'}`);
      }
    } catch (error) {
      console.error('Failed to resend verification:', error);
      setResendMessage('❌ Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200 px-4 py-3 relative">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Please verify your email address
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Check your inbox for a verification link from {character?.displayName || 'us'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {resendMessage && (
            <span className={`text-xs ${resendMessage.includes('✅') ? 'text-green-700' : 'text-red-700'}`}>
              {resendMessage}
            </span>
          )}
          
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className="text-xs font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50"
          >
            {isResending ? 'Sending...' : 'Resend Email'}
          </button>

          <a
            href={`/recover?email=${encodeURIComponent(user?.email || '')}`}
            className="text-xs font-medium text-yellow-800 hover:text-yellow-900 underline"
          >
            Recovery Page
          </a>
          
          <button
            onClick={handleDismiss}
            className="ml-2 text-yellow-600 hover:text-yellow-800 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}