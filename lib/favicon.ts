// lib/favicon.ts

// Character emoji mapping for favicons
const characterEmojis: Record<string, string> = {
  lexi: '💋',
  nyx: '🕷️',
  chloe: '📚',
  aiko: '🍡',
  zaria: '🌺',
  nova: '✨',
  dom: '⚡',
  chase: '🔥',
  ethan: '💼',
  jayden: '🌿',
  miles: '🤓',
};

// Generate SVG emoji favicon data URI
function generateEmojiSvgFavicon(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Update favicon dynamically (client-side)
export function updateFavicon(character: string, variant?: 'nsfw' | 'normal') {
  if (typeof window === 'undefined') return;
  
  // Get character emoji (could add NSFW variants in future)
  const emoji = characterEmojis[character] || '✨';
  const faviconDataUri = generateEmojiSvgFavicon(emoji);
  
  // Remove existing favicon links
  const existingLinks = document.querySelectorAll('link[rel*="icon"]:not([rel*="apple"])');
  existingLinks.forEach(link => link.remove());
  
  // Create new favicon link
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = faviconDataUri;
  
  // Add to head
  document.head.appendChild(link);
}

// Get emoji favicon for character
export function getFaviconForCharacter(character: string): string {
  const emoji = characterEmojis[character] || '✨';
  return generateEmojiSvgFavicon(emoji);
}

// Get emoji for character (useful for other components)
export function getEmojiForCharacter(character: string): string {
  return characterEmojis[character] || '✨';
}