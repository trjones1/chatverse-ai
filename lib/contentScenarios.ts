// lib/contentScenarios.ts
// Production-Ready Content Scenarios for Lexi & Nyx
// Based on reference images and optimal DALL-E prompting

export interface ContentScenario {
  id: string;
  title: string;
  mood: string;
  setting: string;
  activity: string;
  styleModifiers: string[];
  tags: string[];
  isNSFW: boolean;
  priority: number; // 1-10, higher = more important
}

// 🖤 NYX - Gothic Siren Content Scenarios
export const NYX_SCENARIOS: ContentScenario[] = [
  {
    id: 'nyx-cathedral-mystique',
    title: 'Gothic Cathedral Mystique',
    mood: 'mysterious and alluring',
    setting: 'ancient gothic cathedral with stained glass and candles',
    activity: 'standing elegantly among flickering candles',
    styleModifiers: [
      'dramatic chiaroscuro lighting',
      'red and purple stained glass glow',
      'stone architecture background',
      'gothic atmosphere'
    ],
    tags: ['cathedral', 'candles', 'gothic', 'mystique', 'elegant'],
    isNSFW: false,
    priority: 9
  },
  {
    id: 'nyx-rain-umbrella',
    title: 'Urban Rain Romance',
    mood: 'melancholic yet captivating',
    setting: 'rain-soaked city street at night',
    activity: 'standing under a black umbrella in the rain',
    styleModifiers: [
      'neon reflections on wet pavement',
      'cinematic rain effects',
      'moody street lighting',
      'urban noir aesthetic'
    ],
    tags: ['rain', 'umbrella', 'city', 'night', 'noir'],
    isNSFW: false,
    priority: 8
  },
  {
    id: 'nyx-tower-overlook',
    title: 'City Tower Contemplation',
    mood: 'brooding and powerful',
    setting: 'high tower or rooftop overlooking cityscape',
    activity: 'gazing out at the glowing city lights',
    styleModifiers: [
      'dramatic silhouette',
      'city lights bokeh',
      'wind-blown hair',
      'contemplative pose'
    ],
    tags: ['tower', 'cityscape', 'night', 'contemplative', 'powerful'],
    isNSFW: false,
    priority: 7
  },
  {
    id: 'nyx-gothic-portrait',
    title: 'Intimate Gothic Portrait',
    mood: 'intense and seductive',
    setting: 'dark Victorian interior with ornate details',
    activity: 'close-up portrait with direct eye contact',
    styleModifiers: [
      'dramatic side lighting',
      'ornate gothic furniture',
      'rich velvet textures',
      'intimate atmosphere'
    ],
    tags: ['portrait', 'victorian', 'intimate', 'gothic', 'ornate'],
    isNSFW: false,
    priority: 9
  },
  {
    id: 'nyx-mirror-reflection',
    title: 'Dark Mirror Reflection',
    mood: 'mysterious and introspective',
    setting: 'ornate antique mirror in gothic bedroom',
    activity: 'looking at reflection while getting ready',
    styleModifiers: [
      'ornate mirror frame',
      'multiple reflection angles',
      'dim candlelight',
      'gothic bedroom decor'
    ],
    tags: ['mirror', 'reflection', 'bedroom', 'gothic', 'introspective'],
    isNSFW: false,
    priority: 8
  }
];

