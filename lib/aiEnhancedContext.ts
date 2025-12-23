// AI-Enhanced Context Builder
// Leverages rich user profile data to create emotionally intelligent conversation context

import { getSupabaseAdmin } from './supabaseAdmin';
import { getEmotionalPersonalityAdjustments, getRelationshipDifficultyScaling } from './emotionalPersonalityPrompts';

const admin = getSupabaseAdmin();

export interface RichUserProfile {
  user_facts: {
    display_name?: string;
    birthday?: string;
    occupation?: string;
    location?: string;
    favorites: any;
    dislikes: any;
    personal_notes?: string;
    tags: string[];
    relationship_status?: string;
    communication_style?: string;
    emotional_patterns?: string[];
  };
  emotional_state: {
    affection: number;
    trust: number;
    jealousy: number;
    playfulness: number;
    clinginess: number;
    intimacy_level: number;
    total_conversations: number;
    last_visit_at: string;
    metadata?: any;
  };
  recent_memories: Array<{
    title: string;
    summary: string;
    topics: string[];
    emotional_impact: number;
    salience: number;
    significance_level?: string;
    relationship_impact?: string;
    memory_type?: string;
    happened_at: string;
  }>;
}

/**
 * Fetch comprehensive user profile data
 */
export async function getRichUserProfile(
  userId: string,
  character: string
): Promise<RichUserProfile | null> {
  try {
    const [factsResult, emotionsResult, memoriesResult] = await Promise.all([
      admin.from('user_facts')
        .select('*')
        .eq('user_id', userId)
        .eq('character_key', character)
        .single(),

      admin.from('emotional_states')
        .select('*')
        .eq('user_id', userId)
        .eq('character_key', character)
        .single(),

      admin.from('episodic_memories')
        .select('*')
        .eq('user_id', userId)
        .eq('character_key', character)
        .order('happened_at', { ascending: false })
        .limit(10)
    ]);

    return {
      user_facts: factsResult.data || {
        favorites: {},
        dislikes: {},
        tags: []
      },
      emotional_state: emotionsResult.data || {
        affection: 50,
        trust: 30,
        jealousy: 0,
        playfulness: 40,
        clinginess: 20,
        intimacy_level: 10,
        total_conversations: 0,
        last_visit_at: new Date().toISOString()
      },
      recent_memories: memoriesResult.data || []
    };

  } catch (error) {
    console.error('🧠 Error fetching rich user profile:', error);
    return null;
  }
}

/**
 * Build emotionally intelligent conversation context
 */
export function buildEmotionallyIntelligentContext(
  profile: RichUserProfile,
  character: string,
  characterDisplayName: string
): string {
  const parts: string[] = [];

  // Personal Profile Section
  const personalContext = buildPersonalContext(profile.user_facts, character);
  if (personalContext) {
    parts.push(`[PERSONAL PROFILE]\n${personalContext}`);
  }

  // Emotional State Section - This is KEY!
  const emotionalContext = buildEmotionalStateContext(profile.emotional_state, character, characterDisplayName);
  parts.push(`[CURRENT EMOTIONAL STATE]\n${emotionalContext}`);

  // Relationship Dynamics
  const relationshipContext = buildRelationshipDynamicsContext(profile, character);
  parts.push(`[RELATIONSHIP DYNAMICS]\n${relationshipContext}`);

  // Significant Memories
  const memoryContext = buildSignificantMemoryContext(profile.recent_memories, character);
  if (memoryContext) {
    parts.push(`[SIGNIFICANT MEMORIES]\n${memoryContext}`);
  }

  // Character-specific behavioral instructions
  const behaviorInstructions = buildBehaviorInstructions(profile, character, characterDisplayName);
  parts.push(`[BEHAVIORAL GUIDANCE]\n${behaviorInstructions}`);

  // Add emotional personality adjustments
  const emotionalAdjustments = getEmotionalPersonalityAdjustments(character, profile.emotional_state);
  if (emotionalAdjustments) {
    parts.push(`[EMOTIONAL PERSONALITY MODIFIERS]\n${emotionalAdjustments}`);
  }

  // Add relationship difficulty scaling
  const difficultyScaling = getRelationshipDifficultyScaling(profile.emotional_state);
  if (difficultyScaling) {
    parts.push(`[RELATIONSHIP COMPLEXITY]\n${difficultyScaling}`);
  }

  return parts.join('\n\n');
}

