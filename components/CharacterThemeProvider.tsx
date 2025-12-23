'use client';

import { useEffect } from 'react';
import { useCharacter } from '@/lib/useCharacter';

export default function CharacterThemeProvider() {
  const character = useCharacter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Apply character theme class to body
    const characterClass = character.key.toLowerCase();
    
    // Remove any existing character classes
    const characterClasses = ['lexi', 'nyx', 'chloe', 'aiko', 'zaria', 'nova', 'dom', 'chase', 'ethan', 'jayden', 'miles'];
    document.body.classList.remove(...characterClasses);
    
    // Add current character class
    document.body.classList.add(characterClass);
    
    // Cleanup function to remove the class when component unmounts
    return () => {
      document.body.classList.remove(characterClass);
    };
  }, [character.key]);

  // This component doesn't render anything
  return null;
}