// scripts/process-content-queue.js
// Automated Content Processing Script - Run as cron job

const { ContentProcessor } = require('../lib/contentProcessor');

async function main() {
  console.log('🚀 Starting automated content processing...');
  console.log('Time:', new Date().toISOString());
  
  try {
    const processor = new ContentProcessor();
    
    // Get current stats
    const beforeStats = await processor.getProcessingStats();
    console.log('📊 Before processing:', beforeStats);
    
    // Process the queue
    await processor.processQueue();
    
    // Get updated stats
    const afterStats = await processor.getProcessingStats();
    console.log('📊 After processing:', afterStats);
    
    const processed = afterStats.completed - beforeStats.completed;
    console.log(`✅ Processing complete. ${processed} items processed.`);
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main();