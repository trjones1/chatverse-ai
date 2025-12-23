"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [isProduction, setIsProduction] = useState(true);

  useEffect(() => {
    console.error("App error boundary:", error);
    
    // Show detailed error info in development/preview environments
    const isDev = process.env.NODE_ENV === 'development' || 
                  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));
    setIsProduction(!isDev);
  }, [error]);

  const errorDetails = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    digest: error.digest,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
    cause: error.cause ? String(error.cause) : 'N/A'
  };

  return (
    <main className="min-h-[70vh] grid place-items-center p-6">
      <div className="text-center max-w-4xl">
        <div className="inline-block rounded-2xl bg-red-500/10 text-red-600 dark:text-red-300 px-3 py-1 text-xs font-semibold tracking-wide mb-4">
          Something went wrong
        </div>
        <h1 className="text-3xl font-bold mb-2">We hit an error</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Try again in a moment. If this keeps happening, please contact support.
        </p>
        
        {/* Debug info for development/preview */}
        {!isProduction && (
          <div className="mb-6 text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mb-3 text-xs bg-blue-500/10 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-500/20 transition"
            >
              {showDetails ? 'Hide' : 'Show'} Debug Details
            </button>
            
            {showDetails && (
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs font-mono text-left overflow-auto max-h-96">
                <h3 className="font-bold text-sm mb-3 text-red-600">🐛 Error Debug Information:</h3>
                
                <div className="space-y-2">
                  <div><strong>Error:</strong> {errorDetails.message}</div>
                  <div><strong>Type:</strong> {errorDetails.name}</div>
                  <div><strong>Time:</strong> {errorDetails.timestamp}</div>
                  <div><strong>URL:</strong> {errorDetails.url}</div>
                  <div><strong>Digest:</strong> {errorDetails.digest || 'N/A'}</div>
                  
                  {errorDetails.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border-l-2 border-red-300 whitespace-pre-wrap">
                        {errorDetails.stack}
                      </pre>
                    </div>
                  )}
                  
                  <div>
                    <strong>Browser:</strong> 
                    <div className="text-xs text-gray-600 mt-1">{errorDetails.userAgent}</div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
                  <div className="font-bold text-yellow-700 dark:text-yellow-300 text-sm">💡 Quick Debug Tips:</div>
                  <ul className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 space-y-1">
                    <li>• Check browser console for additional errors</li>
                    <li>• Look for undefined variables in stack trace</li>
                    <li>• Verify all environment variables are set</li>
                    <li>• Check if error occurs on page refresh</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-2xl px-4 py-2 text-sm font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            Try again
          </button>
          <a
            href="mailto:lexi@chatverse.ai"
            className="rounded-2xl px-4 py-2 text-sm font-medium border border-gray-300 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10 transition"
          >
            Contact support
          </a>
        </div>
        
        {!isProduction && (
          <div className="mt-4 text-xs text-gray-500">
            🔧 Debug mode active (development/preview environment)
          </div>
        )}
      </div>
    </main>
  );
}