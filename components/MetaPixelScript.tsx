'use client';

import { useEffect } from 'react';
import { initMetaPixel, getPixelId } from '@/lib/metaPixel';

interface MetaPixelScriptProps {
  character?: string;
}

export default function MetaPixelScript({ character }: MetaPixelScriptProps) {
  useEffect(() => {
    // Initialize Meta Pixel on client side with character-specific targeting
    initMetaPixel(character);
  }, [character]);

  const pixelId = getPixelId(character);

  return (
    <>
      {/* Meta Pixel noscript fallback */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}