// Migration script to enhance existing user data with AI analysis
// Run this once after deploying the new AI enhancement system

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openrouterKey = process.env.OPENROUTER_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openrouterKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Enhance user_facts with AI analysis of conversation history
 */
async function enhanceUserFacts() {
  console.log('🔍 Starting user_facts enhancement...');

  try {
    // Get all user_facts that need enhancement
    const { data: userFacts, error } = await admin
      .from('user_facts')
      .select('*');

    if (error) {
      console.error('❌ Error fetching user_facts:', error);
      return;
    }

    console.log(`📊 Found ${userFacts.length} user_facts records to enhance`);

    for (const userFact of userFacts) {
      try {
        console.log(`🔄 Processing user ${userFact.user_id} for character ${userFact.character_key}...`);

        // Get recent conversation history for this user/character
        const { data: conversations, error: convError } = await admin
          .from('interaction_log')
          .select('role, content, created_at')
          .eq('user_id', userFact.user_id)
          .eq('character_key', userFact.character_key)
          .order('created_at', { ascending: false })
          .limit(50); // Get recent 50 messages for context

        if (convError || !conversations || conversations.length === 0) {
          console.log(`⏭️ No conversation history for user ${userFact.user_id}, skipping...`);
          continue;
        }

        // Format conversation for AI analysis
        const conversationText = conversations
          .reverse() // Chronological order
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        // AI analysis prompt for user facts enhancement
        const analysisPrompt = `Analyze this conversation history and extract comprehensive user facts. Focus on extracting rich, specific information about the user.

CONVERSATION HISTORY:
${conversationText}

Extract and return JSON with this structure (only include facts explicitly mentioned or strongly implied):

{
  "enhanced_facts": {
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
      "personality_traits": ["positive traits they exhibit"]
    },
    "dislikes": {
      "activities": ["things they dislike doing"],
      "personality_traits": ["negative traits they mention"],
      "topics": ["subjects they avoid or dislike"]
    },
    "personal_notes": "meaningful personal context, life situations, important details",
    "tags": ["descriptive tags like 'family_focused', 'creative', 'analytical', 'business_owner']",
    "relationship_status": "single/married/dating/complicated or null",
    "communication_style": "direct/playful/serious/flirty/intimate/sarcastic etc",
    "emotional_patterns": ["recurring emotional themes or responses they show"]
  }
}

Return ONLY the JSON object, no other text.`;

        // Call OpenAI API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: analysisPrompt }],
            max_tokens: 1500,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          console.error(`❌ AI API failed for user ${userFact.user_id}:`, response.status, await response.text());
          continue;
        }

        const aiResult = await response.json();
        const analysisText = aiResult.choices?.[0]?.message?.content?.trim();

        if (!analysisText) {
          console.error(`❌ Empty AI response for user ${userFact.user_id}`);
          console.error('Full AI result:', JSON.stringify(aiResult, null, 2));
          continue;
        }

        console.log(`🤖 AI response for user ${userFact.user_id}:`);
        console.log(analysisText.substring(0, 300) + '...');

        let enhancedFacts;
        try {
          // Clean the AI response - remove all possible markdown formatting
          let cleanedText = analysisText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .replace(/^[\s\S]*?({[\s\S]*})([\s\S]*?)$/g, '$1') // Extract JSON object
            .trim();

          console.log(`🧹 Cleaned text: ${cleanedText.substring(0, 100)}...`);

          const parsed = JSON.parse(cleanedText);
          enhancedFacts = parsed.enhanced_facts || parsed; // Handle both wrapped and direct formats

          console.log('✅ Successfully parsed AI response');
        } catch (parseError) {
          console.error(`❌ JSON parse error for user ${userFact.user_id}:`, parseError.message);
          console.error(`🔍 Full raw AI response:`);
          console.error(analysisText);

          // Try to extract JSON using regex as last resort
          try {
            const jsonMatch = analysisText.match(/{[\s\S]*}/);
            if (jsonMatch) {
              console.log('🔄 Trying regex extraction...');
              const parsed = JSON.parse(jsonMatch[0]);
              enhancedFacts = parsed.enhanced_facts || parsed;
              console.log('✅ Regex extraction successful!');
            } else {
              console.error('❌ No JSON object found in response');
              continue;
            }
          } catch (regexError) {
            console.error('❌ Regex extraction also failed:', regexError.message);
            continue;
          }
        }

        // Merge enhanced facts with existing data
        let currentFavorites = {};
        let currentDislikes = {};

        try {
          if (userFact.favorites) {
            if (typeof userFact.favorites === 'string') {
              currentFavorites = JSON.parse(userFact.favorites);
            } else {
              currentFavorites = userFact.favorites;
            }
          }
        } catch (e) {
          console.log('⚠️ Invalid favorites JSON, using empty object:', userFact.favorites);
          currentFavorites = {};
        }

        try {
          if (userFact.dislikes) {
            if (typeof userFact.dislikes === 'string') {
              currentDislikes = JSON.parse(userFact.dislikes);
            } else {
              currentDislikes = userFact.dislikes;
            }
          }
        } catch (e) {
          console.log('⚠️ Invalid dislikes JSON, using empty object:', userFact.dislikes);
          currentDislikes = {};
        }

        const currentTags = userFact.tags || [];

        // Intelligent merging
        const mergedFavorites = { ...currentFavorites };
        Object.keys(enhancedFacts.favorites || {}).forEach(category => {
          const items = enhancedFacts.favorites[category];
          if (items && items.length > 0) {
            mergedFavorites[category] = [...(mergedFavorites[category] || []), ...items]
              .filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates
          }
        });

        const mergedDislikes = { ...currentDislikes };
        Object.keys(enhancedFacts.dislikes || {}).forEach(category => {
          const items = enhancedFacts.dislikes[category];
          if (items && items.length > 0) {
            mergedDislikes[category] = [...(mergedDislikes[category] || []), ...items]
              .filter((item, index, arr) => arr.indexOf(item) === index);
          }
        });

        const mergedTags = [...currentTags, ...(enhancedFacts.tags || [])]
          .filter((tag, index, arr) => arr.indexOf(tag) === index);

        // Prepare update data
        const updateData = {
          favorites: JSON.stringify(mergedFavorites),
          dislikes: JSON.stringify(mergedDislikes),
          tags: mergedTags,
          updated_at: new Date().toISOString()
        };

        // Only update non-null enhanced values
        if (enhancedFacts.display_name && enhancedFacts.display_name !== 'unknown') {
          updateData.display_name = enhancedFacts.display_name;
        }
        if (enhancedFacts.birthday) updateData.birthday = enhancedFacts.birthday;
        if (enhancedFacts.occupation) updateData.occupation = enhancedFacts.occupation;
        if (enhancedFacts.location) updateData.location = enhancedFacts.location;
        if (enhancedFacts.relationship_status) updateData.relationship_status = enhancedFacts.relationship_status;

        if (enhancedFacts.personal_notes) {
          const existingNotes = userFact.personal_notes || '';
          updateData.personal_notes = existingNotes
            ? `${existingNotes}. ${enhancedFacts.personal_notes}`
            : enhancedFacts.personal_notes;
        }

        // Update the user_facts record
        const { error: updateError } = await admin
          .from('user_facts')
          .update(updateData)
          .eq('id', userFact.id);

        if (updateError) {
          console.error(`❌ Error updating user_facts for ${userFact.user_id}:`, updateError);
        } else {
          console.log(`✅ Enhanced user_facts for ${userFact.user_id}/${userFact.character_key}`);
        }

        // Rate limiting to avoid API limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (userError) {
        console.error(`❌ Error processing user ${userFact.user_id}:`, userError);
      }
    }

    console.log('✅ User_facts enhancement completed!');

  } catch (error) {
    console.error('❌ Error in enhanceUserFacts:', error);
  }
}

