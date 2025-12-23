// Export anonymous conversations to JSON for optimization analysis
// Usage: node scripts/export-conversations-json.js > conversations.json

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportConversations() {
  console.error('📦 Exporting anonymous conversations...\n');

  // Get all anonymous messages grouped by anonymous_id
  const { data: messages, error } = await supabase
    .from('anonymous_interactions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching messages:', error);
    process.exit(1);
  }

  // Group by anonymous_id
  const conversations = {};

  messages.forEach(msg => {
    const anonId = msg.anonymous_id;
    if (!conversations[anonId]) {
      conversations[anonId] = {
        anonymous_id: anonId,
        character: msg.character_key,
        message_count: 0,
        first_message: msg.created_at,
        last_message: msg.created_at,
        messages: []
      };
    }

    conversations[anonId].messages.push({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      emotional_tone: msg.emotional_tone,
      topics: msg.topics,
      nsfw: msg.nsfw
    });

    conversations[anonId].message_count++;
    conversations[anonId].last_message = msg.created_at;
  });

  // Convert to array and add metadata
  const conversationsArray = Object.values(conversations).map(conv => ({
    ...conv,
    duration_minutes: Math.round(
      (new Date(conv.last_message) - new Date(conv.first_message)) / 60000
    ),
    converted_to_signup: false // You can manually mark these later
  }));

  // Sort by message count descending (most engaged first)
  conversationsArray.sort((a, b) => b.message_count - a.message_count);

  console.error(`✅ Exported ${conversationsArray.length} conversations\n`);
  console.error(`📊 Stats:`);
  console.error(`   Total messages: ${messages.length}`);
  console.error(`   Avg messages per convo: ${(messages.length / conversationsArray.length).toFixed(1)}`);
  console.error(`   Characters: ${[...new Set(messages.map(m => m.character))].join(', ')}`);
  console.error('\n📋 Output JSON below:\n');

  // Output JSON to stdout (redirect to file)
  console.log(JSON.stringify({
    exported_at: new Date().toISOString(),
    total_conversations: conversationsArray.length,
    total_messages: messages.length,
    conversations: conversationsArray
  }, null, 2));
}

exportConversations().catch(err => {
  console.error('❌ Export failed:', err);
  process.exit(1);
});
