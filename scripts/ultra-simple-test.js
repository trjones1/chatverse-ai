#!/usr/bin/env node

console.log('✅ Ultra simple test started');
console.log('📍 Node.js version:', process.version);
console.log('📍 Domain arg:', process.argv[2]);

setTimeout(() => {
  console.log('✅ Ultra simple test completed successfully');
  process.exit(0);
}, 1000);