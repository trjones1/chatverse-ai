'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show fallback or default message
  if (!user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-white/20">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
              <p className="text-gray-600 mb-6">
                You need to be logged in to access this page.
              </p>
              <button
                onClick={() => {
                  window.dispatchEvent(new Event('open-login'));
                  document.body.dataset.modal = 'open';
                }}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - render children
  return <>{children}</>;
}