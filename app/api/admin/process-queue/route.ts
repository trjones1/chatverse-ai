import { NextRequest, NextResponse } from 'next/server';
import { ContentProcessor } from '../../../../lib/contentProcessor';
import { makeServerSupabase } from '../../../../lib/supabaseServer';
import { requireAdmin } from '../../../../lib/admin';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const body = await request.json().catch(() => ({}));
    const { action = 'process_queue', batchId } = body;

    const processor = new ContentProcessor();

    if (action === 'process_queue') {
      console.log('🚀 Starting manual queue processing...');
      
      // Run queue processing
      await processor.processQueue();
      
      // Get current stats
      const stats = await processor.getProcessingStats();
      
      return NextResponse.json({
        success: true,
        message: 'Queue processing completed',
        stats,
        timestamp: new Date().toISOString()
      });
      
    } else if (action === 'process_batch' && batchId) {
      console.log(`🎯 Processing specific batch: ${batchId}`);
      
      await processor.processBatch(batchId);
      
      return NextResponse.json({
        success: true,
        message: `Batch ${batchId} processing completed`,
        batchId,
        timestamp: new Date().toISOString()
      });
      
    } else if (action === 'clear_queue') {
      console.log('🧹 Clearing queue...');
      
      const result = await processor.clearQueue();
      
      return NextResponse.json({
        success: true,
        message: `Cleared ${result.cleared_count} pending items`,
        cleared_count: result.cleared_count,
        timestamp: new Date().toISOString()
      });
      
    } else if (action === 'get_stats') {
      const stats = await processor.getProcessingStats();
      
      return NextResponse.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
      
    } else {
      return NextResponse.json({
        error: 'Invalid action',
        validActions: ['process_queue', 'process_batch', 'clear_queue', 'get_stats']
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Queue processing error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for status check
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const processor = new ContentProcessor();
    const stats = await processor.getProcessingStats();

    return NextResponse.json({
      message: 'Queue processor status',
      stats,
      environment: process.env.NODE_ENV,
      isLocalDev: false,
      usage: {
        process_queue: 'POST with {"action": "process_queue"}',
        process_batch: 'POST with {"action": "process_batch", "batchId": "batch-id"}',
        clear_queue: 'POST with {"action": "clear_queue"}',
        get_stats: 'POST with {"action": "get_stats"}'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}