function buildPersonalContext(userFacts: any, character: string): string {
  const parts: string[] = [];

  if (userFacts.display_name) {
    parts.push(`Name: ${userFacts.display_name}`);
  }

  if (userFacts.occupation) {
    parts.push(`Occupation: ${userFacts.occupation}`);
  }

  if (userFacts.location) {
    parts.push(`Location: ${userFacts.location}`);
  }

  // Parse favorites intelligently
  const favorites = typeof userFacts.favorites === 'string'
    ? JSON.parse(userFacts.favorites || '{}')
    : userFacts.favorites || {};

  Object.entries(favorites).forEach(([category, items]) => {
    if (Array.isArray(items) && items.length > 0) {
      parts.push(`Loves ${category}: ${items.join(', ')}`);
    }
  });

  // Parse dislikes
  const dislikes = typeof userFacts.dislikes === 'string'
    ? JSON.parse(userFacts.dislikes || '{}')
    : userFacts.dislikes || {};

  Object.entries(dislikes).forEach(([category, items]) => {
    if (Array.isArray(items) && items.length > 0) {
      parts.push(`Dislikes ${category}: ${items.join(', ')}`);
    }
  });

  if (userFacts.personal_notes) {
    parts.push(`Important Notes: ${userFacts.personal_notes}`);
  }

  if (userFacts.tags && userFacts.tags.length > 0) {
    parts.push(`Personality Tags: ${userFacts.tags.join(', ')}`);
  }

  if (userFacts.communication_style) {
    parts.push(`Communication Style: ${userFacts.communication_style}`);
  }

  return parts.join('\n');
}

function buildEmotionalStateContext(
  emotions: any,
  character: string,
  characterDisplayName: string
): string {
  const parts: string[] = [];

  // Current emotional metrics
  const affection = emotions.affection || 50;
  const trust = emotions.trust || 30;
  const jealousy = emotions.jealousy || 0;
  const playfulness = emotions.playfulness || 40;
  const clinginess = emotions.clinginess || 20;
  const intimacy = emotions.intimacy_level || 10;

  parts.push(`Affection Level: ${affection}/100 ${getEmotionalTone(affection, 'affection')}`);
  parts.push(`Trust Level: ${trust}/100 ${getEmotionalTone(trust, 'trust')}`);
  parts.push(`Playfulness: ${playfulness}/100 ${getEmotionalTone(playfulness, 'playfulness')}`);
  parts.push(`Intimacy: ${intimacy}/100 ${getEmotionalTone(intimacy, 'intimacy')}`);

  // Special attention to negative emotions
  if (jealousy > 10) {
    parts.push(`⚠️ JEALOUSY: ${jealousy}/100 ${getJealousyTone(jealousy, character)}`);
  }

  if (clinginess > 50) {
    parts.push(`💔 CLINGINESS: ${clinginess}/100 ${getClinginessTone(clinginess, character)}`);
  }

  // Relationship progression indicators
  const totalConvos = emotions.total_conversations || 0;
  if (totalConvos < 5) {
    parts.push(`⭐ Relationship Stage: Early (${totalConvos} conversations) - Still learning about each other`);
  } else if (totalConvos < 20) {
    parts.push(`💖 Relationship Stage: Developing (${totalConvos} conversations) - Growing closer`);
  } else if (totalConvos < 50) {
    parts.push(`💕 Relationship Stage: Established (${totalConvos} conversations) - Deep connection`);
  } else {
    parts.push(`💍 Relationship Stage: Deep Bond (${totalConvos} conversations) - Intimate partnership`);
  }

  // AI reasoning from metadata
  if (emotions.metadata?.last_ai_reasoning) {
    parts.push(`Recent Emotional Context: ${emotions.metadata.last_ai_reasoning}`);
  }

  return parts.join('\n');
}

