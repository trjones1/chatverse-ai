// Quick verification script to check migration results
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 Verifying migration results...');

  // Check enhanced user_facts
  const { data: userFacts, error } = await admin
    .from('user_facts')
    .select('user_id, character_key, display_name, occupation, tags, favorites, dislikes, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching user_facts:', error);
    return;
  }

  console.log('\n📊 Enhanced User Facts:');
  userFacts.forEach(fact => {
    console.log(`\n👤 User: ${fact.user_id.substring(0, 8)}... | Character: ${fact.character_key}`);
    console.log(`   Display Name: ${fact.display_name || 'null'}`);
    console.log(`   Occupation: ${fact.occupation || 'null'}`);
    console.log(`   Tags: ${fact.tags ? fact.tags.join(', ') : 'none'}`);
    console.log(`   Updated: ${fact.updated_at}`);

    if (fact.favorites) {
      try {
        const favorites = typeof fact.favorites === 'string' ? JSON.parse(fact.favorites) : fact.favorites;
        console.log(`   Favorites: ${Object.keys(favorites).length} categories`);
      } catch (e) {
        console.log(`   Favorites: Invalid JSON`);
      }
    }
  });

  console.log(`\n✅ Found ${userFacts.length} enhanced user_facts records`);
}

verifyMigration().catch(console.error);