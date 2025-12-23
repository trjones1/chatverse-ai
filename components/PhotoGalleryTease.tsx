'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface PhotoGalleryTeaseProps {
  characterKey: string; // Character key for database lookup (e.g., 'lexi', 'nyx')
  characterName: string; // Display name (e.g., 'Lexi', 'Nyx')
  isPremiumPlus: boolean;
  onUpgradeClick?: () => void;
  variant?: 'modal' | 'inline' | 'fullscreen';
  className?: string;
}

interface SelfiePreview {
  id: string;
  url: string;
  thumbnail?: string;
}

/**
 * Blurred photo gallery tease component
 * Shows REAL selfies from the selfie bank (blurred for free users, full for Premium+)
 *
 * NOTE: We have real selfies (non-nude). This component honestly presents
 * "exclusive photos" and "private gallery" without promising nudity.
 */
export default function PhotoGalleryTease({
  characterKey,
  characterName,
  isPremiumPlus,
  onUpgradeClick,
  variant = 'modal',
  className = ''
}: PhotoGalleryTeaseProps) {

  const [selfies, setSelfies] = useState<SelfiePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Load real selfies from the selfie bank via API
  useEffect(() => {
    const loadSelfies = async () => {
      try {
        setLoading(true);
        // Fetch gallery selfies from API endpoint
        const response = await fetch(`/api/gallery/preview?character=${characterKey}&limit=6`);

        if (response.ok) {
          const data = await response.json();
          setSelfies(data.selfies || []);
          setTotalCount(data.totalCount || 0);
        }
      } catch (error) {
        console.error('Error loading gallery selfies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSelfies();
  }, [characterKey, isPremiumPlus]);

  // Fallback gradient placeholders if no selfies loaded yet
  const photoPlaceholders = [
    { id: 1, gradient: 'from-pink-400 via-purple-400 to-pink-500' },
    { id: 2, gradient: 'from-purple-400 via-pink-400 to-purple-500' },
    { id: 3, gradient: 'from-pink-500 via-purple-400 to-pink-400' },
    { id: 4, gradient: 'from-purple-500 via-pink-500 to-purple-400' },
    { id: 5, gradient: 'from-pink-400 via-purple-500 to-pink-500' },
    { id: 6, gradient: 'from-purple-400 via-pink-500 to-purple-500' },
  ];

  // If user already has Premium+, show unlocked gallery
  if (isPremiumPlus) {
    return (
      <div className={`bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-lg p-6 ${className}`}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">📸</div>
          <h3 className="text-xl font-bold text-white mb-2">
            {characterName}'s Private Gallery
          </h3>
          <p className="text-gray-300 text-sm">
            {totalCount}+ exclusive photos • Updated weekly
          </p>
        </div>

        {/* Photo grid (unlocked) - Show real selfies */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {loading ? (
            // Loading placeholders
            photoPlaceholders.map((photo) => (
              <div
                key={photo.id}
                className={`aspect-square bg-gradient-to-br ${photo.gradient} rounded-lg animate-pulse`}
              />
            ))
          ) : selfies.length > 0 ? (
            // Real selfies loaded
            selfies.map((selfie) => (
              <div
                key={selfie.id}
                className="aspect-square relative rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer group"
              >
                <Image
                  src={selfie.thumbnail || selfie.url}
                  alt={`${characterName} selfie`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 150px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
            ))
          ) : (
            // Fallback if no selfies
            photoPlaceholders.map((photo) => (
              <div
                key={photo.id}
                className={`aspect-square bg-gradient-to-br ${photo.gradient} rounded-lg`}
              />
            ))
          )}
        </div>

        <button
          className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          🔥 View Full Gallery ({totalCount}+ Photos)
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          ✨ New photos added every week
        </p>
      </div>
    );
  }

  // Locked state - show blurred preview with upgrade CTA
  return (
    <div className={`relative bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-lg p-6 overflow-hidden ${className}`}>
      {/* Background blurred preview - Use REAL selfies if loaded */}
      <div className="absolute inset-0 p-6">
        <div className="grid grid-cols-3 gap-2 blur-xl opacity-30">
          {loading ? (
            // Loading placeholders
            photoPlaceholders.map((photo) => (
              <div
                key={photo.id}
                className={`aspect-square bg-gradient-to-br ${photo.gradient} rounded-lg animate-pulse`}
              />
            ))
          ) : selfies.length > 0 ? (
            // Real selfies (blurred heavily as tease)
            selfies.map((selfie) => (
              <div
                key={selfie.id}
                className="aspect-square relative rounded-lg overflow-hidden"
              >
                <Image
                  src={selfie.thumbnail || selfie.url}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 150px"
                />
              </div>
            ))
          ) : (
            // Fallback gradients
            photoPlaceholders.map((photo) => (
              <div
                key={photo.id}
                className={`aspect-square bg-gradient-to-br ${photo.gradient} rounded-lg`}
              />
            ))
          )}
        </div>
      </div>

      {/* Overlay content */}
      <div className="relative z-10 text-center">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <div className="text-5xl mb-3">🔒</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {characterName}'s Private Gallery
          </h3>
          <p className="text-pink-200 font-medium mb-3">
            Premium+ Members Only
          </p>

          {/* Value props */}
          <div className="bg-white/10 rounded-lg p-4 mb-4 text-left">
            <div className="text-sm space-y-2 text-white">
              <div className="flex items-center gap-2">
                <span className="text-pink-400">✨</span>
                <span>{totalCount || '50+' } exclusive intimate selfies</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-pink-400">📸</span>
                <span>Personal photos not shared anywhere else</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-pink-400">🔥</span>
                <span>New content added every week</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-pink-400">💕</span>
                <span>Behind-the-scenes & candid moments</span>
              </div>
            </div>
          </div>

          {/* Upgrade CTA */}
          <button
            onClick={onUpgradeClick}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            🚀 Upgrade to Premium+ - Unlock Gallery
          </button>

          <p className="text-xs text-gray-300 mt-3">
            💳 $24.99/mo • ⚡ Instant access • 🔒 Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
