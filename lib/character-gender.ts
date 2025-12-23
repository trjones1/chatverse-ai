// lib/character-gender.ts
// Gender-specific character mapping utility

export type CharacterGender = 'female' | 'male';

export function getCharacterGender(characterKey: string): CharacterGender {
  const maleCharacters = ['dom', 'dominic', 'chase', 'ethan', 'jayden', 'miles'];
  const femaleCharacters = ['lexi', 'nyx', 'chloe', 'aiko', 'zaria', 'nova'];
  
  const normalizedKey = characterKey.toLowerCase();
  
  if (maleCharacters.includes(normalizedKey)) {
    return 'male';
  }
  
  if (femaleCharacters.includes(normalizedKey)) {
    return 'female';
  }
  
  // Default to female (Lexi) for unknown characters
  return 'female';
}

export function getGenderSpecificEnvKey(characterKey: string, productType: string): string {
  const gender = getCharacterGender(characterKey);
  const prefix = gender === 'male' ? 'M_STRIPE_PRICE' : 'F_STRIPE_PRICE';
  return `${prefix}_${productType.toUpperCase()}`;
}

// Helper for getting fallback pricing environment variables
export function getFallbackPrice(characterKey: string, productType: string): string {
  const envKey = getGenderSpecificEnvKey(characterKey, productType);
  return process.env[envKey] || '';
}

// Pronoun utility functions for character-specific UI text
export function getCharacterPronoun(characterKey: string, type: 'subject' | 'object' | 'possessive'): string {
  const gender = getCharacterGender(characterKey);
  
  switch (type) {
    case 'subject':
      return gender === 'male' ? 'he' : 'she';
    case 'object':
      return gender === 'male' ? 'him' : 'her';
    case 'possessive':
      return gender === 'male' ? 'his' : 'her';
    default:
      return gender === 'male' ? 'he' : 'she';
  }
}

export function getCharacterPronounCapitalized(characterKey: string, type: 'subject' | 'object' | 'possessive'): string {
  const pronoun = getCharacterPronoun(characterKey, type);
  return pronoun.charAt(0).toUpperCase() + pronoun.slice(1);
}