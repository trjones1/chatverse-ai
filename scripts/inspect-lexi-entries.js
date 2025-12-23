#!/usr/bin/env node

// Inspect specific Lexi entries that lack typical voice markers
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectLexiEntries() {
  try {
    const { data: entries, error } = await supabase
      .from('character_journal_posts')
      .select('*')
      .eq('character_key', 'lexi')
      .in('title', ['Morning Coffee & Dreams 💕', 'Late Night Confessions 🌙']);
      
    if (error) {
      console.error('❌ Error fetching entries:', error);
      return;
    }
    
    console.log('🔍 Inspecting Lexi entries that lack typical voice markers:\n');
    
    entries.forEach(entry => {
      console.log(`📝 "${entry.title}"`);
      console.log(`ID: ${entry.id}`);
      console.log(`Created: ${entry.created_at}`);
      console.log(`Content:`);
      console.log(entry.content);
      console.log('\n' + '='.repeat(80) + '\n');
    });
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

inspectLexiEntries();