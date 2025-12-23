'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
// Using emoji icons instead of lucide-react for simplicity

function CryptoSuccessContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const chargeId = searchParams?.get('charge_id');
  const characterKey = searchParams?.get('character') || 'your AI companion';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Success header with animation */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 animate-pulse opacity-50"></div>
          <div className="relative">
            <div className="text-6xl mx-auto mb-4 animate-bounce">✅</div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Sent!</h1>
            <p className="text-green-100 text-sm">
              Your crypto payment is being processed
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl text-orange-500 animate-pulse">₿</span>
              <span className="text-gray-300 font-medium">Crypto Payment Processing</span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed">
              Your cryptocurrency payment has been submitted to the blockchain.
              Your premium access to <span className="text-white font-semibold">{characterKey}</span> will
              activate automatically once the transaction is confirmed.
            </p>
          </div>

          {chargeId && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Payment Reference</h3>
              <p className="text-xs text-gray-400 font-mono break-all">{chargeId}</p>
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
              <span>✅</span>
              What happens next?
            </h3>
            <ul className="text-blue-200 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Blockchain confirms your payment (usually 1-10 minutes)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Your premium subscription activates automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>You'll get full access to advanced features</span>
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Link
              href={`/chat?character=${characterKey}`}
              className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg text-center"
            >
              <span className="flex items-center justify-center gap-2">
                Continue Chatting
                <span>→</span>
              </span>
            </Link>

            <Link
              href="/dashboard"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-3 px-4 rounded-xl transition-colors text-center"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🏠</span>
                View Dashboard
              </span>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Having issues? Check your email for payment confirmation or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CryptoSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    }>
      <CryptoSuccessContent />
    </Suspense>
  );
}