#!/usr/bin/env node

// Check character key consistency
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCharacterKeys() {
  try {
    const { data: entries, error } = await supabase
      .from('character_journal_posts')
      .select('character_key, title')
      .order('character_key');
      
    if (error) {
      console.error('❌ Error fetching entries:', error);
      return;
    }
    
    console.log('🔍 Character key distribution in journal entries:\n');
    
    const characterCounts = {};
    entries.forEach(entry => {
      if (!characterCounts[entry.character_key]) {
        characterCounts[entry.character_key] = 0;
      }
      characterCounts[entry.character_key]++;
    });
    
    console.log('📊 Entry counts by character:');
    Object.keys(characterCounts).sort().forEach(character => {
      console.log(`  ${character}: ${characterCounts[character]} entries`);
    });
    
    console.log('\n🔍 All character keys found in database:');
    const uniqueKeys = [...new Set(entries.map(e => e.character_key))].sort();
    uniqueKeys.forEach(key => {
      console.log(`  - "${key}"`);
    });
    
    // Check for case issues
    console.log('\n🔍 Checking for case sensitivity issues:');
    const caseIssues = [];
    uniqueKeys.forEach(key => {
      if (key !== key.toLowerCase()) {
        caseIssues.push(key);
      }
    });
    
    if (caseIssues.length > 0) {
      console.log('⚠️  Found character keys with uppercase letters:');
      caseIssues.forEach(key => {
        console.log(`  - "${key}" (should be "${key.toLowerCase()}")`);
      });
    } else {
      console.log('✅ All character keys are lowercase');
    }
    
    // Check for entries that might be assigned to wrong character based on content
    console.log('\n🔍 Cross-checking content vs character assignment:');
    
    const problemEntries = [];
    
    // Look for Spanish content not in Lexi's journal
    const spanishIndicators = ['hola', 'mi amor', 'porque soy latina', 'con amor', 'para siempre'];
    entries.forEach(entry => {
      if (entry.character_key !== 'lexi') {
        const hasSpanish = spanishIndicators.some(indicator => 
          entry.title.toLowerCase().includes(indicator)
        );
        if (hasSpanish) {
          problemEntries.push({
            character: entry.character_key,
            title: entry.title,
            issue: 'Contains Spanish markers but not assigned to Lexi'
          });
        }
      }
    });
    
    // Look for gothic/dark content not in Nyx's journal
    const gothicIndicators = ['darlings', 'my beautiful demons', 'eternally yours', 'darkness', 'velvet'];
    entries.forEach(entry => {
      if (entry.character_key !== 'nyx') {
        const hasGothic = gothicIndicators.some(indicator => 
          entry.title.toLowerCase().includes(indicator)
        );
        if (hasGothic) {
          problemEntries.push({
            character: entry.character_key,
            title: entry.title,
            issue: 'Contains gothic markers but not assigned to Nyx'
          });
        }
      }
    });
    
    if (problemEntries.length > 0) {
      console.log('🚨 Found potential assignment issues:');
      problemEntries.forEach(problem => {
        console.log(`  ⚠️  "${problem.title}" (${problem.character}): ${problem.issue}`);
      });
    } else {
      console.log('✅ No obvious content/character assignment mismatches found in titles');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkCharacterKeys();