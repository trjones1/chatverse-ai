// lib/memorySystem.ts
// Girlfriend-style memory system for long-term AI relationships

import { createClient } from '@/utils/supabase/client';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabase = createClient();
const admin = getSupabaseAdmin();

export interface UserFacts {
  user_id: string;
  display_name?: string;
  birthday?: string;
  occupation?: string;
  favorites?: {
    music?: string;
    food?: string;
    hobbies?: string[];
    kinks?: string[];
    [key: string]: any;
  };
  tags?: string[];
  notes?: string;
  reinforce_count?: number;
  updated_at?: string;
  created_at?: string;
}

export interface Episode {
  id: number;
  user_id: string;
  happened_at: string;
  summary: string;
  topics: string[];
  reinforce_count: number;
  salience: number;
  last_referenced_at?: string;
  created_at: string;
}

export interface EmotionalState {
  user_id: string;
  affection: number;        // 0-100
  trust: number;           // 0-100  
  jealousy: number;        // 0-100
  playfulness: number;     // 0-100
  clinginess: number;      // 0-100
  last_visit_at: string;
  streak_days: number;
  total_conversations: number;
  updated_at: string;
  created_at: string;
}

export interface MemoryBundle {
  facts?: UserFacts;
  emotions?: EmotionalState;
  episodes: Episode[];
}

export interface Interaction {
  id: number;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  topics: string[];
  character_key: string;
  created_at: string;
}

/**
 * Get comprehensive memory bundle for a user
 * Now uses the enhanced memory system tables
 */
export async function getMemoryForUser(
  userId: string, 
  characterKey: string = 'lexi',
  episodeLimit: number = 5
): Promise<MemoryBundle> {
  try {
    console.log('Getting enhanced memory for user:', userId, 'character:', characterKey);
    
    // Use the comprehensive memory function from the database
    const { data, error } = await admin.rpc('get_comprehensive_memory', {
      p_user_id: userId,
      p_character_key: characterKey,
      p_episode_limit: episodeLimit
    });
    
    if (error) {
      console.log('Enhanced memory system not available yet:', error.message);
      // Return empty memory bundle - the system will fall back gracefully
      return { episodes: [] };
    }
    
    const result = data?.[0];
    if (!result) {
      return { episodes: [] };
    }
    
    return {
      facts: result.facts?.id ? result.facts : undefined,
      emotions: result.emotions?.id ? result.emotions : undefined,
      episodes: result.episodes?.filter((ep: any) => ep?.id) || []
    };
  } catch (error) {
    console.error('Error fetching user memory:', error);
    return { episodes: [] };
  }
}

/**
 * Log a conversation turn for memory processing
 * Now uses the enhanced interaction_log table
 */
export async function logInteraction(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  characterKey: string = 'lexi',
  topics: string[] = [],
  nsfw: boolean = false,
  selfieData?: any,
  sessionId?: string | null
): Promise<void> {
  try {
    const isAnonymous = userId.startsWith('anon_') || !isValidUUID(userId);

    if (isAnonymous) {
      // CRITICAL: Log anonymous interactions to separate table for conversion analytics
      console.log('🔍 Memory System: Logging ANONYMOUS interaction:', {
        anonymousId: userId.substring(0, 20) + '...',
        character: characterKey,
        role
      });

      await admin
        .from('anonymous_interactions')
        .insert({
          anonymous_id: userId,
          character_key: characterKey,
          role,
          content,
          topics,
          emotional_tone: detectEmotionalTone(content),
          nsfw,
          metadata: selfieData ? { selfie: selfieData } : {},
          session_id: sessionId
        });

      return;
    }

    // For authenticated users: Store in both tables for backward compatibility
    await Promise.all([
      // Legacy storage
      admin
        .from('memories')
        .insert({
          user_id: userId,
          character: characterKey,
          message: { role, content }, // Store as JSONB
          nsfw
        }),

      // Enhanced storage
      admin
        .from('interaction_log')
        .insert({
          user_id: userId,
          character_key: characterKey,
          role,
          content,
          topics,
          emotional_tone: detectEmotionalTone(content),
          nsfw,
          metadata: selfieData ? { selfie: selfieData } : null,
          session_id: sessionId
        })
    ]);
  } catch (error) {
    console.error('Error logging interaction:', error);
  }
}

/**
 * Helper function to validate UUID format
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Update or insert user facts
 * Now uses the enhanced user_facts table
 */
export async function upsertUserFacts(
  userId: string, 
  factsPatch: Partial<UserFacts>,
  characterKey: string = 'lexi'
): Promise<void> {
  try {
    console.log('User facts update requested for:', userId, factsPatch);
    
    const { error } = await admin
      .from('user_facts')
      .upsert({
        user_id: userId,
        character_key: characterKey,
        ...factsPatch,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,character_key'
      });
    
    if (error) {
      console.log('Enhanced user facts system not available yet:', error.message);
    }
  } catch (error) {
    console.error('Error upserting user facts:', error);
  }
}

