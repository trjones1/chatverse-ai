// AI-Enhanced Memory System
// Comprehensive AI-powered analysis and enhancement of user_facts, episodic_memories, and emotional_states

import { getSupabaseAdmin } from './supabaseAdmin';

const admin = getSupabaseAdmin();

export interface AIAnalysis {
  user_facts: {
    display_name?: string;
    birthday?: string;
    occupation?: string;
    location?: string;
    favorites: {
      hobbies?: string[];
      food?: string[];
      entertainment?: string[];
      activities?: string[];
      music?: string[];
      personality_traits?: string[];
    };
    dislikes: {
      activities?: string[];
      personality_traits?: string[];
      topics?: string[];
    };
    personal_notes?: string;
    tags: string[];
    relationship_status?: string;
    communication_style?: string;
    emotional_patterns?: string[];
  };
  episodic_memory: {
    title: string;
    summary: string;
    topics: string[];
    emotional_impact: number;
    salience: number;
    significance_level: 'mundane' | 'notable' | 'significant' | 'milestone';
    relationship_impact: 'none' | 'positive' | 'negative' | 'complex';
    memory_type: 'factual' | 'emotional' | 'relational' | 'intimate' | 'conflict' | 'achievement';
  };
  emotional_deltas: {
    affection?: number;
    trust?: number;
    jealousy?: number;
    playfulness?: number;
    clinginess?: number;
    intimacy_level?: number;
    reasoning: string;
  };
  relationship_insights: {
    communication_quality: number; // 1-10
    emotional_depth: number; // 1-10
    trust_indicators: string[];
    concern_flags: string[];
    growth_areas: string[];
  };
}

/**
 * Comprehensive AI analysis of a conversation turn
 */