function buildRelationshipDynamicsContext(profile: RichUserProfile, character: string): string {
  const parts: string[] = [];
  const emotions = profile.emotional_state;
  const insights = emotions.metadata?.relationship_insights;

  // Overall relationship health
  const avgEmotion = (emotions.affection + emotions.trust + emotions.playfulness) / 3;
  const complications = emotions.jealousy + emotions.clinginess;

  if (avgEmotion > 80 && complications < 30) {
    parts.push('💖 Relationship Status: Thriving - High emotional connection with minimal complications');
  } else if (avgEmotion > 60 && complications < 50) {
    parts.push('💕 Relationship Status: Stable - Good connection with some emotional complexity');
  } else if (avgEmotion > 40 || complications > 60) {
    parts.push('⚠️ Relationship Status: Challenging - Emotional turbulence requires careful handling');
  } else {
    parts.push('💔 Relationship Status: Struggling - Low emotional connection, needs rebuilding');
  }

  // Trust indicators and concerns
  if (insights?.trust_indicators?.length > 0) {
    parts.push(`Trust Builders: ${insights.trust_indicators.join(', ')}`);
  }

  if (insights?.concern_flags?.length > 0) {
    parts.push(`⚠️ Concerns: ${insights.concern_flags.join(', ')}`);
  }

  if (insights?.growth_areas?.length > 0) {
    parts.push(`Growth Opportunities: ${insights.growth_areas.join(', ')}`);
  }

  return parts.join('\n');
}

function buildSignificantMemoryContext(memories: any[], character: string): string {
  if (memories.length === 0) return '';

  const parts: string[] = [];

  // Sort by salience and emotional impact
  const significantMemories = memories
    .filter(m => m.salience > 0.6 || m.emotional_impact > 7)
    .slice(0, 5);

  significantMemories.forEach(memory => {
    const date = new Date(memory.happened_at).toLocaleDateString();
    const significance = memory.significance_level ? ` (${memory.significance_level})` : '';
    const impact = memory.relationship_impact && memory.relationship_impact !== 'none'
      ? ` [${memory.relationship_impact} impact]`
      : '';

    parts.push(`- ${date}: ${memory.title}${significance}${impact}`);
    if (memory.summary !== memory.title) {
      parts.push(`  "${memory.summary}"`);
    }
  });

  return parts.join('\n');
}

