'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/hooks/useAuthState';

export default function ClaimPurchasePage() {
  const [gumroadEmail, setGumroadEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const authState = useAuthState();
  const router = useRouter();

  const handleClaimPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authState.user) {
      setMessage({ type: 'error', text: 'Please log in to claim purchases' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/gumroad/claim-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gumroadEmail: gumroadEmail.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to claim purchase' });
        return;
      }

      if (data.claimed > 0) {
        setMessage({
          type: 'success',
          text: `Successfully claimed ${data.claimed} purchase(s)! You received ${data.totalCredits} VerseCoins.`
        });

        // Redirect to chat after 3 seconds
        setTimeout(() => {
          router.push('/chat');
        }, 3000);
      } else {
        setMessage({
          type: 'error',
          text: 'No pending purchases found for that email address.'
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <h1 className="text-3xl font-bold text-white mb-2">Claim Your Purchase</h1>
        <p className="text-white/80 mb-6">
          If you purchased VerseCoins with a different email than your account email, enter it here to claim your credits.
        </p>

        {!authState.user ? (
          <div className="text-center">
            <p className="text-white/90 mb-4">Please log in to claim purchases</p>
            <button
              onClick={() => router.push('/chat')}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-sm text-white/70">
                <strong>Account Email:</strong> {authState.user.email}
              </p>
            </div>

            <form onSubmit={handleClaimPurchase} className="space-y-4">
              <div>
                <label htmlFor="gumroad-email" className="block text-white/90 mb-2 font-medium">
                  Email Used for Gumroad Purchase
                </label>
                <input
                  id="gumroad-email"
                  type="email"
                  value={gumroadEmail}
                  onChange={(e) => setGumroadEmail(e.target.value)}
                  placeholder="Enter your Gumroad purchase email"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {message && (
                <div
                  className={`p-4 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-500/20 border border-green-400/30 text-green-100'
                      : 'bg-red-500/20 border border-red-400/30 text-red-100'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !gumroadEmail}
                className="w-full py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                {loading ? 'Claiming...' : 'Claim Purchase'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-white/60 text-center">
                Don't have a pending purchase?{' '}
                <button
                  onClick={() => router.push('/chat')}
                  className="text-pink-400 hover:text-pink-300 underline"
                >
                  Return to Chat
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
