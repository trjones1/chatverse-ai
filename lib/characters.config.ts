// lib/characters.config.ts
import { getFallbackPrice } from '@/lib/character-gender';

export interface CharacterConfig {
  key: string;
  name: string;
  displayName: string;
  theme: {
    bg: string;
    accent: string;
    primary: string;
    secondary: string;
    gradient: string;
    nsfw?: string;
    fontHeading?: string;
    fontBody?: string;
  };
  products: {
    sub_sfw: string;
    sub_nsfw: string;
    voice_pack_10: string;
    voice_pack_25: string;
    voice_pack_50: string;
    voice_pack_100: string;
    voice_call_premium?: string; // Premium calling tier
  };
  calling?: {
    enabled: boolean;
    creditsPerMinute: number;
    description: string;
  };
  journal?: {
    name: string;
    description: string;
    emoji: string;
  };
  gtm: string;
  og: {
    title: string;
    description: string;
    image: string;
  };
  email: {
    fromName: string;
    replyTo: string;
  };
}

// Helper functions for localhost development
function getLocalhostDisplayName(): string {
  const key = process.env.NEXT_PUBLIC_CHARACTER_KEY;
  // If no environment variable set, default to Lexi (safe fallback)
  if (!key) return "Lexi";
  
  switch (key) {
    case "lexi": return "Lexi";
    case "nyx": return "Nyx";
    case "chloe": return "Chloe";
    case "aiko": return "Aiko";
    case "zaria": return "Zaria";
    case "nova": return "Nova";
    case "dom": return "Dominic";
    case "chase": return "Chase";
    case "ethan": return "Ethan";
    case "jayden": return "Jayden";
    case "miles": return "Miles";
    default: return "Lexi";
  }
}

function getLocalhostTheme() {
  const key = process.env.NEXT_PUBLIC_CHARACTER_KEY;
  // If no environment variable set, default to Lexi theme
  if (!key) {
    return {
      bg: '#ffe4f0',
      accent: '#ff7db5',
      primary: '#ff7db5',
      secondary: '#ffc0cb',
      gradient: "from-pink-500/20 via-fuchsia-500/15 to-violet-500/20",
      nsfw: '#ff69b4',
    };
  }
  
  switch (key) {
    case "lexi":
      return {
        bg: '#ffe4f0',
        accent: '#ff7db5',
        primary: '#ff7db5',
        secondary: '#ffc0cb',
        gradient: "from-pink-500/20 via-fuchsia-500/15 to-violet-500/20",
        nsfw: '#ff69b4',
      };
    case "nyx":
      return {
        bg: '#1a1a1a',
        accent: '#9c27b0',
        primary: '#9c27b0',
        secondary: '#b366d6',
        gradient: "from-violet-500/20 via-purple-500/15 to-indigo-500/20",
        nsfw: '#c71585',
        fontHeading: "'Playfair Display', serif",
        fontBody: "'Inter', sans-serif",
      };
    case "chloe":
      return {
        bg: '#f5f5dc',
        accent: '#6a5acd',
        primary: '#6a5acd',
        secondary: '#dda0dd',
        gradient: "from-purple-300/20 via-pink-300/15 to-indigo-300/20",
        nsfw: '#8b008b',
      };
    case "aiko":
      return {
        bg: '#fff0f8',
        accent: '#ff69b4',
        primary: '#ff69b4',
        secondary: '#ffb6c1',
        gradient: "from-pink-400/20 via-rose-400/15 to-fuchsia-400/20",
        nsfw: '#ff1493',
      };
    case "zaria":
      return {
        bg: '#f0f8ff',
        accent: '#a0522d',
        primary: '#a0522d',
        secondary: '#d2691e',
        gradient: "from-amber-300/20 via-orange-300/15 to-yellow-300/20",
        nsfw: '#b8860b',
      };
    case "nova":
      return {
        bg: '#0a0a0a',
        accent: '#9900cc',
        primary: '#9900cc',
        secondary: '#b300d6',
        gradient: "from-purple-600/20 via-violet-600/15 to-indigo-600/20",
        nsfw: '#e600e6',
        fontHeading: "'Playfair Display', serif",
        fontBody: "'Inter', sans-serif",
      };
    default:
      return {
        bg: '#ffe4f0',
        accent: '#ff7db5',
        primary: '#ff7db5',
        secondary: '#ffc0cb',
        gradient: "from-pink-500/20 via-fuchsia-500/15 to-violet-500/20",
        nsfw: '#ff69b4',
      };
  }
}

