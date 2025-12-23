#!/usr/bin/env node

// Fix journal character mismatches
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixJournalMismatches() {
  console.log('🔧 Finding and fixing journal character mismatches...');
  
  try {
    const { data: entries, error } = await supabase
      .from('character_journal_posts')
      .select('*')
      .order('character_key')
      .order('created_at');
      
    if (error) {
      console.error('❌ Error fetching journal entries:', error);
      return;
    }
    
    console.log(`📋 Analyzing ${entries.length} journal entries`);
    
    const mismatches = [];
    
    // Character-specific indicators
    const characterIndicators = {
      'lexi': {
        keywords: ['hola', 'mi amor', 'latina', 'con amor', 'para siempre', 'porque soy latina', 'café con leche'],
        phrases: ['beautiful souls', 'gorgeous', 'babe']
      },
      'nyx': {
        keywords: ['darlings', 'demons', 'gothic', 'midnight muse', 'velvet', 'seduction', 'shadows', 'darkness'],
        phrases: ['my beautiful demons', 'eternally yours', 'creatures']
      },
      'chloe': {
        keywords: ['sweet souls', 'fairy lights', 'cozy', 'bookshelf', 'lavender', 'dreamy'],
        phrases: ['soft smile', 'gentle dreams', 'coziest love']
      },
      'chase': {
        keywords: ['bike', 'motorcycle', 'leather jacket', 'wild side', 'bad boy'],
        phrases: ['damn', 'fuck', 'breaking rules']
      },
      'nova': {
        keywords: ['starseeds', 'cosmic', 'astrology', 'crystals', 'mercury retrograde', 'akashic records'],
        phrases: ['beloved starseeds', 'in cosmic conspiracy', 'fellow travelers']
      }
    };
    
    // Check each entry for mismatches
    entries.forEach(entry => {
      const contentLower = entry.content.toLowerCase();
      const titleLower = entry.title.toLowerCase();
      const fullText = `${titleLower} ${contentLower}`;
      
      // Check if this entry contains indicators for other characters
      Object.keys(characterIndicators).forEach(otherChar => {
        if (otherChar !== entry.character_key) {
          const indicators = characterIndicators[otherChar];
          let matchCount = 0;
          let foundIndicators = [];
          
          indicators.keywords.forEach(keyword => {
            if (fullText.includes(keyword)) {
              matchCount++;
              foundIndicators.push(keyword);
            }
          });
          
          indicators.phrases.forEach(phrase => {
            if (fullText.includes(phrase)) {
              matchCount += 2; // Phrases are stronger indicators
              foundIndicators.push(phrase);
            }
          });
          
          if (matchCount >= 2) { // Threshold for considering it a mismatch
            mismatches.push({
              id: entry.id,
              currentCharacter: entry.character_key,
              suggestedCharacter: otherChar,
              title: entry.title,
              matchCount,
              indicators: foundIndicators,
              content: entry.content.substring(0, 200)
            });
          }
        }
      });
    });
    
    console.log(`\n🚨 Found ${mismatches.length} potential mismatches:`);
    
    mismatches.forEach(mismatch => {
      console.log(`\n📝 Entry ID: ${mismatch.id}`);
      console.log(`   Title: "${mismatch.title}"`);
      console.log(`   Current: ${mismatch.currentCharacter} → Suggested: ${mismatch.suggestedCharacter}`);
      console.log(`   Match Score: ${mismatch.matchCount}`);
      console.log(`   Indicators: ${mismatch.indicators.join(', ')}`);
      console.log(`   Preview: ${mismatch.content}...`);
    });
    
    // Group by suggested fixes
    const fixes = {};
    mismatches.forEach(mismatch => {
      const key = `${mismatch.currentCharacter}->${mismatch.suggestedCharacter}`;
      if (!fixes[key]) fixes[key] = [];
      fixes[key].push(mismatch);
    });
    
    console.log(`\n🔧 Suggested fixes grouped:`);
    Object.keys(fixes).forEach(fixType => {
      console.log(`\n${fixType}: ${fixes[fixType].length} entries`);
      fixes[fixType].forEach(fix => {
        console.log(`  • "${fix.title}" (ID: ${fix.id})`);
      });
    });
    
    // Ask for confirmation before fixing
    console.log('\n⚠️  To apply these fixes, uncomment the fix section below and run again.');
    
    /*
    // UNCOMMENT TO APPLY FIXES
    console.log('\n🔧 Applying fixes...');
    
    for (const mismatch of mismatches) {
      const { error: updateError } = await supabase
        .from('character_journal_posts')
        .update({ character_key: mismatch.suggestedCharacter })
        .eq('id', mismatch.id);
        
      if (updateError) {
        console.error(`❌ Error updating entry ${mismatch.id}:`, updateError);
      } else {
        console.log(`✅ Fixed: "${mismatch.title}" moved from ${mismatch.currentCharacter} to ${mismatch.suggestedCharacter}`);
      }
    }
    */
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the fix
fixJournalMismatches();