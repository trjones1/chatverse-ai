// Quick test migration for existing data
// Run this to test the AI enhancement on a small sample

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openrouterKey = process.env.OPENROUTER_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openrouterKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function quickTestMigration() {
  console.log('🧪 Running quick test migration on existing data...\n');

  try {
    // Get the most recent user_facts record for testing
    const { data: userFacts, error } = await admin
      .from('user_facts')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !userFacts || userFacts.length === 0) {
      console.log('❌ No user_facts found to test');
      return;
    }

    const testUser = userFacts[0];
    console.log(`🎯 Testing with user: ${testUser.user_id}, character: ${testUser.character_key}`);
    console.log(`📋 Current facts:`, {
      name: testUser.display_name,
      occupation: testUser.occupation,
      favorites: testUser.favorites,
      tags: testUser.tags
    });

    // Get conversation history for this user
    const { data: conversations } = await admin
      .from('interaction_log')
      .select('role, content, created_at')
      .eq('user_id', testUser.user_id)
      .eq('character_key', testUser.character_key)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!conversations || conversations.length === 0) {
      console.log('❌ No conversation history found for this user');
      return;
    }

    console.log(`💬 Found ${conversations.length} messages for analysis`);

    // Format for AI
    const conversationText = conversations
      .reverse()
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    console.log('\n🤖 Sending to AI for analysis...');

    const analysisPrompt = `Analyze this conversation and extract comprehensive user facts:

${conversationText}

Return JSON with enhanced user information:
{
  "display_name": "name or null",
  "occupation": "job or null",
  "favorites": {
    "hobbies": ["list of hobbies"],
    "interests": ["list of interests"]
  },
  "communication_style": "description of how they communicate",
  "tags": ["personality", "descriptive", "tags"],
  "personal_insights": "key personal details or patterns"
}

Return ONLY the JSON object.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 800,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      console.error('❌ AI API failed:', response.status);
      return;
    }

    const aiResult = await response.json();
    const analysisText = aiResult.choices?.[0]?.message?.content?.trim();

    console.log('\n✨ AI Analysis Result:');
    console.log(analysisText);

    let enhancedFacts;
    try {
      enhancedFacts = JSON.parse(analysisText);
      console.log('\n📊 Parsed Enhancement Data:');
      console.log(JSON.stringify(enhancedFacts, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      return;
    }

    // Show what would be updated
    console.log('\n🔄 Would update user_facts with:');
    console.log('Before:', {
      name: testUser.display_name,
      occupation: testUser.occupation,
      favorites: testUser.favorites,
      tags: testUser.tags
    });

    console.log('After:', {
      name: enhancedFacts.display_name || testUser.display_name,
      occupation: enhancedFacts.occupation || testUser.occupation,
      favorites: JSON.stringify(enhancedFacts.favorites || {}),
      tags: enhancedFacts.tags || testUser.tags,
      insights: enhancedFacts.personal_insights
    });

    console.log('\n✅ Test migration completed successfully!');
    console.log('🚀 Ready to run full migration when you merge the PR.');

  } catch (error) {
    console.error('❌ Test migration failed:', error);
  }
}

// Run the test
quickTestMigration();