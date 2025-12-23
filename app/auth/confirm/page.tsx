// app/auth/confirm/page.tsx
// Custom email confirmation handler

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      if (!searchParams) {
        setStatus('error');
        setMessage('Invalid confirmation link. Please try signing up again.');
        return;
      }

      const token = searchParams.get('token');
      const email = searchParams.get('email');

      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid confirmation link. Please try signing up again.');
        return;
      }

      try {
        const supabase = createClient();
        
        // Decode the token to get user ID
        const decodedToken = atob(token);
        const [userId, timestamp] = decodedToken.split(':');
        
        // Check if token is expired (24 hours)
        const tokenTime = parseInt(timestamp);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (now - tokenTime > twentyFourHours) {
          setStatus('error');
          setMessage('Confirmation link has expired. Please sign up again.');
          return;
        }

        // Update user's email confirmation status
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true
        });

        if (error) {
          // Try alternative confirmation method
          const { error: confirmError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
          });

          if (confirmError) {
            console.error('Confirmation error:', confirmError);
            setStatus('error');
            setMessage('Failed to confirm email. Please contact support.');
            return;
          }
        }

        setStatus('success');
        setMessage('Email confirmed successfully! Redirecting...');
        
        // Redirect to chat after a brief delay
        setTimeout(() => {
          router.push('/chat');
        }, 2000);

      } catch (error) {
        console.error('Confirmation process error:', error);
        setStatus('error');
        setMessage('An error occurred during confirmation. Please try again.');
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Confirmation
          </h2>
          
          {status === 'loading' && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Confirming your email...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mt-4">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-12 h-12 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="mt-2 text-sm text-green-600 font-medium">{message}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-4">
              <div className="rounded-full bg-red-100 p-3 mx-auto w-12 h-12 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <p className="mt-2 text-sm text-red-600">{message}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Email Confirmation
            </h2>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}