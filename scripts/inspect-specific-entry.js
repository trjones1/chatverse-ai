#!/usr/bin/env node

// Inspect specific journal entry
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectEntry() {
  try {
    const { data: entry, error } = await supabase
      .from('character_journal_posts')
      .select('*')
      .eq('id', '21ea4e9c-b508-4868-a6f4-e5fd26edf5e8')
      .single();
      
    if (error) {
      console.error('❌ Error fetching entry:', error);
      return;
    }
    
    console.log('📝 Entry Details:');
    console.log(`ID: ${entry.id}`);
    console.log(`Character: ${entry.character_key}`);
    console.log(`Title: ${entry.title}`);
    console.log(`Created: ${entry.created_at}`);
    console.log(`\nContent:`);
    console.log(entry.content);
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

inspectEntry();