/**
 * Enhance episodic_memories with better titles, summaries, and salience
 */
async function enhanceEpisodicMemories() {
  console.log('🧠 Starting episodic_memories enhancement...');

  try {
    // Get episodic memories that need enhancement (generic titles or low salience)
    const { data: memories, error } = await admin
      .from('episodic_memories')
      .select('*')
      .or('title.ilike.%Chat session%,title.ilike.%Conversation about%,salience.eq.0.5');

    if (error) {
      console.error('❌ Error fetching episodic_memories:', error);
      return;
    }

    console.log(`📊 Found ${memories.length} episodic_memories to enhance`);

    for (const memory of memories) {
      try {
        console.log(`🔄 Processing memory ${memory.id}...`);

        // Get additional context from around the time of this memory
        const memoryTime = new Date(memory.happened_at);
        const beforeTime = new Date(memoryTime.getTime() - (30 * 60 * 1000)); // 30 min before
        const afterTime = new Date(memoryTime.getTime() + (30 * 60 * 1000)); // 30 min after

        // Try wider time window if narrow one fails
        let contextMessages;
        let contextError;

        // First try narrow window (30 min before/after)
        const { data: narrowContext, error: narrowError } = await admin
          .from('interaction_log')
          .select('role, content, created_at')
          .eq('user_id', memory.user_id)
          .eq('character_key', memory.character_key)
          .gte('created_at', beforeTime.toISOString())
          .lte('created_at', afterTime.toISOString())
          .order('created_at', { ascending: true });

        if (!narrowError && narrowContext && narrowContext.length > 0) {
          contextMessages = narrowContext;
        } else {
          // Try wider window (get recent messages around that time)
          const { data: wideContext, error: wideError } = await admin
            .from('interaction_log')
            .select('role, content, created_at')
            .eq('user_id', memory.user_id)
            .eq('character_key', memory.character_key)
            .order('created_at', { ascending: false })
            .limit(10);

          contextMessages = wideContext;
          contextError = wideError;
        }

        if (contextError || !contextMessages || contextMessages.length === 0) {
          console.log(`⏭️ No context for memory ${memory.id}, skipping...`);
          continue;
        }

        const contextText = contextMessages
          .slice(0, 10) // Limit to recent 10 messages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        const enhancementPrompt = `Analyze this conversation context and enhance the episodic memory with a meaningful title, rich summary, and proper salience scoring.

CONVERSATION CONTEXT:
${contextText}

CURRENT MEMORY:
Title: ${memory.title}
Summary: ${memory.summary}
Topics: ${memory.topics?.join(', ') || 'none'}

Provide enhanced memory details in JSON format:

{
  "enhanced_memory": {
    "title": "meaningful descriptive title (not generic like 'Chat session')",
    "summary": "rich summary capturing emotional tone, significance, and key insights",
    "salience": 0.1-1.0 (based on memorability and future relevance),
    "significance_level": "mundane|notable|significant|milestone",
    "relationship_impact": "none|positive|negative|complex",
    "memory_type": "factual|emotional|relational|intimate|conflict|achievement",
    "emotional_impact": 1-10
  }
}

Guidelines:
- salience 0.8-1.0: Major life events, deep revelations, relationship milestones
- salience 0.6-0.8: Important personal sharing, significant emotional moments
- salience 0.4-0.6: Meaningful conversations, learning about preferences
- salience 0.1-0.4: Casual chat, routine interactions

Return ONLY the JSON object.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: enhancementPrompt }],
            max_tokens: 800,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          console.error(`❌ AI API failed for memory ${memory.id}:`, response.status);
          continue;
        }

        const aiResult = await response.json();
        const analysisText = aiResult.choices?.[0]?.message?.content?.trim();

        if (!analysisText) {
          console.error(`❌ Empty AI response for memory ${memory.id}`);
          continue;
        }

        let enhancedMemory;
        try {
          // Clean the AI response - remove markdown formatting
          const cleanedText = analysisText.replace(/```json\n?|```\n?/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          enhancedMemory = parsed.enhanced_memory || parsed; // Handle both wrapped and direct formats
        } catch (parseError) {
          console.error(`❌ JSON parse error for memory ${memory.id}:`, parseError);
          console.error(`Raw AI response:`, analysisText.substring(0, 200));
          continue;
        }

        // Update the memory with enhanced data
        const updateData = {
          title: enhancedMemory.title,
          summary: enhancedMemory.summary,
          salience: enhancedMemory.salience,
          emotional_impact: enhancedMemory.emotional_impact || memory.emotional_impact,
          metadata: {
            ...(memory.metadata || {}),
            significance_level: enhancedMemory.significance_level,
            relationship_impact: enhancedMemory.relationship_impact,
            memory_type: enhancedMemory.memory_type,
            ai_enhanced: true,
            enhanced_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await admin
          .from('episodic_memories')
          .update(updateData)
          .eq('id', memory.id);

        if (updateError) {
          console.error(`❌ Error updating memory ${memory.id}:`, updateError);
        } else {
          console.log(`✅ Enhanced memory ${memory.id}: "${enhancedMemory.title}"`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (memoryError) {
        console.error(`❌ Error processing memory ${memory.id}:`, memoryError);
      }
    }

    console.log('✅ Episodic_memories enhancement completed!');

  } catch (error) {
    console.error('❌ Error in enhanceEpisodicMemories:', error);
  }
}

/**
 * Add metadata to emotional_states for richer context
 */
async function enhanceEmotionalStates() {
  console.log('💖 Starting emotional_states enhancement...');

  try {
    // Get all emotional_states that don't have metadata
    const { data: emotionalStates, error } = await admin
      .from('emotional_states')
      .select('*')
      .is('metadata', null);

    if (error) {
      console.error('❌ Error fetching emotional_states:', error);
      return;
    }

    console.log(`📊 Found ${emotionalStates.length} emotional_states to enhance`);

    for (const state of emotionalStates) {
      try {
        console.log(`🔄 Processing emotional state for ${state.user_id}/${state.character_key}...`);

        // Calculate relationship insights based on current metrics
        const avgPositive = (state.affection + state.trust + state.playfulness) / 3;
        const complications = state.jealousy + state.clinginess;

        let relationshipStatus = 'developing';
        if (avgPositive > 80 && complications < 30) {
          relationshipStatus = 'thriving';
        } else if (avgPositive > 60 && complications < 50) {
          relationshipStatus = 'stable';
        } else if (avgPositive < 40 || complications > 60) {
          relationshipStatus = 'challenging';
        }

        const trustIndicators = [];
        const concernFlags = [];
        const growthAreas = [];

        // Generate insights based on metrics
        if (state.trust > 70) {
          trustIndicators.push('High emotional openness', 'Consistent communication');
        }
        if (state.affection > 80) {
          trustIndicators.push('Strong emotional bond', 'Mutual care and affection');
        }

        if (state.jealousy > 60) {
          concernFlags.push('High jealousy levels', 'Possessive behavior patterns');
        }
        if (state.clinginess > 70) {
          concernFlags.push('Excessive dependency', 'Separation anxiety');
        }

        if (state.trust < 50) {
          growthAreas.push('Building trust and vulnerability', 'Consistent communication');
        }
        if (state.playfulness < 40) {
          growthAreas.push('Increasing fun and lighthearted interactions');
        }

        const metadata = {
          relationship_status: relationshipStatus,
          relationship_insights: {
            communication_quality: Math.min(10, Math.floor((state.trust + state.affection) / 20)),
            emotional_depth: Math.min(10, Math.floor((state.affection + state.intimacy_level) / 20)),
            trust_indicators: trustIndicators,
            concern_flags: concernFlags,
            growth_areas: growthAreas
          },
          last_ai_reasoning: `Relationship ${relationshipStatus} with ${avgPositive.toFixed(0)}/100 average positive emotions and ${complications}/200 complications.`,
          enhanced_at: new Date().toISOString()
        };

        const { error: updateError } = await admin
          .from('emotional_states')
          .update({
            metadata: metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', state.id);

        if (updateError) {
          console.error(`❌ Error updating emotional state ${state.id}:`, updateError);
        } else {
          console.log(`✅ Enhanced emotional state for ${state.user_id}/${state.character_key} (${relationshipStatus})`);
        }

      } catch (stateError) {
        console.error(`❌ Error processing emotional state ${state.id}:`, stateError);
      }
    }

    console.log('✅ Emotional_states enhancement completed!');

  } catch (error) {
    console.error('❌ Error in enhanceEmotionalStates:', error);
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting data migration for AI enhancement system...');
  console.log('⏰ This may take a while depending on the amount of data...\n');

  const startTime = Date.now();

  try {
    // Run all enhancements
    await enhanceUserFacts();
    console.log('');
    await enhanceEpisodicMemories();
    console.log('');
    await enhanceEmotionalStates();

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n🎉 Migration completed successfully in ${duration.toFixed(1)} seconds!`);
    console.log('✨ Your existing data is now AI-enhanced and ready for the new system!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  runMigration().then(() => {
    console.log('🏁 Migration script finished.');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  enhanceUserFacts,
  enhanceEpisodicMemories,
  enhanceEmotionalStates,
  runMigration
};