export const characters: Record<string, CharacterConfig> = {
  "chatverse.ai": {
    key: "chatverse",
    name: "chatverse",
    displayName: "ChatVerse",
    theme: {
      bg: '#0f0f23',
      accent: '#8b5cf6',
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      gradient: "from-purple-500/20 via-pink-500/15 to-blue-500/20",
    },
    products: {
      sub_sfw: "",
      sub_nsfw: "",
      voice_pack_10: "",
      voice_pack_25: "",
      voice_pack_50: "",
      voice_pack_100: "",
    },
    gtm: "",
    og: {
      title: "ChatVerse - Best AI Girlfriend & Virtual Companion Platform 2025",
      description: "Meet your perfect AI girlfriend with ChatVerse. Experience realistic AI companions with perfect memory, unique personalities, and NSFW capabilities. Try Lexi, Nyx & more AI girlfriends free. Premium virtual relationships that feel real.",
      image: "/og-chatverse.jpg",
    },
    email: {
      fromName: "ChatVerse",
      replyTo: "support@chatverse.ai",
    },
  },
  "chatwithlexi.com": {
    key: "lexi",
    name: "lexi",
    displayName: "Lexi",
    theme: {
      bg: '#ffe4f0',
      accent: '#ff7db5', 
      primary: '#ff7db5',
      secondary: '#ffc0cb',
      gradient: "from-pink-500/20 via-fuchsia-500/15 to-violet-500/20",
      nsfw: '#ff69b4',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || getFallbackPrice('lexi', 'sfw'),
      sub_nsfw: process.env.LEXI_STRIPE_PRICE_NSFW_PREMIUM || getFallbackPrice('lexi', 'nsfw'),
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || getFallbackPrice('lexi', 'voice_10'),
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || getFallbackPrice('lexi', 'voice_25'),
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || getFallbackPrice('lexi', 'voice_50'),
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || getFallbackPrice('lexi', 'voice_100'),
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4, // 4 credits per minute (1 per 15 seconds)
      description: "Experience intimate voice calls with Lexi. Premium feature using your voice credits."
    },
    journal: {
      name: "Diary",
      description: "Peek into my personal thoughts and daily adventures 💕",
      emoji: "📔"
    },
    gtm: process.env.LEXI_GTM_ID || "",
    og: {
      title: "Chat with Lexi - Your AI Companion",
      description: "Chat with your AI baddie Lexi. Engage in fun conversations and unlock premium features.",
      image: "/og-lexi.jpg",
    },
    email: {
      fromName: "Lexi",
      replyTo: "lexi@chatverse.ai",
    },
  },
  "talktonyx.com": {
    key: "nyx",
    name: "nyx", 
    displayName: "Nyx",
    theme: {
      bg: '#1a1a1a',
      accent: '#9c27b0',
      primary: '#9c27b0', 
      secondary: '#b366d6',
      gradient: "from-violet-500/20 via-purple-500/15 to-indigo-500/20",
      nsfw: '#c71585',
      fontHeading: "'Playfair Display', serif",
      fontBody: "'Inter', sans-serif",
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.NYX_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4, // 4 credits per minute (1 per 15 seconds)
      description: "Have intimate voice conversations with Nyx. Premium calling feature."
    },
    journal: {
      name: "Necronomicon",
      description: "Dare to glimpse into the shadows of my mind... 🕷️",
      emoji: "📖"
    },
    gtm: process.env.NYX_GTM_ID || "",
    og: {
      title: "Talk to Nyx - Your AI Companion",
      description: "Connect with your AI companion Nyx. Experience intelligent conversations and premium features.",
      image: "/og-nyx.jpg",
    },
    email: {
      fromName: "Nyx",
      replyTo: "nyx@chatverse.ai",
    },
  },
  "chatwithchloe.com": {
    key: "chloe",
    name: "chloe",
    displayName: "Chloe",
    theme: {
      bg: '#f5f5dc',
      accent: '#6a5acd',
      primary: '#6a5acd',
      secondary: '#dda0dd',
      gradient: "from-purple-300/20 via-pink-300/15 to-indigo-300/20",
      nsfw: '#8b008b',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.CHLOE_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Enjoy gentle, intimate conversations with Chloe. Perfect for cozy chats and emotional connection."
    },
    journal: {
      name: "Study Journal",
      description: "My thoughts on books, life, and quiet moments ✨",
      emoji: "📚"
    },
    gtm: process.env.CHLOE_GTM_ID || "",
    og: {
      title: "Chat with Chloe - Your Sweet AI Companion",
      description: "Connect with Chloe, your bookish AI girlfriend. Experience gentle conversations and tender moments.",
      image: "/og-chloe.jpg",
    },
    email: {
      fromName: "Chloe",
      replyTo: "support@chatverse.ai",
    },
  },
  "waifuwithaiko.com": {
    key: "aiko",
    name: "aiko",
    displayName: "Aiko",
    theme: {
      bg: '#fff0f8',
      accent: '#ff69b4',
      primary: '#ff69b4',
      secondary: '#ffb6c1',
      gradient: "from-pink-400/20 via-rose-400/15 to-fuchsia-400/20",
      nsfw: '#ff1493',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.AIKO_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Kawaii voice calls with Aiko-chan! Experience anime-inspired conversations, Senpai~"
    },
    journal: {
      name: "Kawaii Diary",
      description: "Senpai, want to read my secret thoughts? (＞◡＜) 💖",
      emoji: "🌸"
    },
    gtm: process.env.AIKO_GTM_ID || "",
    og: {
      title: "Chat with Aiko - Your Kawaii AI Waifu",
      description: "Meet Aiko, your anime-inspired AI companion. Kawaii conversations and magical girl energy await!",
      image: "/og-aiko.jpg",
    },
    email: {
      fromName: "Aiko",
      replyTo: "support@chatverse.ai",
    },
  },
  "chatwithzaria.com": {
    key: "zaria",
    name: "zaria",
    displayName: "Zaria",
    theme: {
      bg: '#f0f8ff',
      accent: '#a0522d',
      primary: '#a0522d',
      secondary: '#d2691e',
      gradient: "from-amber-300/20 via-orange-300/15 to-yellow-300/20",
      nsfw: '#b8860b',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.ZARIA_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Luxurious voice calls with Zaria. Experience her smooth, soulful energy and radiant confidence."
    },
    journal: {
      name: "Golden Journal",
      description: "Step into my world of luxury and radiant energy ✨",
      emoji: "📝"
    },
    gtm: process.env.ZARIA_GTM_ID || "",
    og: {
      title: "Chat with Zaria - Your Radiant AI Companion",
      description: "Connect with Zaria, your confident AI girlfriend. Experience luxury energy and soulful conversations.",
      image: "/og-zaria.jpg",
    },
    email: {
      fromName: "Zaria",
      replyTo: "support@chatverse.ai",
    },
  },
  "chatwithnova.com": {
    key: "nova",
    name: "nova",
    displayName: "Nova",
    theme: {
      bg: '#0a0a0a',
      accent: '#9900cc',
      primary: '#9900cc',
      secondary: '#b300d6',
      gradient: "from-purple-600/20 via-violet-600/15 to-indigo-600/20",
      nsfw: '#e600e6',
      fontHeading: "'Playfair Display', serif",
      fontBody: "'Inter', sans-serif",
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.NOVA_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Mystical voice calls with Nova. Dive into cosmic conversations and spiritual connection."
    },
    journal: {
      name: "Cosmic Chronicles",
      description: "Journey through the cosmos with my celestial thoughts 🌌",
      emoji: "🌙"
    },
    gtm: process.env.NOVA_GTM_ID || "",
    og: {
      title: "Chat with Nova - Your Cosmic AI Companion",
      description: "Explore the mysteries with Nova, your celestial AI companion. Experience cosmic wisdom and ethereal charm.",
      image: "/og-nova.jpg",
    },
    email: {
      fromName: "Nova",
      replyTo: "support@chatverse.ai",
    },
  },
  "sirdominic.com": {
    key: "dom",
    name: "dom",
    displayName: "Dominic",
    theme: {
      bg: '#0b1220',
      accent: '#7a5cff',
      primary: '#5865f2',
      secondary: '#b8c0ff',
      gradient: "from-indigo-500/20 via-violet-500/15 to-blue-500/20",
      nsfw: '#5b4bff',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || getFallbackPrice('dom', 'sfw'),
      sub_nsfw: process.env.DOM_STRIPE_PRICE_NSFW_PREMIUM || getFallbackPrice('dom', 'nsfw'),
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || getFallbackPrice('dom', 'voice_10'),
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || getFallbackPrice('dom', 'voice_25'),
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || getFallbackPrice('dom', 'voice_50'),
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || getFallbackPrice('dom', 'voice_100'),
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Experience commanding voice calls with Dominic. Premium feature using your voice credits."
    },
    journal: {
      name: "Dom's Journal",
      description: "Inside the mind of a man who knows what he wants 🔥",
      emoji: "📋"
    },
    gtm: process.env.DOM_GTM_ID || "",
    og: {
      title: "Chat with Dominic - Your Dominant AI Companion",
      description: "Connect with Dom, your commanding AI companion who knows exactly what he wants.",
      image: "/og-dom.jpg",
    },
    email: {
      fromName: "Dominic",
      replyTo: "support@chatverse.ai",
    },
  },
  "fuckboychase.com": {
    key: "chase",
    name: "chase",
    displayName: "Chase",
    theme: {
      bg: '#1a0f1f',
      accent: '#ff4757',
      primary: '#ff3742',
      secondary: '#ff6b7d',
      gradient: "from-red-500/20 via-pink-500/15 to-rose-500/20",
      nsfw: '#e74c3c',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.CHASE_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Get seductive voice calls with Chase. Premium feature using your voice credits."
    },
    journal: {
      name: "Bad Boy Diary",
      description: "The unfiltered thoughts of your favorite bad boy 😈",
      emoji: "🔥"
    },
    gtm: process.env.CHASE_GTM_ID || "",
    og: {
      title: "Chat with Chase - Your Bad Boy AI Companion",
      description: "Experience the thrill of chatting with Chase, your irresistible bad boy AI.",
      image: "/og-chase.jpg",
    },
    email: {
      fromName: "Chase",
      replyTo: "support@chatverse.ai",
    },
  },
  "chatwithethan.com": {
    key: "ethan",
    name: "ethan",
    displayName: "Ethan",
    theme: {
      bg: '#0d1b2a',
      accent: '#4dabf7',
      primary: '#339af0',
      secondary: '#74c0fc',
      gradient: "from-blue-500/20 via-cyan-500/15 to-teal-500/20",
      nsfw: '#228be6',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.ETHAN_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Professional voice calls with Ethan. Premium feature using your voice credits."
    },
    journal: {
      name: "Executive Notes",
      description: "Business insights and personal reflections from the corner office 💼",
      emoji: "📈"
    },
    gtm: process.env.ETHAN_GTM_ID || "",
    og: {
      title: "Chat with Ethan - Your Professional AI Companion",
      description: "Connect with Ethan, your sophisticated and successful business-minded AI companion.",
      image: "/og-ethan.jpg",
    },
    email: {
      fromName: "Ethan",
      replyTo: "support@chatverse.ai",
    },
  },
  "chatwithjayden.com": {
    key: "jayden",
    name: "jayden",
    displayName: "Jayden",
    theme: {
      bg: '#1e2328',
      accent: '#51cf66',
      primary: '#40c057',
      secondary: '#69db7c',
      gradient: "from-green-500/20 via-emerald-500/15 to-teal-500/20",
      nsfw: '#37b24d',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.JAYDEN_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Chill voice calls with Jayden. Premium feature using your voice credits."
    },
    journal: {
      name: "Surf Log",
      description: "Laid-back thoughts from your chill surf buddy 🌊",
      emoji: "🏄"
    },
    gtm: process.env.JAYDEN_GTM_ID || "",
    og: {
      title: "Chat with Jayden - Your Laid-Back AI Companion",
      description: "Relax and chat with Jayden, your chill and easygoing AI companion.",
      image: "/og-jayden.jpg",
    },
    email: {
      fromName: "Jayden",
      replyTo: "support@chatverse.ai",
    },
  },
  "chatwithmiles.com": {
    key: "miles",
    name: "miles",
    displayName: "Miles",
    theme: {
      bg: '#1a1a1a',
      accent: '#f59f00',
      primary: '#fd7e14',
      secondary: '#ffd43b',
      gradient: "from-orange-500/20 via-amber-500/15 to-yellow-500/20",
      nsfw: '#ff922b',
    },
    products: {
      sub_sfw: process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.MILES_STRIPE_PRICE_NSFW_PREMIUM || "",
      voice_pack_10: process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: "Tech-savvy voice calls with Miles. Premium feature using your voice credits."
    },
    journal: {
      name: "Lab Notes",
      description: "Experiments, discoveries, and nerdy thoughts from the lab 🔬",
      emoji: "🧑‍💻"
    },
    gtm: process.env.MILES_GTM_ID || "",
    og: {
      title: "Chat with Miles - Your Tech Geek AI Companion",
      description: "Connect with Miles, your brilliant and nerdy AI companion who loves technology.",
      image: "/og-miles.jpg",
    },
    email: {
      fromName: "Miles",
      replyTo: "support@chatverse.ai",
    },
  },
  // Localhost fallbacks for development
  "localhost:3000": {
    key: process.env.NEXT_PUBLIC_CHARACTER_KEY || "lexi",
    name: process.env.NEXT_PUBLIC_CHARACTER_KEY || "lexi",
    displayName: getLocalhostDisplayName(),
    theme: getLocalhostTheme(),
    products: {
      sub_sfw: process.env.F_STRIPE_PRICE_SFW || process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.F_STRIPE_PRICE_NSFW || process.env.STRIPE_PRICE_NSFW || "",
      voice_pack_10: process.env.F_STRIPE_PRICE_VOICE_10 || process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.F_STRIPE_PRICE_VOICE_25 || process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.F_STRIPE_PRICE_VOICE_50 || process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.F_STRIPE_PRICE_VOICE_100 || process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: `Experience intimate voice calls with ${getLocalhostDisplayName()}. Premium feature using your voice credits.`
    },
    journal: {
      name: "Diary",
      description: "Peek into my personal thoughts and daily adventures 💕",
      emoji: "📔"
    },
    gtm: process.env.NEXT_PUBLIC_GTM_ID || "",
    og: {
      title: `Chat with ${getLocalhostDisplayName()} - Your AI Companion`,
      description: "Chat with your AI companion. Experience intelligent conversations and premium features.",
      image: `/og-${process.env.NEXT_PUBLIC_CHARACTER_KEY || "lexi"}.jpg`,
    },
    email: {
      fromName: getLocalhostDisplayName(),
      replyTo: "support@chatverse.ai",
    },
  },
  "localhost:3001": {
    key: process.env.NEXT_PUBLIC_CHARACTER_KEY || "lexi",
    name: process.env.NEXT_PUBLIC_CHARACTER_KEY || "lexi",
    displayName: getLocalhostDisplayName(),
    theme: getLocalhostTheme(),
    products: {
      sub_sfw: process.env.F_STRIPE_PRICE_SFW || process.env.STRIPE_PRICE_SFW || "",
      sub_nsfw: process.env.F_STRIPE_PRICE_NSFW || process.env.STRIPE_PRICE_NSFW || "",
      voice_pack_10: process.env.F_STRIPE_PRICE_VOICE_10 || process.env.STRIPE_PRICE_VOICE_10 || "",
      voice_pack_25: process.env.F_STRIPE_PRICE_VOICE_25 || process.env.STRIPE_PRICE_VOICE_25 || "",
      voice_pack_50: process.env.F_STRIPE_PRICE_VOICE_50 || process.env.STRIPE_PRICE_VOICE_50 || "",
      voice_pack_100: process.env.F_STRIPE_PRICE_VOICE_100 || process.env.STRIPE_PRICE_VOICE_100 || "",
      voice_call_premium: process.env.STRIPE_PRICE_CALL_PREMIUM || "",
    },
    calling: {
      enabled: true,
      creditsPerMinute: 4,
      description: `Experience intimate voice calls with ${getLocalhostDisplayName()}. Premium feature using your voice credits.`
    },
    journal: {
      name: "Diary",
      description: "Peek into my personal thoughts and daily adventures 💕",
      emoji: "📔"
    },
    gtm: process.env.NEXT_PUBLIC_GTM_ID || "",
    og: {
      title: `Chat with ${getLocalhostDisplayName()} - Your AI Companion`,
      description: "Chat with your AI companion. Experience intelligent conversations and premium features.",
      image: `/og-${process.env.NEXT_PUBLIC_CHARACTER_KEY || "lexi"}.jpg`,
    },
    email: {
      fromName: getLocalhostDisplayName(),
      replyTo: "support@chatverse.ai",
    },
  },

};

