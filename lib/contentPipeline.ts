// lib/contentPipeline.ts
// Content Pipeline System for Automated Character Content Generation

import { ConsistentPromptBuilder } from './faceConsistency';

export interface CharacterBible {
  id: string;
  character_key: string;
  display_name: string;
  physical_traits: {
    appearance: string[];
    hair: string[];
    eyes: string[];
    style: string[];
    body_type: string[];
  };
  personality_traits: {
    core_traits: string[];
    speaking_style: string[];
    behaviors: string[];
    interests: string[];
  };
  visual_aesthetics: {
    color_palette: string[];
    fashion_style: string[];
    environments: string[];
    lighting: string[];
    mood_themes: string[];
  };
  content_themes: {
    daily_life: string[];
    interactions: string[];
    activities: string[];
    seasonal: string[];
    special_occasions: string[];
  };
  style_guidelines: {
    art_style: string;
    quality_standards: string[];
    avoid_themes: string[];
    brand_consistency: string[];
  };
  brand_colors: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
  };
  content_settings: {
    post_frequency: number; // posts per week
    platforms: string[];
    content_mix: Record<string, number>; // percentage breakdown
    optimal_times: string[];
  };
  prompt_templates: {
    image_base: string;
    video_base: string;
    style_suffix: string;
    quality_modifiers: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface ContentGenerationQueue {
  id: string;
  character_key: string;
  content_type: 'image' | 'video' | 'batch';
  generation_prompt: string;
  prompt_data: {
    mood?: string;
    setting?: string;
    activity?: string;
    style_modifiers?: string[];
    technical_specs?: Record<string, any>;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number; // 1-10
  batch_id?: string;
  output_urls: string[];
  generation_metadata: {
    model_used?: string;
    generation_time?: number;
    parameters?: Record<string, any>;
    cost?: number;
  };
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ContentLibrary {
  id: string;
  character_key: string;
  content_type: 'image' | 'video' | 'gif';
  title?: string;
  file_url: string;
  thumbnail_url?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    file_size?: number;
    format?: string;
  };
  tags: string[];
  mood?: string;
  aesthetic?: string;
  is_nsfw: boolean;
  quality_score?: number; // 1-10
  usage_count: number;
  last_used_at?: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface ContentSchedule {
  id: string;
  character_key: string;
  content_id: string;
  platform: 'tiktok' | 'instagram' | 'twitter' | 'youtube';
  scheduled_for: string;
  caption?: string;
  hashtags: string[];
  status: 'scheduled' | 'posted' | 'failed' | 'cancelled';
  posted_at?: string;
  platform_post_id?: string;
  engagement_data: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ContentAnalytics {
  id: string;
  content_id: string;
  character_key: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate?: number;
  conversion_rate?: number;
  revenue_attributed: number;
  recorded_at: string;
}

// Priority Character Configurations - All 11 Characters
export const PRIORITY_CHARACTERS = [
  // Tier 1: Proven performers & underserved markets
  'lexi',   // Proven performer
  'nyx',    // Dark market underserved
  'aiko',   // Anime/waifu high spending
  'dom',    // Male dom market gap
  
  // Tier 2: Broad appeal & trending
  'chase',  // Bad boy broad appeal
  'zaria',  // Luxury market
  'chloe',  // Soft girl trending
  'nova',   // Cosmic/mystical niche
  
  // Tier 3: Professional & lifestyle
  'ethan',  // Business professional
  'jayden', // Chill/laid-back
  'miles'   // Tech geek/nerdy
] as const;

export type PriorityCharacter = typeof PRIORITY_CHARACTERS[number];

// Content Generation Prompt Builder
export class PromptBuilder {
  private bible: CharacterBible;
  
  constructor(bible: CharacterBible) {
    this.bible = bible;
  }

  buildImagePrompt(options: {
    mood?: string;
    setting?: string;
    activity?: string;
    style?: string;
    isNSFW?: boolean;
    provider?: 'dalle' | 'replicate' | 'midjourney';
  }): string {
    const { mood, setting, activity, style, isNSFW, provider = 'dalle' } = options;
    
    // Build base prompt with character traits
    const basePrompt = this.bible.prompt_templates.image_base;
    const physicalTraits = this.bible.physical_traits.appearance.join(', ');
    const aesthetics = this.bible.visual_aesthetics.fashion_style.join(', ');
    
    let prompt = `${basePrompt}, ${physicalTraits}, ${aesthetics}`;
    
    if (mood) prompt += `, ${mood} mood`;
    if (setting) prompt += `, in ${setting}`;
    if (activity) prompt += `, ${activity}`;
    if (style) prompt += `, ${style} style`;
    
    // Add quality and style modifiers
    const qualityModifiers = this.bible.prompt_templates.quality_modifiers.join(', ');
    prompt += `, ${qualityModifiers}`;
    
    // Add style suffix
    prompt += `, ${this.bible.prompt_templates.style_suffix}`;
    
    // NSFW content guidelines
    if (isNSFW && !this.bible.style_guidelines.avoid_themes.includes('nsfw')) {
      prompt += ', sensual, intimate';
    }
    
    // ✨ USE FACE CONSISTENCY SYSTEM FOR CHARACTER MATCHING
    try {
      const consistentResult = ConsistentPromptBuilder.buildImagePrompt({
        characterKey: this.bible.character_key,
        basePrompt: prompt,
        mood,
        setting,
        activity,
        provider
      });
      
      // Return the face-consistent prompt
      return consistentResult.prompt;
    } catch (error) {
      console.warn('Face consistency system failed, using basic prompt:', error);
      return prompt;
    }
  }

  buildVideoPrompt(baseImageUrl: string, options: {
    motion_type?: string;
    duration?: number;
    mood?: string;
  }): string {
    const { motion_type = 'subtle movement', duration = 3, mood } = options;
    
    let prompt = `Convert this image to a ${duration}s video with ${motion_type}`;
    
    if (mood) {
      prompt += `, capturing ${mood} energy`;
    }
    
    // Add character-specific motion guidelines
    const videoBase = this.bible.prompt_templates.video_base;
    if (videoBase) {
      prompt += `, ${videoBase}`;
    }
    
    return prompt;
  }

  generateBatchPrompts(count: number, theme?: string): string[] {
    const prompts: string[] = [];
    const moods = this.bible.visual_aesthetics.mood_themes;
    const settings = this.bible.visual_aesthetics.environments;
    const activities = this.bible.content_themes.daily_life;
    
    for (let i = 0; i < count; i++) {
      const mood = moods[Math.floor(Math.random() * moods.length)];
      const setting = settings[Math.floor(Math.random() * settings.length)];
      const activity = activities[Math.floor(Math.random() * activities.length)];
      
      const prompt = this.buildImagePrompt({
        mood,
        setting,
        activity,
        style: theme
      });
      
      prompts.push(prompt);
    }
    
    return prompts;
  }
}

// Content Pipeline Utilities
export const ContentPipelineUtils = {
  
  // Generate weekly content batch for character
  generateWeeklyBatch: (characterKey: string, bible: CharacterBible) => {
    const promptBuilder = new PromptBuilder(bible);
    const settings = bible.content_settings;
    const postsPerWeek = settings.post_frequency;
    
    return promptBuilder.generateBatchPrompts(postsPerWeek);
  },

  // Calculate optimal posting times based on character audience
  getOptimalPostingTimes: (characterKey: string): string[] => {
    const timeSlots = {
      'lexi': ['9:00', '15:00', '21:00'], // Peak female audience times
      'nyx': ['22:00', '14:00', '18:00'], // Night owl + afternoon crowd
      'aiko': ['16:00', '20:00', '12:00'], // Anime fan peak times
      'dom': ['7:00', '18:00', '23:00'],  // Professional + evening
      'chase': ['12:00', '17:00', '22:00'], // Gen Z peak times
      'zaria': ['8:00', '13:00', '19:00'], // Luxury lifestyle times
      'chloe': ['10:00', '16:00', '20:00']  // Soft girl aesthetic times
    };
    
    return timeSlots[characterKey as keyof typeof timeSlots] || ['12:00', '18:00', '21:00'];
  },

  // Generate hashtags based on character and content
  generateHashtags: (characterKey: string, contentType: string, mood?: string): string[] => {
    const baseHashtags = {
      'lexi': ['#latina', '#baddie', '#glam', '#aicompanion'],
      'nyx': ['#goth', '#dark', '#aesthetic', '#altgirl'],
      'aiko': ['#anime', '#waifu', '#kawaii', '#otaku'],
      'dom': ['#dominant', '#alpha', '#suit', '#gentleman'],
      'chase': ['#badboy', '#rebel', '#motorcycle', '#edge'],
      'zaria': ['#luxury', '#sophisticated', '#queen', '#elegance'],
      'chloe': ['#softgirl', '#cozy', '#books', '#aesthetic']
    };
    
    let hashtags = baseHashtags[characterKey as keyof typeof baseHashtags] || ['#ai', '#companion'];
    
    // Add content type tags
    if (contentType === 'video') {
      hashtags.push('#reels', '#video', '#trending');
    } else {
      hashtags.push('#photo', '#ai', '#generated');
    }
    
    // Add mood tags
    if (mood) {
      hashtags.push(`#${mood.toLowerCase()}`);
    }
    
    return hashtags;
  }
};