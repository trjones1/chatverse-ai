// Test Face Consistency System
// Run with: node scripts/test-face-consistency.js

import { ConsistentPromptBuilder } from '../lib/faceConsistency.js';

async function testFaceConsistency() {
  console.log('🎯 Testing Face Consistency System\n');

  const testCases = [
    {
      character: 'lexi',
      basePrompt: 'beautiful woman sitting in a cafe',
      mood: 'confident',
      setting: 'luxury restaurant'
    },
    {
      character: 'nyx', 
      basePrompt: 'mysterious woman in urban setting',
      mood: 'mysterious',
      setting: 'dark alley'
    },
    {
      character: 'aiko',
      basePrompt: 'cute girl with colorful hair',
      mood: 'playful',
      setting: 'kawaii bedroom'
    }
  ];

  for (const test of testCases) {
    console.log(`\n📸 Testing ${test.character.toUpperCase()} consistency:`);
    console.log(`Base: ${test.basePrompt}`);
    
    try {
      const result = ConsistentPromptBuilder.buildImagePrompt({
        characterKey: test.character,
        basePrompt: test.basePrompt,
        mood: test.mood,
        setting: test.setting,
        provider: 'dalle'
      });

      console.log(`✅ Enhanced Prompt: ${result.prompt.substring(0, 150)}...`);
      if (result.negativePrompt) {
        console.log(`🚫 Negative Prompt: ${result.negativePrompt.substring(0, 100)}...`);
      }
      console.log(`📊 Metadata: ${JSON.stringify(result.metadata, null, 2)}`);
      
    } catch (error) {
      console.error(`❌ Error for ${test.character}:`, error.message);
    }
  }

  console.log('\n🎉 Face consistency test complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Add your reference photos to /public/references/');
  console.log('2. Update facial descriptions in /lib/faceConsistency.ts');
  console.log('3. Test with real image generation in /app/admin/content');
}

testFaceConsistency().catch(console.error);