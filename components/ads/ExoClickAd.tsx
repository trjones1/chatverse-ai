'use client';

import React from 'react';
import { Banner } from 'exoclick-react';

interface ExoClickAdProps {
  zoneId: number;
  nsfwMode?: boolean;
  className?: string;
}

// ExoClick Zone IDs
const SFW_ZONE_ID = 5771028;   // Safe for work content
const NSFW_ZONE_ID = 5767920;  // Adult content

/**
 * ExoClick Ad Component for Freemium Monetization
 *
 * Displays banner ads between chat messages to monetize free users.
 *
 * Zone IDs:
 * - SFW Zone: 5771028 (300x250, 728x90, 320x50 banner - safe for work content)
 * - NSFW Zone: 5767920 (300x250, 728x90, 320x50 banner - adult content)
 *
 * When nsfwMode is false/undefined, shows SFW ads only.
 * When nsfwMode is true, shows adult ads.
 */
export default function ExoClickAd({ zoneId, nsfwMode = false, className = '' }: ExoClickAdProps) {
  // Use appropriate zone based on NSFW mode
  // Ignore the zoneId prop and use our constants instead
  const activeZoneId = nsfwMode ? NSFW_ZONE_ID : SFW_ZONE_ID;

  return (
    <div className={`exoclick-ad-container ${className}`}>
      {/* Label for transparency */}
      <div className="text-center text-xs text-gray-400 mb-1">
        Advertisement {nsfwMode && <span className="text-pink-500">• Adult Content</span>}
      </div>

      {/* ExoClick Banner Ad */}
      <div className="flex justify-center">
        <Banner zoneId={activeZoneId} />
      </div>

      <style jsx>{`
        .exoclick-ad-container {
          padding: 16px 0;
          margin: 16px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
