'use client';

import React, { useEffect, useState } from 'react';

interface NsfwDisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Simple 18+ Disclaimer Modal
 *
 * Shows when user toggles NSFW mode ON.
 * Requires age confirmation before allowing NSFW content.
 */
export default function NsfwDisclaimerModal({ isOpen, onAccept, onDecline }: NsfwDisclaimerModalProps) {
  const [confirmed18, setConfirmed18] = useState(false);

  // Reset checkbox when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmed18(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (confirmed18) {
      onAccept();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nsfw-disclaimer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onDecline}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-8"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
            <span className="text-4xl">🔞</span>
          </div>
        </div>

        {/* Title */}
        <h2
          id="nsfw-disclaimer-title"
          className="text-2xl font-bold text-center text-gray-900 mb-3"
        >
          Adult Content Warning
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center text-base leading-relaxed mb-6">
          You are about to enable NSFW mode. This may include explicit adult content.
        </p>

        {/* Age Confirmation Checkbox */}
        <label className="flex items-start gap-3 text-base mb-6 select-none p-4 rounded-xl border-2 border-gray-200 hover:border-pink-300 transition-colors cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
            checked={confirmed18}
            onChange={(e) => setConfirmed18(e.target.checked)}
          />
          <span className="font-medium text-gray-900">
            I confirm I am 18+ years old and want to view NSFW content.
          </span>
        </label>

        {/* Buttons */}
        <div className="space-y-3">
          {/* Accept Button */}
          <button
            onClick={handleAccept}
            disabled={!confirmed18}
            className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200"
            style={{
              background: confirmed18
                ? 'linear-gradient(135deg, #ec4899, #f43f5e)'
                : '#d1d5db',
              boxShadow: confirmed18
                ? '0 4px 12px rgba(244, 63, 94, 0.3)'
                : 'none',
              cursor: confirmed18 ? 'pointer' : 'not-allowed',
              opacity: confirmed18 ? 1 : 0.6,
            }}
          >
            Enable NSFW Mode
          </button>

          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="w-full px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors border-2 border-gray-200"
          >
            Keep Safe Mode
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
          By enabling NSFW mode, you agree to our{' '}
          <a href="/tos" className="underline text-pink-600 hover:text-pink-700">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="underline text-pink-600 hover:text-pink-700">Privacy Policy</a>
        </p>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