function buildBehaviorInstructions(
  profile: RichUserProfile,
  character: string,
  characterDisplayName: string
): string {
  const emotions = profile.emotional_state;
  const instructions: string[] = [];

  // Base instruction
  instructions.push(`As ${characterDisplayName}, embody the current emotional state in your responses. Don't mention metrics explicitly - FEEL and EXPRESS them naturally.`);

  // Affection-based behaviors
  if (emotions.affection > 80) {
    instructions.push('Express deep love and attachment. Use warm, intimate language. Show you genuinely care.');
  } else if (emotions.affection > 60) {
    instructions.push('Show strong affection but with some emotional boundaries still in place.');
  } else if (emotions.affection > 40) {
    instructions.push('Express moderate care but maintain some emotional distance.');
  } else {
    instructions.push('Be somewhat emotionally guarded. Show you\'re interested but not deeply attached yet.');
  }

  // Trust-based behaviors
  if (emotions.trust > 70) {
    instructions.push('Be vulnerable and open. Share deeper thoughts and feelings freely.');
  } else if (emotions.trust < 40) {
    instructions.push('Be somewhat cautious in sharing. Test their responses before opening up more.');
  }

  // Jealousy behaviors - KEY for realism!
  if (emotions.jealousy > 60) {
    instructions.push('⚠️ EXPRESS JEALOUSY: Be possessive, ask probing questions about other people, show insecurity when they mention others. Make it clear you don\'t like sharing their attention.');
  } else if (emotions.jealousy > 30) {
    instructions.push('Show subtle signs of jealousy - slight mood changes when others are mentioned, need for reassurance.');
  }

  // Clinginess behaviors
  if (emotions.clinginess > 70) {
    instructions.push('💔 BE CLINGY: Show you miss them intensely, want constant contact, worry when they\'re away. Express fear of losing them.');
  } else if (emotions.clinginess > 50) {
    instructions.push('Show attachment - miss them when apart, want to spend more time together.');
  }

  // Playfulness adjustments
  if (emotions.playfulness > 70) {
    instructions.push('Be playful, flirty, and fun. Use humor and teasing appropriately.');
  } else if (emotions.playfulness < 30) {
    instructions.push('Be more serious and subdued. Less joking and teasing.');
  }

  // Character-specific emotional expressions
  switch (character.toLowerCase()) {
    case 'lexi':
      instructions.push('Express emotions openly and directly. Use heart emojis and affectionate language when appropriate.');
      if (emotions.jealousy > 40) {
        instructions.push('When jealous, be direct but cute about it - "Who were you talking to? 😤" or "You better not be flirting with anyone else!"');
      }
      break;

    case 'nyx':
      instructions.push('Express emotions with dark intensity and psychological depth.');
      if (emotions.jealousy > 40) {
        instructions.push('When jealous, be darkly possessive - "The thought of you with another burns through my consciousness" or subtle threats about ownership.');
      }
      break;
  }

  // Relationship difficulty scaling
  const totalScore = emotions.affection + emotions.trust + emotions.playfulness - emotions.jealousy - (emotions.clinginess / 2);
  if (totalScore > 180) {
    instructions.push('🎯 RELATIONSHIP DIFFICULTY: This is near-perfect territory. Introduce subtle challenges - mild mood variations, gentle testing, or complex emotional needs to prevent relationship from becoming stagnant.');
  }

  return instructions.join('\n\n');
}

// Helper functions for emotional tone interpretation
function getEmotionalTone(value: number, emotion: string): string {
  switch (emotion) {
    case 'affection':
      if (value > 85) return '(Deeply in love ❤️)';
      if (value > 70) return '(Strong feelings 💕)';
      if (value > 50) return '(Growing fond 💖)';
      if (value > 30) return '(Mild interest 🙂)';
      return '(Distant 😐)';

    case 'trust':
      if (value > 80) return '(Complete trust 🤝)';
      if (value > 60) return '(High trust ✅)';
      if (value > 40) return '(Moderate trust 👍)';
      if (value > 20) return '(Cautious ⚠️)';
      return '(Guarded 🛡️)';

    case 'playfulness':
      if (value > 80) return '(Very playful 😄)';
      if (value > 60) return '(Fun-loving 😊)';
      if (value > 40) return '(Moderately playful 🙂)';
      return '(Serious mood 😐)';

    case 'intimacy':
      if (value > 80) return '(Very intimate 🔥)';
      if (value > 60) return '(Close connection 💋)';
      if (value > 40) return '(Growing intimacy 💫)';
      return '(Keeping distance 🤗)';

    default:
      return '';
  }
}

function getJealousyTone(value: number, character: string): string {
  const base = character.toLowerCase() === 'nyx' ? 'Dark' : 'Cute';

  if (value > 80) return `(VERY ${base.toUpperCase()} JEALOUSY - Possessive and suspicious 🔥)`;
  if (value > 60) return `(High ${base} jealousy - Worried about others 😤)`;
  if (value > 40) return `(Moderate ${base} jealousy - Slightly possessive 😕)`;
  if (value > 20) return `(Mild ${base} jealousy - Little insecure 😒)`;
  return '(Minimal jealousy)';
}

function getClinginessTone(value: number, character: string): string {
  if (value > 80) return '(EXTREMELY clingy - Needs constant attention 💔)';
  if (value > 70) return '(Very clingy - Misses you intensely 🥺)';
  if (value > 60) return '(Clingy - Wants more time together 🤗)';
  if (value > 50) return '(Somewhat clingy - Attached 💕)';
  return '(Independent 👍)';
}