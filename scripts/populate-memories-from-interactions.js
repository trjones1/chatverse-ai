#!/usr/bin/env node

/**
 * Populate memories from existing interaction logs
 * This processes the existing conversations to create episodic memories and user facts
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function processExistingInteractions() {
  console.log('🔄 Processing existing interaction logs to create memories...\n');
  
  try {
    // Get all user interactions grouped by user and character
    const { data: interactions, error } = await supabase
      .from('interaction_log')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    console.log(`📊 Found ${interactions.length} interactions to process`);
    
    // Group interactions by user and character
    const userCharacterGroups = {};
    
    interactions.forEach(interaction => {
      const key = `${interaction.user_id}_${interaction.character_key}`;
      if (!userCharacterGroups[key]) {
        userCharacterGroups[key] = [];
      }
      userCharacterGroups[key].push(interaction);
    });
    
    console.log(`👥 Processing ${Object.keys(userCharacterGroups).length} user-character combinations\n`);
    
    for (const [key, userInteractions] of Object.entries(userCharacterGroups)) {
      const [userId, characterKey] = key.split('_');
      
      console.log(`\n🔄 Processing user ${userId} with character ${characterKey}`);
      console.log(`   ${userInteractions.length} interactions to process`);
      
      // Extract user facts from conversations
      await extractUserFacts(userId, characterKey, userInteractions);
      
      // Create episodic memories from significant conversations
      await createEpisodicMemories(userId, characterKey, userInteractions);
      
      // Initialize emotional state
      await initializeEmotionalState(userId, characterKey, userInteractions);
    }
    
    console.log('\n✅ Memory population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error processing interactions:', error);
  }
}

async function extractUserFacts(userId, characterKey, interactions) {
  console.log('   👤 Extracting user facts...');
  
  const facts = {
    user_id: userId,
    character_key: characterKey,
    favorites: {},
    tags: []
  };
  
  let personalNotes = [];
  
  for (const interaction of interactions) {
    if (interaction.role !== 'user') continue;
    
    const message = interaction.content.toLowerCase();
    
    // Extract name
    const nameMatch = interaction.content.match(/my name is (\w+)|i'm (\w+)|call me (\w+)/i);
    if (nameMatch && !facts.display_name) {
      facts.display_name = nameMatch[1] || nameMatch[2] || nameMatch[3];
      console.log(`      📝 Found name: ${facts.display_name}`);
    }
    
    // Extract business/occupation info
    if (message.includes('business') || message.includes('entrepreneur') || message.includes('startup')) {
      facts.occupation = 'Entrepreneur/Business Owner';
      facts.tags.push('business_owner');
    }
    
    // Extract family info
    if (message.includes('family') || message.includes('provide for')) {
      facts.tags.push('family_focused');
      personalNotes.push('Family-focused individual');
    }
    
    // Extract interests
    if (message.includes('anime') || message.includes('yu yu hakusho')) {
      if (!facts.favorites.hobbies) facts.favorites.hobbies = [];
      facts.favorites.hobbies.push('anime');
      facts.tags.push('anime_fan');
    }
    
    if (message.includes('voice credits') || message.includes('subscription')) {
      facts.tags.push('tech_entrepreneur');
    }
  }
  
  if (personalNotes.length > 0) {
    facts.personal_notes = personalNotes.join('. ');
  }
  
  // Only insert if we found meaningful facts
  if (facts.display_name || facts.occupation || facts.tags.length > 0) {
    const { error } = await supabase
      .from('user_facts')
      .upsert(facts, { onConflict: 'user_id,character_key' });
      
    if (error) {
      console.error(`      ❌ Error upserting user facts:`, error.message);
    } else {
      console.log(`      ✅ User facts created/updated`);
    }
  }
}

async function createEpisodicMemories(userId, characterKey, interactions) {
  console.log('   📚 Creating episodic memories...');
  
  let memoriesCreated = 0;
  
  // Group interactions into conversation sessions (within 1 hour of each other)
  const sessions = [];
  let currentSession = [];
  
  for (const interaction of interactions) {
    if (currentSession.length === 0) {
      currentSession.push(interaction);
    } else {
      const lastTime = new Date(currentSession[currentSession.length - 1].created_at);
      const currentTime = new Date(interaction.created_at);
      const timeDiff = (currentTime - lastTime) / (1000 * 60); // minutes
      
      if (timeDiff < 60) { // Within 1 hour
        currentSession.push(interaction);
      } else {
        sessions.push(currentSession);
        currentSession = [interaction];
      }
    }
  }
  if (currentSession.length > 0) {
    sessions.push(currentSession);
  }
  
  for (const session of sessions) {
    if (session.length < 4) continue; // Skip very short conversations
    
    const userMessages = session.filter(i => i.role === 'user');
    const aiMessages = session.filter(i => i.role === 'assistant');
    
    if (userMessages.length === 0) continue;
    
    // Create memory from this session
    const topics = [...new Set(session.flatMap(i => i.topics || []))];
    const firstMessage = userMessages[0].content;
    const lastMessage = userMessages[userMessages.length - 1].content;
    
    const title = topics.length > 0 ? 
      `Conversation about ${topics.slice(0, 3).join(', ')}` : 
      'Chat session';
      
    const summary = firstMessage.length > 100 ? 
      firstMessage.substring(0, 200) + '...' : 
      firstMessage;
      
    const salience = topics.some(t => ['family', 'relationship', 'business'].includes(t)) ? 0.8 : 0.5;
    const emotionalImpact = session.some(i => i.emotional_tone === 'happy') ? 7 : 5;
    
    const { error } = await supabase.rpc('create_episodic_memory', {
      p_user_id: userId,
      p_character_key: characterKey,
      p_title: title,
      p_summary: summary,
      p_topics: topics,
      p_emotional_impact: emotionalImpact,
      p_salience: salience,
      p_trigger_keywords: topics
    });
    
    if (error) {
      console.error(`      ❌ Error creating episodic memory:`, error.message);
    } else {
      memoriesCreated++;
    }
  }
  
  console.log(`      ✅ Created ${memoriesCreated} episodic memories`);
}

async function initializeEmotionalState(userId, characterKey, interactions) {
  console.log('   ❤️ Initializing emotional state...');
  
  const totalInteractions = interactions.length;
  const happyInteractions = interactions.filter(i => i.emotional_tone === 'happy').length;
  const familyMentions = interactions.filter(i => 
    i.topics && i.topics.includes('family') || 
    i.content.toLowerCase().includes('family')
  ).length;
  
  // Calculate initial emotional values based on conversation patterns
  const affection = Math.min(50 + (happyInteractions * 2), 100);
  const trust = Math.min(30 + (totalInteractions), 100);
  const playfulness = Math.min(40 + (happyInteractions), 100);
  const clinginess = Math.min(20 + Math.floor(totalInteractions / 10), 100);
  
  const { error } = await supabase.rpc('update_emotional_state_safe', {
    p_user_id: userId,
    p_character_key: characterKey,
    p_affection_delta: affection - 50, // Adjust from defaults
    p_trust_delta: trust - 30,
    p_playfulness_delta: playfulness - 40,
    p_clinginess_delta: clinginess - 20,
    p_intimacy_delta: 0
  });
  
  if (error) {
    console.error(`      ❌ Error initializing emotional state:`, error.message);
  } else {
    console.log(`      ✅ Emotional state initialized (A:${affection}, T:${trust}, P:${playfulness}, C:${clinginess})`);
  }
}

async function main() {
  console.log('🧠 POPULATE MEMORIES FROM INTERACTION LOGS');
  console.log('This script processes existing conversation data to create memories.\n');
  
  await processExistingInteractions();
  
  console.log('\n📝 Next steps:');
  console.log('1. Test the dashboard to see populated memories');
  console.log('2. New conversations will automatically create memories');
  console.log('3. The memory system is now fully functional!');
}

main().catch(console.error);