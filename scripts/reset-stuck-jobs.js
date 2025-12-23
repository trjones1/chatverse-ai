#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStuckJobs() {
  try {
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
      return;
    }

    console.log(`📊 Found ${stuckJobs.length} stuck jobs`);
    
    if (stuckJobs.length === 0) {
      console.log('✅ No stuck jobs found!');
      return;
    }

    // Show details of stuck jobs
    stuckJobs.forEach((job, index) => {
      console.log(`\n${index + 1}. Job ID: ${job.id}`);
      console.log(`   Character: ${job.character_key}`);
      console.log(`   Type: ${job.content_type}`);
      console.log(`   Started: ${job.updated_at}`);
      console.log(`   Duration: ${Math.round((Date.now() - new Date(job.updated_at)) / (1000 * 60))} minutes`);
    });

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
      return;
    }

    console.log(`\n✅ Successfully reset ${updatedJobs.length} stuck jobs to pending status`);
    
    // Show current queue status
    const { data: queueStats } = await supabase
      .from('content_generation_queue')
      .select('status')
      .neq('status', 'completed');

    const stats = queueStats.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Current queue status:');
    Object.entries(stats).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

resetStuckJobs();