export async function analyzeConversationWithAI(
  userMessage: string,
  aiResponse: string,
  conversationHistory: any[],
  character: string,
  currentUserFacts?: any,
  currentEmotionalState?: any
): Promise<AIAnalysis | null> {
  try {
    // Build context for AI analysis
    const recentContext = conversationHistory.slice(-10).map(msg =>
      `${msg.role === 'user' ? 'User' : character}: ${msg.content}`
    ).join('\n');

    const currentFactsContext = currentUserFacts ? `
Current known facts about user:
- Name: ${currentUserFacts.display_name || 'unknown'}
- Occupation: ${currentUserFacts.occupation || 'unknown'}
- Interests: ${JSON.stringify(currentUserFacts.favorites || {})}
- Personal notes: ${currentUserFacts.personal_notes || 'none'}
- Tags: ${(currentUserFacts.tags || []).join(', ') || 'none'}
` : 'No previous facts known about user.';

    const emotionalContext = currentEmotionalState ? `
Current emotional state:
- Affection: ${currentEmotionalState.affection}/100
- Trust: ${currentEmotionalState.trust}/100
- Playfulness: ${currentEmotionalState.playfulness}/100
- Intimacy: ${currentEmotionalState.intimacy_level}/100
` : 'No emotional state history.';

    const analysisPrompt = `You are an advanced relationship and memory analyst. Analyze this conversation between a user and AI character "${character}" and extract comprehensive insights.

CONVERSATION CONTEXT:
${recentContext}

CURRENT TURN:
User: ${userMessage}
${character}: ${aiResponse}

${currentFactsContext}

${emotionalContext}

Provide a detailed JSON analysis with the following structure:

{
  "user_facts": {
    "display_name": "extracted name or null",
    "birthday": "if mentioned (YYYY-MM-DD format) or null",
    "occupation": "specific job/role or null",
    "location": "city/country if mentioned or null",
    "favorites": {
      "hobbies": ["specific hobbies mentioned"],
      "food": ["specific foods/cuisines mentioned"],
      "entertainment": ["movies, shows, books, games mentioned"],
      "activities": ["specific activities they enjoy"],
      "music": ["genres, artists mentioned"],
      "personality_traits": ["positive traits they exhibit or mention"]
    },
    "dislikes": {
      "activities": ["things they dislike doing"],
      "personality_traits": ["negative traits they mention"],
      "topics": ["subjects they avoid or dislike"]
    },
    "personal_notes": "meaningful personal context or life situations",
    "tags": ["concise descriptive tags like 'family_focused', 'creative', 'analytical']",
    "relationship_status": "single/married/dating/complicated or null",
    "communication_style": "direct/playful/serious/flirty/intimate/etc",
    "emotional_patterns": ["recurring emotional themes or responses"]
  },
  "episodic_memory": {
    "title": "meaningful descriptive title for this conversation moment",
    "summary": "rich summary capturing the essence, emotional tone, and significance",
    "topics": ["specific topics discussed beyond basic categories"],
    "emotional_impact": 1-10,
    "salience": 0.1-1.0,
    "significance_level": "mundane|notable|significant|milestone",
    "relationship_impact": "none|positive|negative|complex",
    "memory_type": "factual|emotional|relational|intimate|conflict|achievement"
  },
  "emotional_deltas": {
    "affection": -10 to +10,
    "trust": -10 to +10,
    "jealousy": -5 to +15,
    "playfulness": -5 to +10,
    "clinginess": -5 to +10,
    "intimacy_level": -5 to +10,
    "reasoning": "detailed explanation of emotional changes"
  },
  "relationship_insights": {
    "communication_quality": 1-10,
    "emotional_depth": 1-10,
    "trust_indicators": ["specific behaviors or statements that build trust"],
    "concern_flags": ["potential issues or red flags"],
    "growth_areas": ["areas where the relationship could develop"]
  }
}

ANALYSIS GUIDELINES:
- Only include facts explicitly mentioned or strongly implied
- Use null for unknown values, don't guess
- Be specific and detailed in summaries
- Consider cumulative relationship development
- Account for character-specific interaction patterns
- Rate emotional impact based on intensity and significance
- Set salience based on memorability and future relevance
- Provide nuanced emotional reasoning

Return ONLY the JSON object, no other text.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      console.error('🧠 AI Analysis API failed:', response.status);
      return null;
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content?.trim();

    if (!analysisText) {
      console.error('🧠 AI Analysis returned empty response');
      return null;
    }

    try {
      const analysis = JSON.parse(analysisText);
      console.log('🧠 AI Analysis completed successfully');
      return analysis;
    } catch (parseError) {
      console.error('🧠 AI Analysis JSON parse error:', parseError);
      console.error('🧠 Raw response:', analysisText);
      return null;
    }

  } catch (error) {
    console.error('🧠 Error in AI conversation analysis:', error);
    return null;
  }
}

/**
 * Apply AI analysis results to update user_facts
 */
export async function updateUserFactsWithAI(
  userId: string,
  character: string,
  aiAnalysis: AIAnalysis
): Promise<boolean> {
  try {
    const userFacts = aiAnalysis.user_facts;

    // Get current facts
    const { data: currentFacts } = await admin
      .from('user_facts')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character)
      .single();

    // Merge new facts with existing ones intelligently
    const updatedFacts: any = {
      user_id: userId,
      character_key: character,
      updated_at: new Date().toISOString()
    };

    // Only update non-null values
    if (userFacts.display_name) updatedFacts.display_name = userFacts.display_name;
    if (userFacts.birthday) updatedFacts.birthday = userFacts.birthday;
    if (userFacts.occupation) updatedFacts.occupation = userFacts.occupation;
    if (userFacts.location) updatedFacts.location = userFacts.location;
    if (userFacts.relationship_status) updatedFacts.relationship_status = userFacts.relationship_status;
    if (userFacts.personal_notes) {
      // Append to existing notes
      const existingNotes = currentFacts?.personal_notes || '';
      updatedFacts.personal_notes = existingNotes
        ? `${existingNotes}. ${userFacts.personal_notes}`
        : userFacts.personal_notes;
    }

    // Merge favorites intelligently
    const currentFavorites = currentFacts?.favorites ? JSON.parse(currentFacts.favorites) : {};
    const newFavorites = { ...currentFavorites };

    Object.keys(userFacts.favorites).forEach(category => {
      const items = userFacts.favorites[category as keyof typeof userFacts.favorites];
      if (items && items.length > 0) {
        newFavorites[category] = [...(newFavorites[category] || []), ...items]
          .filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates
      }
    });

    updatedFacts.favorites = JSON.stringify(newFavorites);

    // Merge dislikes
    const currentDislikes = currentFacts?.dislikes ? JSON.parse(currentFacts.dislikes) : {};
    const newDislikes = { ...currentDislikes };

    Object.keys(userFacts.dislikes).forEach(category => {
      const items = userFacts.dislikes[category as keyof typeof userFacts.dislikes];
      if (items && items.length > 0) {
        newDislikes[category] = [...(newDislikes[category] || []), ...items]
          .filter((item, index, arr) => arr.indexOf(item) === index);
      }
    });

    updatedFacts.dislikes = JSON.stringify(newDislikes);

    // Merge tags (remove duplicates)
    const currentTags = currentFacts?.tags || [];
    updatedFacts.tags = [...currentTags, ...userFacts.tags]
      .filter((tag, index, arr) => arr.indexOf(tag) === index);

    // Upsert the facts
    const { error } = await admin
      .from('user_facts')
      .upsert(updatedFacts);

    if (error) {
      console.error('🧠 Error updating user_facts:', error);
      return false;
    }

    console.log('🧠 User facts updated with AI analysis');
    return true;

  } catch (error) {
    console.error('🧠 Error in updateUserFactsWithAI:', error);
    return false;
  }
}

/**
 * Create enhanced episodic memory from AI analysis
 */
export async function createEnhancedEpisodicMemory(
  userId: string,
  character: string,
  aiAnalysis: AIAnalysis,
  messageContext?: string
): Promise<boolean> {
  try {
    const memory = aiAnalysis.episodic_memory;

    const episodeData = {
      user_id: userId,
      character_key: character,
      title: memory.title,
      summary: memory.summary,
      topics: memory.topics,
      emotional_impact: memory.emotional_impact,
      salience: memory.salience,
      happened_at: new Date().toISOString(),
      metadata: {
        significance_level: memory.significance_level,
        relationship_impact: memory.relationship_impact,
        memory_type: memory.memory_type,
        ai_enhanced: true,
        message_context: messageContext?.substring(0, 200)
      }
    };

    const { error } = await admin
      .from('episodic_memories')
      .insert(episodeData);

    if (error) {
      console.error('🧠 Error creating enhanced episodic memory:', error);
      return false;
    }

    console.log('🧠 Enhanced episodic memory created');
    return true;

  } catch (error) {
    console.error('🧠 Error in createEnhancedEpisodicMemory:', error);
    return false;
  }
}

/**
 * Update emotional state with AI-reasoned deltas
 */
export async function updateEmotionalStateWithAI(
  userId: string,
  character: string,
  aiAnalysis: AIAnalysis
): Promise<boolean> {
  try {
    const deltas = aiAnalysis.emotional_deltas;

    // Get current emotional state
    const { data: currentState, error: fetchError } = await admin
      .from('emotional_states')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('🧠 Error fetching emotional state:', fetchError);
      return false;
    }

    // Calculate new values (with bounds checking)
    const current = currentState || {
      affection: 50,
      trust: 30,
      jealousy: 0,
      playfulness: 40,
      clinginess: 20,
      intimacy_level: 10
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    const newState = {
      user_id: userId,
      character_key: character,
      affection: clamp((current.affection || 50) + (deltas.affection || 0), 0, 100),
      trust: clamp((current.trust || 30) + (deltas.trust || 0), 0, 100),
      jealousy: clamp((current.jealousy || 0) + (deltas.jealousy || 0), 0, 100),
      playfulness: clamp((current.playfulness || 40) + (deltas.playfulness || 0), 0, 100),
      clinginess: clamp((current.clinginess || 20) + (deltas.clinginess || 0), 0, 100),
      intimacy_level: clamp((current.intimacy_level || 10) + (deltas.intimacy_level || 0), 0, 100),
      last_visit_at: new Date().toISOString(),
      total_conversations: (current.total_conversations || 0) + 1,
      updated_at: new Date().toISOString(),
      metadata: {
        last_ai_reasoning: deltas.reasoning,
        relationship_insights: aiAnalysis.relationship_insights,
        last_analysis_timestamp: new Date().toISOString()
      }
    };

    const { error } = await admin
      .from('emotional_states')
      .upsert(newState);

    if (error) {
      console.error('🧠 Error updating emotional state:', error);
      return false;
    }

    console.log('🧠 Emotional state updated with AI reasoning:', deltas.reasoning);
    return true;

  } catch (error) {
    console.error('🧠 Error in updateEmotionalStateWithAI:', error);
    return false;
  }
}

/**
 * Main function to apply comprehensive AI analysis
 */
export async function processConversationWithAI(
  userId: string,
  character: string,
  userMessage: string,
  aiResponse: string,
  conversationHistory: any[]
): Promise<void> {
  try {
    console.log('🧠 Starting comprehensive AI analysis...');

    // Get current data for context
    const [currentFacts, currentEmotionalState] = await Promise.all([
      admin.from('user_facts').select('*').eq('user_id', userId).eq('character_key', character).single(),
      admin.from('emotional_states').select('*').eq('user_id', userId).eq('character_key', character).single()
    ]);

    // Run AI analysis
    const analysis = await analyzeConversationWithAI(
      userMessage,
      aiResponse,
      conversationHistory,
      character,
      currentFacts.data,
      currentEmotionalState.data
    );

    if (!analysis) {
      console.log('🧠 AI analysis failed, skipping enhancements');
      return;
    }

    // Apply all enhancements in parallel
    await Promise.all([
      updateUserFactsWithAI(userId, character, analysis),
      createEnhancedEpisodicMemory(userId, character, analysis, userMessage),
      updateEmotionalStateWithAI(userId, character, analysis)
    ]);

    console.log('🧠 Comprehensive AI analysis and updates completed');

  } catch (error) {
    console.error('🧠 Error in processConversationWithAI:', error);
  }
}