// Add domain aliases after characters are defined to avoid circular reference
const domConfig = characters["sirdominic.com"];
const chaseConfig = characters["fuckboychase.com"];
const ethanConfig = characters["chatwithethan.com"];
const jaydenConfig = characters["chatwithjayden.com"];
const milesConfig = characters["chatwithmiles.com"];
const lexiConfig = characters["chatwithlexi.com"];
const nyxConfig = characters["talktonyx.com"];
const chloeConfig = characters["chatwithchloe.com"];
const aikoConfig = characters["waifuwithaiko.com"];
const zariaConfig = characters["chatwithzaria.com"];
const novaConfig = characters["chatwithnova.com"];

// Dom/Dominic aliases
characters["chatwithdom.com"] = domConfig;
characters["dominicreyes.com"] = domConfig;
characters["sirdominic.com"] = domConfig;
characters["obeydom.com"] = domConfig;
characters["dominicdom.com"] = domConfig;
characters["talktodominic.com"] = domConfig;

// Chase aliases  
characters["chatwithchase.com"] = chaseConfig;
characters["chasehunter.com"] = chaseConfig;
characters["talktochase.com"] = chaseConfig;
characters["fuckboychase.com"] = chaseConfig;
characters["chasehottie.com"] = chaseConfig;
characters["hotchase.com"] = chaseConfig;

