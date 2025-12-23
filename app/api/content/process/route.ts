// app/api/content/process/route.ts
// Content Processing Trigger API

import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { requireAdmin } from '@/lib/admin';
import { ContentProcessor } from '@/lib/contentProcessor';

export const dynamic = 'force-dynamic';

// Trigger content processing
export async function POST(req: NextRequest) {
  try {
    // Check admin environment flag
    if (!process.env.ENABLE_ADMIN_TOOLS) {
      return NextResponse.json({ error: 'Content processing not enabled' }, { status: 403 });
    }

    // Verify admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const { batch_id, action = 'process_queue' } = await req.json();

    const processor = new ContentProcessor();

    switch (action) {
      case 'process_queue':
        // Process all pending items in queue
        console.log('🚀 Triggering queue processing...');
        
        // Run processing in background (don't await for immediate response)
        processor.processQueue().catch(error => {
          console.error('Background processing error:', error);
        });

        return NextResponse.json({
          success: true,
          message: 'Queue processing started in background',
          action: 'process_queue'
        });

      case 'process_batch':
        if (!batch_id) {
          return NextResponse.json({ 
            error: 'batch_id required for process_batch action' 
          }, { status: 400 });
        }

        console.log(`🎯 Triggering batch processing for ${batch_id}...`);
        
        // Run batch processing in background
        processor.processBatch(batch_id).catch(error => {
          console.error('Background batch processing error:', error);
        });

        return NextResponse.json({
          success: true,
          message: `Batch ${batch_id} processing started`,
          action: 'process_batch',
          batch_id
        });

      case 'clear_queue':
        // Clear all pending items from generation queue
        console.log('🧹 Clearing generation queue...');
        
        const clearResult = await processor.clearQueue();
        
        return NextResponse.json({
          success: true,
          message: `Cleared ${clearResult.cleared_count} items from generation queue`,
          action: 'clear_queue',
          cleared_count: clearResult.cleared_count
        });

      case 'stats':
        const stats = await processor.getProcessingStats();
        
        return NextResponse.json({
          success: true,
          stats,
          action: 'stats'
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: process_queue, process_batch, clear_queue, or stats' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Content processing API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get processing status
export async function GET(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const processor = new ContentProcessor();
    const stats = await processor.getProcessingStats();

    return NextResponse.json({
      success: true,
      stats,
      available_providers: new (await import('@/lib/imageGenerators')).ImageGenerationService().getAvailableProviders(),
      environment_status: {
        openai_configured: !!process.env.OPENAI_API_KEY,
        replicate_configured: !!process.env.REPLICATE_API_TOKEN,
        midjourney_configured: !!(process.env.MIDJOURNEY_API_KEY && process.env.MIDJOURNEY_API_URL),
      }
    });

  } catch (error) {
    console.error('Processing status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}