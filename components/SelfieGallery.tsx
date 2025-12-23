'use client';

import React, { useState, useEffect } from 'react';
import { useAuthState } from '@/hooks/useAuthState';

interface SelfieData {
  id: string;
  url: string;
  thumbnail?: string;
  mood?: string;
  aesthetic?: string;
  metadata?: any;
  timestamp?: string;
}

interface SelfieGalleryProps {
  characterKey: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SelfieGallery({ characterKey, isOpen, onClose }: SelfieGalleryProps) {
  const [selfies, setSelfies] = useState<SelfieData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const { user } = useAuthState();

  useEffect(() => {
    if (isOpen) {
      if (user) {
        fetchUserSelfies();
      } else {
        // For anonymous users, show empty state immediately
        setSelfies([]);
        setLoading(false);
      }
    }
  }, [isOpen, user, characterKey]);

  // Handle escape key for zoom modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomOpen) {
          setIsZoomOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    if (isOpen || isZoomOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isZoomOpen, onClose]);

  const fetchUserSelfies = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch selfies that were sent to this user
      const response = await fetch(`/api/user/selfies?character=${characterKey}`);
      if (response.ok) {
        const data = await response.json();
        setSelfies(data.selfies || []);
      }
    } catch (error) {
      console.error('Error fetching selfies:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % selfies.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + selfies.length) % selfies.length);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            📸 {characterKey.charAt(0).toUpperCase() + characterKey.slice(1)}'s Gallery
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Gallery Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
                <p className="text-gray-300">Loading gallery...</p>
              </div>
            </div>
          ) : selfies.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📷</div>
              {user ? (
                <>
                  <h3 className="text-xl font-semibold text-white mb-2">No photos yet</h3>
                  <p className="text-gray-400 mb-4">
                    Ask {characterKey.charAt(0).toUpperCase() + characterKey.slice(1)} to send you a selfie!
                  </p>
                  <div className="text-sm text-gray-500">
                    Try saying: "Can you send me a picture?" or "Show me how you look"
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-white mb-2">Create an account to save photos</h3>
                  <p className="text-gray-400 mb-4">
                    {characterKey.charAt(0).toUpperCase() + characterKey.slice(1)} can send you selfies, but you need an account to keep them in your gallery!
                  </p>
                  <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 rounded-lg inline-block mb-4">
                    💖 Create Account & Get Unlimited Access
                  </div>
                  <div className="text-sm text-gray-500">
                    Anonymous selfies work, but won't be saved to your gallery
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main Image Display */}
              <div className="relative">
                <div className="relative bg-gray-800 rounded-xl overflow-hidden group">
                  <img
                    src={selfies[currentIndex]?.url}
                    alt={`Selfie ${currentIndex + 1}`}
                    className="w-full max-h-[500px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setIsZoomOpen(true)}
                    title="Click to view full size"
                  />

                  {/* Click to zoom indicator */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                    <div className="bg-black/70 text-white px-4 py-2 rounded-full flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      <span className="text-sm">Click to zoom</span>
                    </div>
                  </div>

                  {/* Navigation Arrows */}
                  {selfies.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentIndex + 1} / {selfies.length}
                  </div>
                </div>

                {/* Image Info */}
                {selfies[currentIndex]?.mood && (
                  <div className="mt-3 text-center">
                    <span className="inline-block bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">
                      {selfies[currentIndex].mood} mood
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {selfies.length > 1 && (
                <div className="flex justify-center">
                  <div className="flex gap-2 max-w-full overflow-x-auto pb-2">
                    {selfies.map((selfie, index) => (
                      <button
                        key={selfie.id}
                        onClick={() => setCurrentIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                          index === currentIndex
                            ? 'border-pink-500'
                            : 'border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={selfie.thumbnail || selfie.url}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomOpen && selfies[currentIndex] && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsZoomOpen(false);
            }
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 z-10 p-3 text-white hover:text-gray-300 hover:bg-black/50 rounded-full transition-colors"
            title="Close zoom view"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Full-size image */}
          <div className="relative max-w-full max-h-full">
            <img
              src={selfies[currentIndex].url}
              alt={`Full size selfie ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Navigation in zoom view */}
            {selfies.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors"
                  title="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors"
                  title="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image counter in zoom view */}
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
              {currentIndex + 1} / {selfies.length}
            </div>

            {/* Image info in zoom view */}
            {selfies[currentIndex]?.mood && (
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                {selfies[currentIndex].mood} mood
              </div>
            )}
          </div>

          {/* Escape key hint */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/70 text-sm">
            Press ESC or click outside to close
          </div>
        </div>
      )}
    </div>
  );
}