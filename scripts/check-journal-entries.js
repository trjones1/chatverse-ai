#!/usr/bin/env node

// Check journal entries for character mismatches
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkJournalEntries() {
  console.log('🔍 Checking journal entries for character mismatches...');
  
  try {
    const { data: entries, error } = await supabase
      .from('character_journal_posts')
      .select('id, character_key, title, content, created_at')
      .order('character_key')
      .order('created_at');
      
    if (error) {
      console.error('❌ Error fetching journal entries:', error);
      return;
    }
    
    console.log(`📋 Found ${entries.length} journal entries`);
    console.log('\n📝 Entries by character:');
    
    const characterEntries = {};
    entries.forEach(entry => {
      if (!characterEntries[entry.character_key]) {
        characterEntries[entry.character_key] = [];
      }
      characterEntries[entry.character_key].push(entry);
    });
    
    // Check each character's entries
    Object.keys(characterEntries).forEach(character => {
      console.log(`\n🎭 ${character.toUpperCase()} (${characterEntries[character].length} entries):`);
      
      characterEntries[character].forEach(entry => {
        const contentPreview = entry.content.substring(0, 150).replace(/\n/g, ' ');
        console.log(`  • "${entry.title}" - ${contentPreview}...`);
        
        // Check for character name mismatches in content
        const contentLower = entry.content.toLowerCase();
        const otherCharacters = ['lexi', 'nyx', 'chloe', 'chase', 'nova', 'aiko', 'zaria', 'dom', 'ethan', 'jayden', 'miles'];
        
        otherCharacters.forEach(otherChar => {
          if (otherChar !== character && contentLower.includes(otherChar)) {
            console.log(`    ⚠️  POTENTIAL MISMATCH: Contains "${otherChar}" in content`);
          }
        });
      });
    });
    
    // Look for specific mismatches mentioned by user
    console.log('\n🔍 Looking for specific issues:');
    
    const nyxEntries = characterEntries['nyx'] || [];
    const lexiEntries = characterEntries['lexi'] || [];
    
    console.log(`\n🕷️ Nyx entries (checking for Lexi content):`);
    nyxEntries.forEach(entry => {
      const contentLower = entry.content.toLowerCase();
      if (contentLower.includes('lexi') || contentLower.includes('hola') || contentLower.includes('latina') || contentLower.includes('mi amor')) {
        console.log(`  🚨 MISMATCH FOUND: "${entry.title}" contains Lexi-specific content`);
        console.log(`     Content preview: ${entry.content.substring(0, 200).replace(/\n/g, ' ')}...`);
      }
    });
    
    console.log(`\n💋 Lexi entries (checking for Nyx content):`);
    lexiEntries.forEach(entry => {
      const contentLower = entry.content.toLowerCase();
      if (contentLower.includes('nyx') || contentLower.includes('gothic') || contentLower.includes('darkness') || contentLower.includes('midnight muse')) {
        console.log(`  🚨 MISMATCH FOUND: "${entry.title}" contains Nyx-specific content`);
        console.log(`     Content preview: ${entry.content.substring(0, 200).replace(/\n/g, ' ')}...`);
      }
    });
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the check
checkJournalEntries();