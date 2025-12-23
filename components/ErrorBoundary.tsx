// components/ErrorBoundary.tsx
'use client';

import React from 'react';
import * as Sentry from '@sentry/react';
import { getCharacterConfig } from '@/lib/characters.config';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  characterKey?: string;
  componentName?: string;
}

// Default error fallback component
function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const characterConfig = getCharacterConfig(window.location.hostname);
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${characterConfig.theme.accent}20` }}
          >
            <svg 
              className="w-8 h-8" 
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Oops! Something went wrong
          </h3>
          <p className="text-gray-600 mb-6">
            We've encountered an unexpected error. Our team has been notified and is working on a fix.
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              backgroundColor: characterConfig.theme.accent,
              color: 'white'
            }}
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 rounded-lg font-medium border-2 transition-colors"
            style={{ 
              borderColor: characterConfig.theme.accent,
              color: characterConfig.theme.accent
            }}
          >
            Refresh Page
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error Details (Development)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Error boundary wrapper component
function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Create Sentry Error Boundary with custom configuration
const SentryErrorBoundary = Sentry.withErrorBoundary(
  ErrorBoundaryWrapper,
  {
    fallback: ({ error, resetError }: { error: unknown; resetError: () => void }) => 
      <DefaultErrorFallback error={error as Error} resetError={resetError} />,
    beforeCapture: (scope, error, errorInfo) => {
      // Add character-specific context
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const characterConfig = getCharacterConfig(hostname);
      
      scope.setTag('character', characterConfig.key);
      scope.setTag('character_name', characterConfig.displayName);
      scope.setTag('domain', hostname);
      
      // Add component context
      if (errorInfo && typeof errorInfo === 'string') {
        scope.setContext('Component Stack', {
          stack: errorInfo,
        });
      }
      
      // Add user context (privacy-safe)
      scope.setUser({});
      
      // Add additional error context
      scope.setLevel('error');
      scope.setFingerprint(['{{ default }}', characterConfig.key]);
    },
  }
);

// Main Error Boundary component
export default function ErrorBoundary({ children, fallback, characterKey, componentName }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <DefaultErrorFallback error={error as Error} resetError={resetError} />
      )}
      beforeCapture={(scope, error, errorInfo) => {
        // Add character-specific context
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const characterConfig = getCharacterConfig(hostname);
        
        scope.setTag('character', characterKey || characterConfig.key);
        scope.setTag('character_name', characterConfig.displayName);
        scope.setTag('domain', hostname);
        scope.setTag('component', componentName || 'unknown');
        
        // Add component context
        if (errorInfo && typeof errorInfo === 'string') {
          scope.setContext('Component Stack', {
            stack: errorInfo,
          });
        }
        
        // Add user context (privacy-safe)
        scope.setUser({});
        
        // Add additional error context
        scope.setLevel('error');
        scope.setFingerprint(['{{ default }}', characterKey || characterConfig.key, componentName || 'unknown']);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

// Specialized error boundaries for different parts of the app
export function ChatErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      componentName="Chat"
      fallback={({ error, resetError }) => (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chat Error
            </h3>
            <p className="text-gray-600 mb-4">
              Something went wrong with the chat. Please try again.
            </p>
            <button
              onClick={resetError}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Restart Chat
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export function VoiceErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      componentName="Voice"
      fallback={({ error, resetError }) => (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            Voice Feature Error
          </h3>
          <p className="text-sm text-red-600 mb-2">
            The voice feature encountered an error.
          </p>
          <button
            onClick={resetError}
            className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export function PaymentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      componentName="Payment"
      fallback={({ error, resetError }) => (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 mb-1">
            Payment Error
          </h3>
          <p className="text-sm text-yellow-600 mb-2">
            There was an issue with the payment system. Please refresh and try again.
          </p>
          <div className="space-x-2">
            <button
              onClick={resetError}
              className="text-sm px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-sm px-3 py-1 border border-yellow-600 text-yellow-600 rounded hover:bg-yellow-50"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}