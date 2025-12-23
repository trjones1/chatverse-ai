import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check - you can enhance this
    const debugToken = request.headers.get('x-debug-token') || request.nextUrl.searchParams.get('debug');
    if (debugToken !== 'dev') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'reset_stuck'; // Default action

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'clear_failed') {
      console.log('🗑️ Clearing failed jobs...');
      
      // Find failed jobs
      const { data: failedJobs, error: findError } = await supabase
        .from('content_generation_queue')
        .select('*')
        .eq('status', 'failed');

      if (findError) {
        console.error('❌ Error finding failed jobs:', findError);
        return NextResponse.json({ error: 'Failed to find failed jobs', details: findError }, { status: 500 });
      }

      console.log(`📊 Found ${failedJobs.length} failed jobs`);
      
      if (failedJobs.length === 0) {
        return NextResponse.json({ 
          message: '✅ No failed jobs found!',
          failedJobs: [],
          deletedCount: 0
        });
      }

      // Delete failed jobs
      const { error: deleteError } = await supabase
        .from('content_generation_queue')
        .delete()
        .eq('status', 'failed');

      if (deleteError) {
        console.error('❌ Error deleting failed jobs:', deleteError);
        return NextResponse.json({ error: 'Failed to delete failed jobs', details: deleteError }, { status: 500 });
      }

      console.log(`✅ Successfully deleted ${failedJobs.length} failed jobs`);

      return NextResponse.json({
        message: `✅ Successfully deleted ${failedJobs.length} failed jobs`,
        deletedCount: failedJobs.length,
        failedJobs: failedJobs.map(job => ({
          id: job.id,
          character_key: job.character_key,
          content_type: job.content_type,
          updated_at: job.updated_at,
          error_message: job.error_message || 'No error message'
        }))
      });
    }

    // Default action: reset stuck jobs
    console.log('🔍 Checking for stuck jobs...');
    
    // Find jobs stuck in processing for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckJobs, error: findError } = await supabase
      .from('content_generation_queue')
      .select('*')
      .eq('status', 'processing')
      .lt('updated_at', tenMinutesAgo);

    if (findError) {
      console.error('❌ Error finding stuck jobs:', findError);
      return NextResponse.json({ error: 'Failed to find stuck jobs', details: findError }, { status: 500 });
    }

    console.log(`📊 Found ${stuckJobs.length} stuck jobs`);
    
    if (stuckJobs.length === 0) {
      return NextResponse.json({ 
        message: '✅ No stuck jobs found!',
        stuckJobs: [],
        resetCount: 0
      });
    }

    // Reset stuck jobs to pending
    const { data: updatedJobs, error: updateError } = await supabase
      .from('content_generation_queue')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'processing')
      .lt('updated_at', tenMinutesAgo)
      .select();

    if (updateError) {
      console.error('❌ Error updating stuck jobs:', updateError);
      return NextResponse.json({ error: 'Failed to update stuck jobs', details: updateError }, { status: 500 });
    }

    console.log(`✅ Successfully reset ${updatedJobs.length} stuck jobs to pending status`);
    
    // Show current queue status
    const { data: queueStats } = await supabase
      .from('content_generation_queue')
      .select('status')
      .neq('status', 'completed');

    const stats = queueStats?.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      message: `✅ Successfully reset ${updatedJobs.length} stuck jobs to pending status`,
      resetCount: updatedJobs.length,
      stuckJobs: stuckJobs.map(job => ({
        id: job.id,
        character_key: job.character_key,
        content_type: job.content_type,
        updated_at: job.updated_at,
        durationMinutes: Math.round((Date.now() - new Date(job.updated_at).getTime()) / (1000 * 60))
      })),
      currentQueueStats: stats
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error occurred', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}