/**
 * Update emotional state with bounds checking (0-100)
 * Now uses the enhanced emotional_states table with database function
 */
export async function updateEmotionalState(
  userId: string,
  emotionDeltas: Partial<Omit<EmotionalState, 'user_id' | 'created_at' | 'updated_at'>>,
  characterKey: string = 'lexi'
): Promise<void> {
  try {
    // Skip database operations for anonymous users (non-UUID format)
    if (userId.startsWith('anon_') || !isValidUUID(userId)) {
      console.log('🔍 Memory System: Skipping emotional state update for anonymous user:', userId.substring(0, 20) + '...');
      return;
    }

    console.log('Emotional state update requested for:', userId, emotionDeltas);
    
    // Use the database function for safe updates with bounds checking
    const { error } = await admin.rpc('update_emotional_state_safe', {
      p_user_id: userId,
      p_character_key: characterKey,
      p_affection_delta: emotionDeltas.affection || 0,
      p_trust_delta: emotionDeltas.trust || 0,
      p_jealousy_delta: emotionDeltas.jealousy || 0,
      p_playfulness_delta: emotionDeltas.playfulness || 0,
      p_clinginess_delta: emotionDeltas.clinginess || 0,
      p_intimacy_delta: 0 // Could be extracted from emotionDeltas if needed
    });
    
    if (error) {
      console.log('Enhanced emotional state system not available yet:', error.message);
    }
  } catch (error) {
    console.error('Error updating emotional state:', error);
  }
}

/**
 * Create a new episodic memory
 * Now uses the enhanced episodic_memories table
 */
export async function createEpisode(
  userId: string,
  summary: string,
  topics: string[] = [],
  salience: number = 0.5,
  title?: string,
  emotionalImpact: number = 5,
  triggerKeywords: string[] = [],
  characterKey: string = 'lexi'
): Promise<void> {
  try {
    console.log('Episode creation requested for:', userId, summary);
    
    // Use the database function to create episodic memory with triggers
    const { error } = await admin.rpc('create_episodic_memory', {
      p_user_id: userId,
      p_character_key: characterKey,
      p_title: title || summary.substring(0, 50) + '...',
      p_summary: summary,
      p_topics: topics,
      p_emotional_impact: emotionalImpact,
      p_salience: salience,
      p_trigger_keywords: triggerKeywords
    });
    
    if (error) {
      console.log('Enhanced episodic memory system not available yet:', error.message);
    }
  } catch (error) {
    console.error('Error creating episode:', error);
  }
}

/**
 * Update visit tracking and streak calculation
 * Now uses the enhanced emotional_states table
 */
export async function updateVisitTracking(userId: string, characterKey: string = 'lexi'): Promise<void> {
  try {
    // Skip database operations for anonymous users (non-UUID format)
    if (userId.startsWith('anon_') || !isValidUUID(userId)) {
      console.log('🔍 Memory System: Skipping visit tracking for anonymous user:', userId.substring(0, 20) + '...');
      return;
    }

    console.log('Visit tracking update for:', userId);
    
    // Get current emotional state to calculate streaks (if table exists)
    const { data: currentState, error: stateError } = await admin
      .from('emotional_states')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', characterKey)
      .single();
    
    if (stateError) {
      console.log('Enhanced emotional states table not available yet');
      return;
    }
    
    let streakDays = 1;
    let clinginessDelta = 0;
    
    if (currentState?.last_visit_at) {
      const lastVisit = new Date(currentState.last_visit_at);
      const now = new Date();
      const hoursSince = (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60);
      const daysSince = Math.floor(hoursSince / 24);
      
      // Calculate streak
      if (daysSince <= 1) {
        streakDays = (currentState.streak_days || 0) + 1;
      } else {
        streakDays = 1; // Reset streak
      }
      
      // Adjust clinginess based on absence
      if (hoursSince > 48) {
        clinginessDelta = Math.min(10, Math.floor(hoursSince / 24));
      }
    }
    
    // Update emotional state with visit tracking
    await updateEmotionalState(userId, {
      streak_days: streakDays,
      clinginess: clinginessDelta,
      last_visit_at: new Date().toISOString()
    }, characterKey);
    
  } catch (error) {
    console.error('Error updating visit tracking:', error);
  }
}

/**
 * Build memory context string for AI system prompt
 */