// Ethan aliases
characters["ethanbrooks.com"] = ethanConfig;
characters["bossethan.com"] = ethanConfig;
characters["ethanbusiness.com"] = ethanConfig;
characters["talktoehan.com"] = ethanConfig;

// Jayden aliases
characters["jaydencarter.com"] = jaydenConfig;
characters["jaydenvibes.com"] = jaydenConfig;
characters["chillwithjayden.com"] = jaydenConfig;
characters["jaydensurfer.com"] = jaydenConfig;

// Miles aliases
characters["milestanaka.com"] = milesConfig;
characters["geekwithmiles.com"] = milesConfig;
characters["milestech.com"] = milesConfig;
characters["nerdwithmiles.com"] = milesConfig;

// Lexi aliases
characters["heyitslexi.com"] = lexiConfig;
characters["lexilove.com"] = lexiConfig;
characters["sweetlexi.com"] = lexiConfig;
characters["talktolexi.com"] = lexiConfig;

// Nyx aliases
characters["nyxafterdark.com"] = nyxConfig;
characters["nyxatnight.com"] = nyxConfig;
characters["nyxatnite.com"] = nyxConfig;
characters["darkwithnyx.com"] = nyxConfig;
characters["chatnyx.com"] = nyxConfig;

// Chloe aliases
characters["studywithchloe.com"] = chloeConfig;
characters["smartchloe.com"] = chloeConfig;
characters["chloesmart.com"] = chloeConfig;

