// app/api/content/generate/route.ts
// Automated Content Generation API for Character Pipeline

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { PromptBuilder, type CharacterBible } from '@/lib/contentPipeline';
import { ContentProcessor } from '@/lib/contentProcessor';

export const dynamic = 'force-dynamic';

interface GenerationRequest {
  character_key: string;
  content_type: 'image' | 'video' | 'batch';
  quantity?: number;
  theme?: string;
  mood?: string;
  setting?: string;
  activity?: string;
  is_nsfw?: boolean;
  priority?: number;
}

export async function POST(req: NextRequest) {
  try {
    // Check admin environment flag
    if (!process.env.ENABLE_ADMIN_TOOLS) {
      return NextResponse.json({ error: 'Content generation not enabled' }, { status: 403 });
    }

    // Verify admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const body: GenerationRequest = await req.json();
    const { 
      character_key, 
      content_type, 
      quantity = 1, 
      theme, 
      mood, 
      setting, 
      activity, 
      is_nsfw = false,
      priority = 5 
    } = body;

    if (!character_key || !content_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: character_key, content_type' 
      }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Get character bible
    const { data: bible, error: bibleError } = await admin
      .from('character_bible')
      .select('*')
      .eq('character_key', character_key)
      .single();

    if (bibleError || !bible) {
      return NextResponse.json({ 
        error: `Character bible not found for ${character_key}. Please create character bible first.` 
      }, { status: 404 });
    }

    // Generate prompts using character bible
    const promptBuilder = new PromptBuilder(bible as CharacterBible);
    const batchId = crypto.randomUUID();
    const queueItems = [];

    if (content_type === 'batch') {
      // Generate multiple prompts for batch processing
      const prompts = promptBuilder.generateBatchPrompts(quantity, theme);
      
      for (let i = 0; i < prompts.length; i++) {
        queueItems.push({
          id: crypto.randomUUID(),
          character_key,
          content_type: 'image',
          generation_prompt: prompts[i],
          prompt_data: {
            mood,
            setting,
            activity,
            style_modifiers: theme ? [theme] : [],
            batch_index: i + 1,
            total_in_batch: quantity
          },
          status: 'pending',
          priority,
          batch_id: batchId
        });
      }
    } else {
      // Generate single prompt
      const prompt = promptBuilder.buildImagePrompt({
        mood,
        setting,
        activity,
        style: theme,
        isNSFW: is_nsfw
      });

      queueItems.push({
        id: crypto.randomUUID(),
        character_key,
        content_type,
        generation_prompt: prompt,
        prompt_data: {
          mood,
          setting,
          activity,
          style_modifiers: theme ? [theme] : [],
          technical_specs: {
            is_nsfw,
            quality: 'high',
            format: content_type === 'video' ? 'mp4' : 'png'
          }
        },
        status: 'pending',
        priority,
        batch_id: content_type === 'video' ? batchId : null
      });
    }

    // Insert into generation queue
    const { data: insertedItems, error: insertError } = await admin
      .from('content_generation_queue')
      .insert(queueItems)
      .select();

    if (insertError) {
      console.error('Failed to queue content generation:', insertError);
      return NextResponse.json({ 
        error: 'Failed to queue content generation' 
      }, { status: 500 });
    }

    // Trigger background processing (in a real app, this would be a queue worker)
    // For now, we'll just return the queue status
    const response = {
      success: true,
      message: `Queued ${queueItems.length} items for ${character_key}`,
      batch_id: batchId,
      queue_items: insertedItems?.map(item => ({
        id: item.id,
        status: item.status,
        priority: item.priority
      })),
      estimated_completion: calculateEstimatedCompletion(queueItems.length, content_type)
    };

    // Start background processing (simplified for demo)
    if (process.env.AUTO_PROCESS_QUEUE === 'true') {
      processQueueInBackground(batchId);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get generation queue status
export async function GET(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const url = new URL(req.url);
    const character_key = url.searchParams.get('character');
    const status = url.searchParams.get('status');
    const batch_id = url.searchParams.get('batch_id');

    const admin = getSupabaseAdmin();
    let query = admin
      .from('content_generation_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (character_key) {
      query = query.eq('character_key', character_key);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (batch_id) {
      query = query.eq('batch_id', batch_id);
    }

    const { data: queueItems, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    // Calculate queue statistics
    const stats = {
      total: queueItems?.length || 0,
      pending: queueItems?.filter(item => item.status === 'pending').length || 0,
      processing: queueItems?.filter(item => item.status === 'processing').length || 0,
      completed: queueItems?.filter(item => item.status === 'completed').length || 0,
      failed: queueItems?.filter(item => item.status === 'failed').length || 0
    };

    return NextResponse.json({
      success: true,
      queue_items: queueItems,
      statistics: stats
    });

  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function calculateEstimatedCompletion(itemCount: number, contentType: string): string {
  const baseTimePerItem = contentType === 'video' ? 120 : 30; // seconds
  const totalSeconds = itemCount * baseTimePerItem;
  const minutes = Math.ceil(totalSeconds / 60);
  
  return `${minutes} minutes`;
}

async function processQueueInBackground(batchId: string) {
  console.log(`🎨 Starting background processing for batch: ${batchId}`);
  
  try {
    const contentProcessor = new ContentProcessor();
    
    // Process the specific batch
    await contentProcessor.processBatch(batchId);
    
    console.log(`✅ Background processing complete for batch: ${batchId}`);
  } catch (error) {
    console.error(`❌ Background processing failed for batch ${batchId}:`, error);
  }
}