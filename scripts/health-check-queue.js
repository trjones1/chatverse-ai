#!/usr/bin/env node

const { ContentProcessor } = require('../lib/contentProcessor');

async function healthCheckQueue() {
  console.log('🏥 Running queue health check...');
  
  try {
    const processor = new ContentProcessor();
    const resetCount = await processor.resetStuckJobs();
    
    if (resetCount > 0) {
      console.log(`✅ Health check completed: Reset ${resetCount} stuck jobs`);
    } else {
      console.log('✅ Health check completed: No stuck jobs found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

healthCheckQueue();