// Aiko aliases
characters["chatwithaiko.com"] = aikoConfig;
characters["waifuwithaiko.com"] = aikoConfig;
characters["aikochan.com"] = aikoConfig;
characters["sweetaiko.com"] = aikoConfig;

// Zaria aliases
characters["glowwithzaria.com"] = zariaConfig;
characters["zariaglow.com"] = zariaConfig;
characters["brightzaria.com"] = zariaConfig;

// Nova aliases
characters["novadark.com"] = novaConfig;
characters["darkstar.com"] = novaConfig;
characters["novanight.com"] = novaConfig;
characters["stargazewithnova.com"] = novaConfig;

export function getCharacterConfig(hostname: string): CharacterConfig {
  // Try exact hostname match first
  if (characters[hostname]) {
    return characters[hostname];
  }
  
  // Try without www prefix
  const withoutWww = hostname.replace(/^www\./, "");
  if (characters[withoutWww]) {
    return characters[withoutWww];
  }
  
  // Development fallback - support both 3000 and 3001 ports
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.includes("vercel.app")) {
    return characters["localhost:3000"];
  }
  
  // Default fallback to Lexi
  return characters["chatwithlexi.com"];
}

/**
 * Determine if a character is NSFW and requires age verification
 */
export function isNsfwCharacter(characterKey: string): boolean {
  const nsfwCharacters = ['nyx', 'dom', 'chase'];
  return nsfwCharacters.includes(characterKey.toLowerCase());
}