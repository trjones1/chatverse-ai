'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
// Using emoji icons instead of lucide-react for simplicity

function CryptoCancelContent() {
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

  const characterKey = searchParams?.get('character') || 'your AI companion';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Cancel header */}
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 text-center relative overflow-hidden">
          <div className="relative">
            <div className="text-6xl mx-auto mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
            <p className="text-gray-200 text-sm">
              No worries, your crypto payment was cancelled
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl text-orange-500">₿</span>
              <span className="text-gray-300 font-medium">No Payment Made</span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed">
              You cancelled the cryptocurrency payment process.
              No funds were transferred and you can try again anytime to get
              premium access to <span className="text-white font-semibold">{characterKey}</span>.
            </p>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-yellow-300 font-semibold mb-2 flex items-center gap-2">
              <span>🔄</span>
              Want to try again?
            </h3>
            <p className="text-yellow-200 text-sm">
              Crypto payments offer 30% savings compared to card payments,
              plus instant global processing and enhanced privacy.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Link
              href={`/chat?character=${characterKey}`}
              className="block w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg text-center"
            >
              <span className="flex items-center justify-center gap-2">
                <span>₿</span>
                Try Crypto Payment Again
              </span>
            </Link>

            <Link
              href={`/chat?character=${characterKey}`}
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-colors text-center"
            >
              <span className="flex items-center justify-center gap-2">
                Continue Free Chat
                <span>←</span>
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
              Questions about crypto payments? Contact our support team for help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CryptoCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    }>
      <CryptoCancelContent />
    </Suspense>
  );
}