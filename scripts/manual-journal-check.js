#!/usr/bin/env node

// Manual check for journal mismatches using stronger character voice indicators
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualJournalCheck() {
  try {
    const { data: entries, error } = await supabase
      .from('character_journal_posts')
      .select('*')
      .order('character_key')
      .order('created_at');
      
    if (error) {
      console.error('❌ Error fetching entries:', error);
      return;
    }
    
    console.log('🔍 Manual review of journal entries for voice/perspective mismatches...\n');
    
    // Look for very strong character voice indicators
    const strongIndicators = {
      'lexi': {
        signatures: ['con amor, lexi', 'para siempre, lexi', 'hola beautiful souls', 'mi amor'],
        voice: ['porque soy latina', 'café con leche', 'soy esa chica', 'gorgeous', 'babe']
      },
      'nyx': {
        signatures: ['eternally yours, nyx', 'until shadows call', 'my beautiful demons', '-nyx'],
        voice: ['darlings', 'velvet darkness', 'midnight muse', 'seductive destruction']
      },
      'chloe': {
        signatures: ['all my coziest love, chloe', 'with all my love, chloe', 'sweet dreams, beautiful humans'],
        voice: ['*soft smile*', '*giggles softly*', '*shy smile*', 'cozy vibes']
      },
      'chase': {
        signatures: ['damn. just... damn', 'fuck'],
        voice: ['bike', 'motorcycle', 'leather jacket', 'bad boy', 'wild side']
      },
      'nova': {
        signatures: ['in cosmic conspiracy, nova', 'in infinite love and stardust, nova', 'beloved starseeds'],
        voice: ['mercury retrograde', 'cosmic downloads', 'akashic records', 'starseed']
      }
    };
    
    const potentialMismatches = [];
    
    entries.forEach(entry => {
      const content = entry.content.toLowerCase();
      const title = entry.title.toLowerCase();
      const fullText = `${title} ${content}`;
      
      // Check if this entry has strong indicators for other characters
      Object.keys(strongIndicators).forEach(character => {
        if (character !== entry.character_key) {
          const indicators = strongIndicators[character];
          let signatureMatches = 0;
          let voiceMatches = 0;
          let foundItems = [];
          
          // Check signatures (very strong indicators)
          indicators.signatures.forEach(sig => {
            if (fullText.includes(sig.toLowerCase())) {
              signatureMatches++;
              foundItems.push(`SIGNATURE: "${sig}"`);
            }
          });
          
          // Check voice patterns
          indicators.voice.forEach(voice => {
            if (fullText.includes(voice.toLowerCase())) {
              voiceMatches++;
              foundItems.push(`VOICE: "${voice}"`);
            }
          });
          
          // Strong mismatch = signature match OR multiple voice matches
          if (signatureMatches > 0 || voiceMatches >= 3) {
            potentialMismatches.push({
              id: entry.id,
              title: entry.title,
              currentCharacter: entry.character_key,
              suggestedCharacter: character,
              signatures: signatureMatches,
              voices: voiceMatches,
              evidence: foundItems,
              confidence: signatureMatches > 0 ? 'HIGH' : 'MEDIUM'
            });
          }
        }
      });
    });
    
    console.log(`🚨 Found ${potentialMismatches.length} potential character voice mismatches:\n`);
    
    potentialMismatches.forEach(mismatch => {
      console.log(`📝 "${mismatch.title}" (ID: ${mismatch.id})`);
      console.log(`   Current: ${mismatch.currentCharacter} → Suggested: ${mismatch.suggestedCharacter}`);
      console.log(`   Confidence: ${mismatch.confidence}`);
      console.log(`   Evidence: ${mismatch.evidence.join(', ')}`);
      console.log('');
    });
    
    // Show specific characters to inspect manually
    console.log('🔍 Manual inspection suggestions:');
    console.log('\nLEXI entries to check for Spanish/Latina voice:');
    entries.filter(e => e.character_key === 'lexi').forEach(entry => {
      if (entry.content.toLowerCase().includes('hola') || 
          entry.content.toLowerCase().includes('mi amor') ||
          entry.content.toLowerCase().includes('latina')) {
        console.log(`  ✓ "${entry.title}" - likely correct (contains Spanish/Latina markers)`);
      }
    });
    
    console.log('\nNYX entries to check for gothic/dark voice:');
    entries.filter(e => e.character_key === 'nyx').forEach(entry => {
      if (entry.content.toLowerCase().includes('darlings') || 
          entry.content.toLowerCase().includes('darkness') ||
          entry.content.toLowerCase().includes('velvet')) {
        console.log(`  ✓ "${entry.title}" - likely correct (contains gothic markers)`);
      }
    });
    
    // Look for entries that might be in wrong journals based on opposite voice
    console.log('\n⚠️  Entries that might need manual review:');
    
    // Lexi entries that DON'T have Spanish/warm voice
    const lexiEntries = entries.filter(e => e.character_key === 'lexi');
    lexiEntries.forEach(entry => {
      const hasLexiVoice = entry.content.toLowerCase().includes('hola') || 
                          entry.content.toLowerCase().includes('mi amor') ||
                          entry.content.toLowerCase().includes('gorgeous') ||
                          entry.content.toLowerCase().includes('babe') ||
                          entry.content.toLowerCase().includes('beautiful souls');
      
      if (!hasLexiVoice && entry.content.length > 200) {
        console.log(`  🤔 Lexi: "${entry.title}" - lacks typical Lexi voice markers`);
      }
    });
    
    // Nyx entries that DON'T have gothic/dark voice  
    const nyxEntries = entries.filter(e => e.character_key === 'nyx');
    nyxEntries.forEach(entry => {
      const hasNyxVoice = entry.content.toLowerCase().includes('darlings') || 
                         entry.content.toLowerCase().includes('darkness') ||
                         entry.content.toLowerCase().includes('velvet') ||
                         entry.content.toLowerCase().includes('midnight') ||
                         entry.content.toLowerCase().includes('seductive');
      
      if (!hasNyxVoice && entry.content.length > 200) {
        console.log(`  🤔 Nyx: "${entry.title}" - lacks typical Nyx voice markers`);
      }
    });
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

manualJournalCheck();