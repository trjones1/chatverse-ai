#!/usr/bin/env node

// Test script for local Stable Diffusion generation
const { getSupabaseAdmin } = require('../lib/supabaseAdmin');

async function addTestQueueItem() {
  console.log('🧪 Adding test queue item for local face consistency testing...');
  
  const supabase = getSupabaseAdmin();
  
  const testItem = {
    character_key: 'nyx',
    content_type: 'image',
    generation_prompt: 'beautiful woman with dark hair and pale skin in a beach setting, wearing a black dress, natural lighting, professional photography, confident expression',
    prompt_data: {
      mood: 'confident',
      style_modifiers: ['photorealistic'],
      nsfw: false
    },
    priority: 10,
    status: 'pending',
    batch_id: `test-${Date.now()}`,
    metadata: {
      test_run: true,
      local_generation: true,
      face_consistency_requested: true
    }
  };
  
  const { data, error } = await supabase
    .from('content_generation_queue')
    .insert(testItem)
    .select()
    .single();
    
  if (error) {
    console.error('❌ Failed to add test item:', error);
    return;
  }
  
  console.log('✅ Test queue item added:', data.id);
  console.log('🎯 Character:', data.character_key);
  console.log('📝 Prompt:', data.generation_prompt.substring(0, 80) + '...');
  console.log('');
  console.log('Next steps:');
  console.log('1. Make sure Stable Diffusion WebUI is running:');
  console.log('   cd ~/stable-diffusion-webui && ./webui.sh --api --listen --port 7860 --nowebui');
  console.log('');
  console.log('2. Process the queue:');
  console.log('   curl -X POST "http://localhost:3001/api/admin/process-queue?debug=dev" -d \'{"action": "process_queue"}\'');
  console.log('');
  console.log('3. Check approval queue:');
  console.log('   curl -X GET "http://localhost:3001/api/admin/content/approval?debug=dev"');
}

addTestQueueItem().catch(console.error);