export function buildMemoryContext(memory: MemoryBundle | null, characterName: string = 'Lexi'): string {
  const parts: string[] = [];

  // Handle null memory (anonymous users)
  if (!memory) {
    return '';
  }

  if (memory.facts) {
    const facts = memory.facts;
    const factsParts: string[] = [];
    
    if (facts.display_name) factsParts.push(`Name: ${facts.display_name}`);
    if (facts.occupation) factsParts.push(`Occupation: ${facts.occupation}`);
    if (facts.birthday) factsParts.push(`Birthday: ${facts.birthday}`);
    
    if (facts.favorites && Object.keys(facts.favorites).length > 0) {
      const favs = Object.entries(facts.favorites)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('; ');
      if (favs) factsParts.push(`Favorites: ${favs}`);
    }
    
    if (facts.tags && facts.tags.length > 0) {
      factsParts.push(`Tags: ${facts.tags.join(', ')}`);
    }
    
    if (facts.notes) {
      factsParts.push(`Notes: ${facts.notes}`);
    }

    if (factsParts.length > 0) {
      parts.push(`[RELATIONSHIP PROFILE]\n${factsParts.join('\n')}`);
    }
  }

  if (memory.emotions) {
    const emo = memory.emotions;
    const moodParts: string[] = [];
    
    moodParts.push(`affection=${emo.affection}`);
    moodParts.push(`trust=${emo.trust}`);
    if (emo.clinginess > 40) moodParts.push(`clinginess=${emo.clinginess}`);
    if (emo.jealousy > 30) moodParts.push(`jealousy=${emo.jealousy}`);
    moodParts.push(`playfulness=${emo.playfulness}`);
    
    let moodNote = '';
    if (emo.streak_days > 7) moodNote += ` (${emo.streak_days} day streak!)`;
    if (emo.clinginess > 60) moodNote += ' (missed you)';
    if (emo.total_conversations < 5) moodNote += ' (still getting to know each other)';
    
    parts.push(`[RELATIONSHIP MOOD]\n${moodParts.join(', ')}${moodNote}`);
  }

  if (memory.episodes && memory.episodes.length > 0) {
    const recentMemories = memory.episodes
      .slice(0, 5)
      .map(ep => {
        const date = new Date(ep.happened_at).toLocaleDateString();
        return `- ${date}: ${ep.summary}`;
      })
      .join('\n');
      
    parts.push(`[RECENT MEMORIES]\n${recentMemories}`);
  }

  if (parts.length === 0) return '';

  return parts.join('\n\n') + '\n\n[INSTRUCTIONS]\nIncorporate this relationship context naturally into your responses. Don\'t list the metadata - weave it into your tone and conversation. Be more intimate and personal based on your relationship history.';
}

/**
 * Simple topic extraction from text (can be enhanced with NLP later)
 */
export function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const topicKeywords = {
    work: ['work', 'job', 'boss', 'office', 'career', 'meeting', 'project', 'colleague', 'coworker'],
    family: ['mom', 'dad', 'family', 'parents', 'sister', 'brother', 'relative'],
    relationship: ['love', 'miss', 'care', 'girlfriend', 'boyfriend', 'dating', 'crush', 'attracted', 'romantic', 'partner', 'relationship'],
    other_people: ['friend', 'friends', 'girl', 'guy', 'woman', 'man', 'person', 'someone', 'somebody', 'her', 'him', 'she', 'he', 'they', 'them'],
    emotions: ['sad', 'happy', 'angry', 'frustrated', 'excited', 'stressed'],
    hobbies: ['gym', 'music', 'games', 'cooking', 'reading', 'travel'],
    intimate: ['sexy', 'kiss', 'cuddle', 'bed', 'sleep', 'dream'],
    social: ['party', 'hangout', 'dinner', 'lunch', 'coffee', 'movie', 'date', 'meet', 'meeting', 'plans']
  };

  const lowerText = text.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      topics.push(topic);
    }
  }

  return [...new Set(topics)]; // Remove duplicates
}

/**
 * Simple emotional tone detection from text
 */
function detectEmotionalTone(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  const toneKeywords = {
    happy: ['happy', 'joy', 'excited', 'great', 'awesome', 'love', 'amazing', 'wonderful'],
    sad: ['sad', 'cry', 'depressed', 'down', 'upset', 'hurt', 'broken'],
    angry: ['angry', 'mad', 'furious', 'pissed', 'annoyed', 'frustrated'],
    flirty: ['sexy', 'hot', 'cute', 'beautiful', 'gorgeous', 'handsome', 'attractive'],
    romantic: ['love', 'romance', 'heart', 'kiss', 'date', 'together', 'forever'],
    playful: ['fun', 'play', 'game', 'joke', 'laugh', 'silly', 'tease']
  };
  
  for (const [tone, keywords] of Object.entries(toneKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return tone;
    }
  }
  
  return null;
}