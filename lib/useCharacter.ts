// lib/useCharacter.ts
'use client';

import { useState, useEffect } from 'react';
import { getCharacterConfig, type CharacterConfig, characters } from './characters.config';

export function useCharacter(serverCharacterConfig?: CharacterConfig): CharacterConfig {
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  if (typeof window === 'undefined' || !hydrated) {
    // Server-side or before hydration: use server config if available, otherwise get from hostname
    if (serverCharacterConfig) {
      return serverCharacterConfig;
    }
    // Fallback to trying to extract hostname from environment or default
    return getCharacterConfig('chatwithlexi.com');
  }
  
  // Client-side after hydration: check for URL parameter first, then hostname
  const url = new URL(window.location.href);
  const characterParam = url.searchParams.get('character');
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  
  // Security: Only allow character parameters on localhost for development
  if (characterParam && !isLocalhost) {
    console.warn('🔒 Character parameters are not allowed in production environments');
    // Remove character parameter from URL
    url.searchParams.delete('character');
    window.history.replaceState({}, '', url.toString());
  }
  
  if (characterParam && isLocalhost) {
    // Find character config by key (e.g., ?character=lexi) with safe string handling
    const characterEntry = Object.values(characters).find(
      config => config?.key?.toLowerCase?.() === characterParam?.toLowerCase?.()
    );
    
    if (characterEntry) {
      console.log('🎭 Using character from URL parameter:', characterParam, '→', characterEntry.displayName);
      return characterEntry;
    } else {
      console.warn('🎭 Character parameter not found:', characterParam, 'falling back to hostname');
    }
  }
  
  // Fall back to hostname-based detection
  const hostname = window.location.hostname;
  const config = getCharacterConfig(hostname);
  console.log('🎭 Using character from hostname:', hostname, '→', config.key);
  return config;
}

export function useCharacterKey(serverCharacterConfig?: CharacterConfig): string {
  return useCharacter(serverCharacterConfig).key;
}

export function useCharacterDisplayName(serverCharacterConfig?: CharacterConfig): string {
  return useCharacter(serverCharacterConfig).displayName;
}