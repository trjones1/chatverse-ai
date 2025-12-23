// app/recover/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCharacter } from '@/lib/useCharacter';

function RecoveryForm() {
  const searchParams = useSearchParams();
  const character = useCharacter();
  const [email, setEmail] = useState(searchParams?.get('email') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          characterKey: character?.key || 'lexi',
          hostname: window.location.hostname
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Verification email sent to ${email}! Check your inbox for a message from ${result.character}. Your conversations will be restored once you verify.`);
        setMessageType('success');
      } else {
        setMessage(`❌ ${result.error || 'Failed to send verification email'}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Recovery error:', error);
      setMessage('❌ Something went wrong. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTransfer = async () => {
    if (!email) return;

    setIsLoading(true);
    setMessage('Attempting to recover conversations...');
    setMessageType('');

    try {
      // Try to trigger memory transfer manually
      const response = await fetch('/api/migrate/transfer-all-memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromUserId: localStorage.getItem('anonymous_user_id') || `anon-${Date.now()}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Memory transfer completed! Transferred memories for: ${result.charactersTransferred?.join(', ') || 'current character'}`);
        setMessageType('success');
      } else {
        const error = await response.text();
        setMessage(`❌ Memory transfer failed: ${error}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Manual transfer error:', error);
      setMessage('❌ Manual transfer failed. Please verify your email first.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Recover Your {character?.displayName || 'Account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Didn't receive your verification email from {character?.displayName || 'us'}? Lost your conversations? We can help!
          </p>
        </div>
        
        <div className="bg-white shadow-xl rounded-lg p-6 space-y-6">
          <form onSubmit={handleResendVerification} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Recovering account for: <strong>{character?.displayName || 'Unknown Character'}</strong>
              </p>
              <p className="text-xs text-gray-600">
                Detected from domain: {typeof window !== 'undefined' ? window.location.hostname : 'loading...'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                '📧'
              )}
              {isLoading ? 'Sending...' : `Resend Verification Email from ${character?.displayName || 'Character'}`}
            </button>
          </form>

          {/* Manual Recovery Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Already Verified?</h3>
            <p className="text-sm text-gray-600 mb-4">
              If your email is verified but you're missing {character?.displayName || 'conversations'} conversations, try manual recovery:
            </p>
            <button
              onClick={handleManualTransfer}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              🔄 Recover Lost Conversations
            </button>
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${
              messageType === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <p className="text-sm whitespace-pre-line">{message}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Recovery Steps:</h4>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. Enter your email address (character detected from domain)</li>
              <li>2. Click "Resend Verification Email" to get a new verification link from {character?.displayName}</li>
              <li>3. Check your email (including spam folder) for the verification message</li>
              <li>4. Click the verification link in the email</li>
              <li>5. Your {character?.displayName} conversations will be automatically restored!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <RecoveryForm />
    </Suspense>
  );
}