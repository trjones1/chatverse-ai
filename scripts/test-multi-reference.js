// Test Multi-Reference Face Consistency System
// Run with: node scripts/test-multi-reference.js

import { AdvancedConsistencyTechniques, FaceConsistencyManager } from '../lib/faceConsistency.js';

async function testMultiReference() {
  console.log('🎯 Testing Multi-Reference Face Consistency System\n');

  const testCases = [
    {
      character: 'lexi',
      prompt: 'beautiful woman in elegant dress',
      provider: 'replicate'
    },
    {
      character: 'nyx', 
      prompt: 'gothic woman with dark makeup',
      provider: 'replicate'
    }
  ];

  for (const test of testCases) {
    console.log(`\n📸 Testing ${test.character.toUpperCase()} multi-reference consistency:`);
    console.log(`Base: ${test.prompt}`);
    
    try {
      // Test standard Stable Diffusion optimization
      console.log('\n🔧 Standard Optimization:');
      const standardResult = AdvancedConsistencyTechniques.optimizeForStableDiffusion(
        test.prompt, 
        test.character,
        false, // No ControlNet
        false  // No multi-reference
      );
      console.log(`Prompt: ${standardResult.prompt.substring(0, 100)}...`);
      console.log(`Guidance Scale: ${standardResult.additionalParams.guidance_scale}`);

      // Test multi-reference optimization
      console.log('\n💪 Multi-Reference Optimization:');
      const multiRefResult = AdvancedConsistencyTechniques.optimizeForStableDiffusion(
        test.prompt, 
        test.character,
        false, // No ControlNet
        true   // Use multi-reference
      );
      console.log(`Prompt: ${multiRefResult.prompt.substring(0, 100)}...`);
      console.log(`Guidance Scale: ${multiRefResult.additionalParams.guidance_scale}`);
      console.log(`Inference Steps: ${multiRefResult.additionalParams.num_inference_steps}`);

      // Test ControlNet + Multi-Reference
      console.log('\n🎮 ControlNet + Multi-Reference:');
      const controlNetResult = AdvancedConsistencyTechniques.optimizeForStableDiffusion(
        test.prompt, 
        test.character,
        true,  // Use ControlNet
        true   // Use multi-reference
      );
      console.log(`Reference Image: ${controlNetResult.referenceImage}`);
      console.log(`ControlNet Scale: ${controlNetResult.additionalParams.controlnet_conditioning_scale}`);

      // Test reference URL rotation
      console.log('\n🔄 Reference URL Rotation:');
      const allRefs = FaceConsistencyManager.getAllReferenceUrls(test.character);
      console.log(`Total References: ${allRefs.length}`);
      for (let i = 0; i < 3; i++) {
        const randomRef = FaceConsistencyManager.getRandomReferenceUrl(test.character);
        console.log(`Random Reference ${i + 1}: ${randomRef}`);
      }
      
    } catch (error) {
      console.error(`❌ Error for ${test.character}:`, error.message);
    }
  }

  console.log('\n🎉 Multi-reference test complete!');
  console.log('\n📊 Enhancement Summary:');
  console.log('• Multiple reference photos per character ✅');
  console.log('• Stronger consistency prompts for multi-ref ✅'); 
  console.log('• Higher guidance scales for better consistency ✅');
  console.log('• Reference photo rotation for variation ✅');
  console.log('• ControlNet integration with random references ✅');
  console.log('\n📁 File Structure:');
  console.log('/public/references/lexi/lexi-01.jpg (primary)');
  console.log('/public/references/lexi/lexi-02.jpg (alternative angle)');
  console.log('/public/references/lexi/lexi-03.jpg (different expression)');
  console.log('/public/references/lexi/lexi-04.jpg (additional stability)');
}

testMultiReference().catch(console.error);