#!/usr/bin/env node

/**
 * Clear rate limit keys from Redis
 * Run this to reset rate limits for a specific user
 */

const Redis = require('ioredis');

async function clearRateLimits() {
  const redis = new Redis(process.env.REDIS_URL);

  try {
    console.log('🔍 Searching for rate limit keys...');

    // Get all rate limit keys
    const keys = await redis.keys('rl:*');

    console.log(`Found ${keys.length} rate limit keys`);

    if (keys.length > 0) {
      console.log('🗑️  Deleting rate limit keys...');
      await redis.del(...keys);
      console.log(`✅ Deleted ${keys.length} rate limit keys`);
    } else {
      console.log('ℹ️  No rate limit keys found');
    }

    await redis.quit();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearRateLimits();
