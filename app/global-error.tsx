// app/global-error.tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { getCharacterConfig } from '@/lib/characters.config';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Set character context for global errors
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const characterConfig = getCharacterConfig(hostname);
      
      Sentry.withScope((scope) => {
        scope.setTag('character', characterConfig.key);
        scope.setTag('character_name', characterConfig.displayName);
        scope.setTag('domain', hostname);
        scope.setTag('error_boundary', 'global');
        scope.setContext('character', {
          key: characterConfig.key,
          name: characterConfig.displayName,
          domain: hostname,
        });
        
        Sentry.captureException(error);
      });
    }
  }, [error]);

  const characterConfig = typeof window !== 'undefined' 
    ? getCharacterConfig(window.location.hostname) 
    : { theme: { accent: '#ff7db5' }, displayName: 'AI Companion' };

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <div 
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${characterConfig.theme.accent}20` }}
              >
                <svg 
                  className="w-10 h-10" 
                  style={{ color: characterConfig.theme.accent }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-8">
                We're sorry, but {characterConfig.displayName} encountered an unexpected error. 
                Our team has been notified and is working on a fix.
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={reset}
                className="w-full px-6 py-3 rounded-lg font-medium text-white transition-colors"
                style={{ 
                  backgroundColor: characterConfig.theme.accent
                }}
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-6 py-3 rounded-lg font-medium border-2 transition-colors"
                style={{ 
                  borderColor: characterConfig.theme.accent,
                  color: characterConfig.theme.accent
                }}
              >
                Go Home
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Refresh Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && error.digest && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Error ID:</strong> {error.digest}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Message:</strong> {error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}