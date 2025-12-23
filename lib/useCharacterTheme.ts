// lib/useCharacterTheme.ts
'use client';

import { useCharacter } from './useCharacter';
import themeColors from '../utils/theme';

export function useCharacterTheme() {
  const character = useCharacter();
  
  // Return the character's theme config which includes both old and new format
  return {
    ...character.theme,
    // Also include the legacy theme for backward compatibility
    legacy: themeColors[character.key] || themeColors.default
  };
}

export function applyCharacterTheme() {
  if (typeof window === 'undefined') return;
  
  const character = useCharacter();
  const theme = character.theme;
  
  // Apply CSS custom properties for dynamic theming
  const root = document.documentElement;
  
  root.style.setProperty('--character-bg', theme.bg);
  root.style.setProperty('--character-accent', theme.accent);
  root.style.setProperty('--character-primary', theme.primary);
  root.style.setProperty('--character-secondary', theme.secondary);
  
  if (theme.nsfw) {
    root.style.setProperty('--character-nsfw', theme.nsfw);
  }
  
  if (theme.fontHeading) {
    root.style.setProperty('--character-font-heading', theme.fontHeading);
  }
  
  if (theme.fontBody) {
    root.style.setProperty('--character-font-body', theme.fontBody);
  }
  
  // Apply background color to body
  document.body.style.backgroundColor = theme.bg;
  
  // Apply character class to body for CSS targeting
  document.body.classList.remove('character-lexi', 'character-nyx');
  document.body.classList.add(`character-${character.key}`);
}