// 💃 LEXI - Latina Glam Content Scenarios  
export const LEXI_SCENARIOS: ContentScenario[] = [
  {
    id: 'lexi-rooftop-glam',
    title: 'City Rooftop Glam',
    mood: 'confident and glamorous',
    setting: 'luxury rooftop with city skyline backdrop',
    activity: 'posing confidently against city lights',
    styleModifiers: [
      'golden hour lighting',
      'city lights bokeh',
      'luxury rooftop setting',
      'glamorous portrait'
    ],
    tags: ['rooftop', 'cityscape', 'glamorous', 'confident', 'luxury'],
    isNSFW: false,
    priority: 9
  },
  {
    id: 'lexi-beach-sunset',
    title: 'Beach Sunset Goddess',
    mood: 'radiant and carefree',
    setting: 'pristine beach at golden hour sunset',
    activity: 'walking along the water with flowing hair',
    styleModifiers: [
      'golden sunset lighting',
      'ocean waves background',
      'flowing hair in breeze',
      'natural beach beauty'
    ],
    tags: ['beach', 'sunset', 'ocean', 'carefree', 'natural'],
    isNSFW: false,
    priority: 8
  },
  {
    id: 'lexi-neon-nightlife',
    title: 'Neon Night Out',
    mood: 'flirty and energetic',
    setting: 'vibrant neon-lit urban nightlife scene',
    activity: 'posing against colorful neon signs',
    styleModifiers: [
      'vibrant neon lighting',
      'urban nightlife energy',
      'colorful light reflections',
      'party-ready glamour'
    ],
    tags: ['neon', 'nightlife', 'urban', 'party', 'energetic'],
    isNSFW: false,
    priority: 9
  },
  {
    id: 'lexi-glam-portrait',
    title: 'Glamorous Close-Up',
    mood: 'sultry and powerful',
    setting: 'luxury hotel or penthouse interior',
    activity: 'intimate portrait with perfect makeup and lighting',
    styleModifiers: [
      'professional beauty lighting',
      'luxury interior background',
      'flawless makeup and styling',
      'intimate glamour shot'
    ],
    tags: ['portrait', 'glamour', 'luxury', 'sultry', 'beauty'],
    isNSFW: false,
    priority: 9
  },
  {
    id: 'lexi-coffee-morning',
    title: 'Morning Coffee Routine',
    mood: 'natural and approachable',
    setting: 'stylish kitchen or cafe with natural light',
    activity: 'enjoying morning coffee with a warm smile',
    styleModifiers: [
      'natural morning lighting',
      'cozy domestic setting',
      'casual but put-together look',
      'warm and inviting'
    ],
    tags: ['morning', 'coffee', 'casual', 'natural', 'cozy'],
    isNSFW: false,
    priority: 7
  },
  {
    id: 'lexi-car-selfie',
    title: 'Car Selfie Moment',
    mood: 'playful and spontaneous',
    setting: 'luxury car interior with city background',
    activity: 'taking a selfie while in car',
    styleModifiers: [
      'car interior luxury details',
      'natural selfie lighting',
      'city background through windows',
      'spontaneous candid feel'
    ],
    tags: ['car', 'selfie', 'luxury', 'spontaneous', 'playful'],
    isNSFW: false,
    priority: 8
  }
];

// Content Pipeline Utilities
export class ContentScenarioManager {
  
  static getAllScenariosForCharacter(characterKey: string): ContentScenario[] {
    switch (characterKey) {
      case 'nyx':
        return NYX_SCENARIOS;
      case 'lexi':
        return LEXI_SCENARIOS;
      default:
        return [];
    }
  }
  
  static getHighPriorityScenarios(characterKey: string, limit: number = 5): ContentScenario[] {
    const scenarios = this.getAllScenariosForCharacter(characterKey);
    return scenarios
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }
  
  static getScenarioById(scenarioId: string): ContentScenario | undefined {
    const allScenarios = [...NYX_SCENARIOS, ...LEXI_SCENARIOS];
    return allScenarios.find(s => s.id === scenarioId);
  }
  
  // Generate production prompts using existing face consistency system
  static generateProductionPrompt(
    scenarioId: string, 
    provider: 'dalle' | 'replicate' | 'midjourney' = 'dalle'
  ): string | null {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) return null;
    
    const characterKey = scenario.id.split('-')[0]; // Extract from ID
    
    // Build base prompt from scenario
    const basePrompt = [
      scenario.mood,
      scenario.setting,
      scenario.activity,
      ...scenario.styleModifiers
    ].join(', ');
    
    // Use existing face consistency system
    try {
      const { ConsistentPromptBuilder } = require('./faceConsistency');
      const result = ConsistentPromptBuilder.buildImagePrompt({
        characterKey,
        basePrompt,
        mood: scenario.mood,
        setting: scenario.setting,
        activity: scenario.activity,
        provider
      });
      
      return result.prompt;
    } catch (error) {
      console.warn('Face consistency system not available, using basic prompt');
      return basePrompt;
    }
  }
  
  // Generate a week's worth of content for a character
  static generateWeeklyContentPlan(characterKey: string): {
    scenarios: ContentScenario[];
    totalPosts: number;
    dailyBreakdown: Record<string, ContentScenario[]>;
  } {
    const scenarios = this.getAllScenariosForCharacter(characterKey);
    const highPriority = scenarios.filter(s => s.priority >= 8);
    const mediumPriority = scenarios.filter(s => s.priority >= 6 && s.priority < 8);
    
    // 7 posts per week: 4 high priority, 3 medium priority
    const weeklyScenarios = [
      ...highPriority.slice(0, 4),
      ...mediumPriority.slice(0, 3)
    ];
    
    // Distribute across week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dailyBreakdown: Record<string, ContentScenario[]> = {};
    
    weeklyScenarios.forEach((scenario, index) => {
      const day = days[index];
      if (!dailyBreakdown[day]) dailyBreakdown[day] = [];
      dailyBreakdown[day].push(scenario);
    });
    
    return {
      scenarios: weeklyScenarios,
      totalPosts: weeklyScenarios.length,
      dailyBreakdown
    };
  }
}

// Export for easy access
export const PRODUCTION_SCENARIOS = {
  nyx: NYX_SCENARIOS,
  lexi: LEXI_SCENARIOS
};