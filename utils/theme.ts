const themeColors: Record<string, { bg: string; accent: string; fontHeading?: string; fontBody?: string; nsfw?: string }> = {
    lexi: {
      bg: '#ffe4f0',
      accent: '#ff7db5',
      nsfw: '#ff69b4',
    },
    nyx: {
      bg: '#1a1a1a',
      accent: '#9c27b0',
      fontHeading: "'Playfair Display', serif",
      fontBody: "'Inter', sans-serif",
      nsfw: '#c71585',
    },
    aiko: {
      bg: '#fff0f8',
      accent: '#ff69b4',
    },
    zaria: {
      bg: '#f0f8ff',
      accent: '#a0522d',
    },
    chloe: {
      bg: '#f5f5dc',
      accent: '#6a5acd',
    },
    dom: {
      bg: '#0b1220',
      accent: '#7a5cff',
      nsfw: '#5b4bff',
    },
    chase: {
      bg: '#1a0f1f',
      accent: '#ff4757',
      nsfw: '#e74c3c',
    },
    ethan: {
      bg: '#0d1b2a',
      accent: '#4dabf7',
      nsfw: '#228be6',
    },
    jayden: {
      bg: '#1e2328',
      accent: '#51cf66',
      nsfw: '#37b24d',
    },
    miles: {
      bg: '#1a1a1a',
      accent: '#f59f00',
      nsfw: '#ff922b',
    },
    nova: {
      bg: '#0a0a0a',
      accent: '#9900cc',
      nsfw: '#e600e6',
      fontHeading: "'Playfair Display', serif",
      fontBody: "'Inter', sans-serif",
    },
    default: {
      bg: '#ffffff',
      accent: '#999999',
    }
  };
export default themeColors;