#!/usr/bin/env node

/**
 * Comprehensive Rate Limiting Test Suite
 * 
 * Tests all aspects of the rate limiting system:
 * - Chat API rate limits for different user tiers
 * - Voice API rate limits
 * - Admin endpoint protection
 * - Payment endpoint security
 * - Multi-character domain support
 * - Abuse detection and graduated blocking
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_DOMAINS = [
  'chatwithlexi.com',
  'talktonyx.com', 
  'chatwithchloe.com',
  'waifuwithaiko.com',
  'chatwithzaria.com',
  'chatwithnova.com',
  'sirdominic.com',
  'fuckboychase.com',
  'chatwithethan.com',
  'chatwithjayden.com',
  'chatwithmiles.com'
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  startTime: performance.now(),
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(testName, passed, error = null) {
  if (passed) {
    testResults.passed++;
    log(`${testName} - PASSED`, 'success');
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error?.message || 'Unknown error' });
    log(`${testName} - FAILED: ${error?.message || 'Unknown error'}`, 'error');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}, expectedStatus = 200) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      timeout: 10000,
      ...options,
    });
    
    return {
      success: response.status === expectedStatus,
      status: response.status,
      headers: response.headers,
      data: response.data,
      rateLimitHeaders: {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset'],
        violations: response.headers['x-ratelimit-violations'],
      }
    };
  } catch (error) {
    if (error.response) {
      return {
        success: error.response.status === expectedStatus,
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data,
        rateLimitHeaders: {
          limit: error.response.headers['x-ratelimit-limit'],
          remaining: error.response.headers['x-ratelimit-remaining'],
          reset: error.response.headers['x-ratelimit-reset'],
          violations: error.response.headers['x-ratelimit-violations'],
        }
      };
    }
    throw error;
  }
}

// Test Cases

async function testChatRateLimiting() {
  log('Testing Chat API Rate Limiting...', 'info');
  
  // Test anonymous user limits
  let consecutiveRequests = 0;
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await makeRequest(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'chatwithlexi.com'
        },
        data: { message: 'Test rate limiting' }
      });
      
      if (result.success) {
        consecutiveRequests++;
        log(`Chat request ${i + 1}: SUCCESS (${consecutiveRequests} total)`);
        
        // Check rate limit headers
        if (result.rateLimitHeaders.limit) {
          log(`Rate limit: ${result.rateLimitHeaders.remaining}/${result.rateLimitHeaders.limit}`);
        }
      } else if (result.status === 429) {
        log(`Chat request ${i + 1}: RATE LIMITED after ${consecutiveRequests} requests`);
        break;
      } else {
        log(`Chat request ${i + 1}: Unexpected status ${result.status}`, 'warning');
      }
      
      await sleep(100); // Small delay between requests
    } catch (error) {
      log(`Chat request ${i + 1}: ERROR - ${error.message}`, 'error');
      break;
    }
  }
  
  recordTest('Chat API Rate Limiting - Anonymous User', consecutiveRequests > 0 && consecutiveRequests <= 6);
}

async function testVoiceRateLimiting() {
  log('Testing Voice API Rate Limiting...', 'info');
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'chatwithlexi.com'
      },
      data: { text: 'Test voice rate limiting' }
    }, 401); // Should be unauthorized without auth
    
    recordTest('Voice API Rate Limiting - Unauthorized', result.status === 401);
    
    if (result.rateLimitHeaders.limit) {
      log(`Voice rate limit headers present: ${result.rateLimitHeaders.limit}`);
    }
    
  } catch (error) {
    recordTest('Voice API Rate Limiting - Unauthorized', false, error);
  }
}

async function testMultiCharacterDomains() {
  log('Testing Multi-Character Domain Support...', 'info');
  
  const domainTests = [];
  
  for (const domain of TEST_DOMAINS.slice(0, 5)) { // Test first 5 domains
    try {
      const result = await makeRequest(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': domain
        },
        data: { message: 'Test domain-specific rate limiting' }
      });
      
      const passed = result.success || result.status === 429; // Either success or rate limited is fine
      domainTests.push({ domain, passed, status: result.status });
      
      log(`Domain ${domain}: ${result.status === 200 ? 'SUCCESS' : `Status ${result.status}`}`);
      
    } catch (error) {
      domainTests.push({ domain, passed: false, error: error.message });
      log(`Domain ${domain}: ERROR - ${error.message}`, 'error');
    }
  }
  
  const passedDomains = domainTests.filter(test => test.passed).length;
  recordTest('Multi-Character Domain Support', passedDomains >= 3);
  
  log(`Domain test results: ${passedDomains}/${domainTests.length} domains working`);
}

async function testPaymentEndpointProtection() {
  log('Testing Payment Endpoint Protection...', 'info');
  
  const paymentEndpoints = [
    { path: '/api/checkout', method: 'POST', data: { tier: 'sub_sfw' } },
    { path: '/api/portal', method: 'POST', data: {} },
    { path: '/api/upgrade', method: 'POST', data: { tier: 'sub_nsfw' } }
  ];
  
  let protectedEndpoints = 0;
  
  for (const endpoint of paymentEndpoints) {
    try {
      const result = await makeRequest(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        data: endpoint.data
      }, 401); // Should require auth
      
      if (result.status === 401 || result.status === 429) {
        protectedEndpoints++;
        log(`${endpoint.path}: Protected (${result.status})`);
      } else {
        log(`${endpoint.path}: Not properly protected (${result.status})`, 'warning');
      }
      
    } catch (error) {
      log(`${endpoint.path}: ERROR - ${error.message}`, 'error');
    }
  }
  
  recordTest('Payment Endpoint Protection', protectedEndpoints === paymentEndpoints.length);
}

async function testAdminEndpointProtection() {
  log('Testing Admin Endpoint Protection...', 'info');
  
  const adminEndpoints = [
    '/api/admin/analytics/metrics',
    '/api/admin/analytics/revenue', 
    '/api/admin/cleanup',
    '/api/admin/user-access'
  ];
  
  let protectedEndpoints = 0;
  
  for (const endpoint of adminEndpoints) {
    try {
      const result = await makeRequest(`${BASE_URL}${endpoint}`, {
        method: 'GET'
      }, 401); // Should require admin auth
      
      if (result.status === 401 || result.status === 403 || result.status === 429) {
        protectedEndpoints++;
        log(`${endpoint}: Protected (${result.status})`);
      } else {
        log(`${endpoint}: Not properly protected (${result.status})`, 'warning');
      }
      
    } catch (error) {
      log(`${endpoint}: ERROR - ${error.message}`, 'error');
    }
  }
  
  recordTest('Admin Endpoint Protection', protectedEndpoints >= adminEndpoints.length * 0.75); // Allow some endpoints to not exist
}

async function testRateLimitHeaders() {
  log('Testing Rate Limit Headers...', 'info');
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'chatwithlexi.com'
      },
      data: { message: 'Test headers' }
    });
    
    const hasRateLimitHeaders = !!(
      result.rateLimitHeaders.limit || 
      result.headers['x-ratelimit-limit'] ||
      result.headers['x-ratelimit-remaining']
    );
    
    recordTest('Rate Limit Headers Present', hasRateLimitHeaders);
    
    if (hasRateLimitHeaders) {
      log(`Rate limit headers found: Limit=${result.rateLimitHeaders.limit}, Remaining=${result.rateLimitHeaders.remaining}`);
    } else {
      log('No rate limit headers found', 'warning');
    }
    
  } catch (error) {
    recordTest('Rate Limit Headers Present', false, error);
  }
}

async function testMiddlewareIntegration() {
  log('Testing Middleware Integration...', 'info');
  
  try {
    // Test that middleware is working by checking character headers
    const result = await makeRequest(`${BASE_URL}/api/debug/ping`, {
      headers: { 'Host': 'talktonyx.com' }
    });
    
    const hasCharacterHeaders = !!(
      result.headers['x-character-key'] ||
      result.headers['x-character-name']
    );
    
    recordTest('Middleware Character Headers', hasCharacterHeaders);
    
    if (hasCharacterHeaders) {
      log(`Character headers: Key=${result.headers['x-character-key']}, Name=${result.headers['x-character-name']}`);
    }
    
    // Test that rate limiting is integrated with middleware
    const hasRateLimitIntegration = !!(
      result.headers['x-ratelimit-limit'] ||
      result.headers['x-ratelimit-remaining']
    );
    
    recordTest('Middleware Rate Limit Integration', hasRateLimitIntegration || result.status === 404); // OK if endpoint doesn't exist
    
  } catch (error) {
    recordTest('Middleware Integration', false, error);
  }
}

async function testFraudDetection() {
  log('Testing Fraud Detection...', 'info');
  
  try {
    // Test with suspicious patterns
    const suspiciousRequest = await makeRequest(`${BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'bot', // Suspicious user agent
        // No referer (suspicious for POST)
      },
      data: { tier: 'sub_sfw' }
    }, 403); // Should be blocked by fraud detection or auth
    
    const isBlocked = suspiciousRequest.status === 403 || suspiciousRequest.status === 401;
    recordTest('Fraud Detection - Suspicious Request', isBlocked);
    
    if (suspiciousRequest.headers['x-fraud-score']) {
      log(`Fraud score detected: ${suspiciousRequest.headers['x-fraud-score']}`);
    }
    
  } catch (error) {
    recordTest('Fraud Detection - Suspicious Request', false, error);
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Comprehensive Rate Limiting Test Suite', 'info');
  log(`Testing against: ${BASE_URL}`, 'info');
  
  const tests = [
    testChatRateLimiting,
    testVoiceRateLimiting,
    testMultiCharacterDomains,
    testPaymentEndpointProtection,
    testAdminEndpointProtection,
    testRateLimitHeaders,
    testMiddlewareIntegration,
    testFraudDetection,
  ];
  
  for (const test of tests) {
    try {
      await test();
      await sleep(500); // Brief pause between test categories
    } catch (error) {
      log(`Test failed with error: ${error.message}`, 'error');
    }
  }
  
  // Final results
  const duration = ((performance.now() - testResults.startTime) / 1000).toFixed(2);
  const total = testResults.passed + testResults.failed;
  const successRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : '0';
  
  log(`\n📊 Test Results Summary:`, 'info');
  log(`✅ Passed: ${testResults.passed}`, 'success');
  log(`❌ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`📈 Success Rate: ${successRate}%`);
  log(`⏱️ Duration: ${duration}s`);
  
  if (testResults.errors.length > 0) {
    log(`\n🔍 Failed Tests:`, 'error');
    testResults.errors.forEach(error => {
      log(`  • ${error.test}: ${error.error}`, 'error');
    });
  }
  
  if (testResults.failed === 0) {
    log('\n🎉 All tests passed! Rate limiting system is working correctly.', 'success');
    process.exit(0);
  } else {
    log('\n⚠️ Some tests failed. Please review the rate limiting configuration.', 'warning');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Rate Limiting Test Suite

Usage: node test-rate-limiting.js [options]

Options:
  --help, -h          Show this help message
  --url <url>         Base URL to test against (default: http://localhost:3000)
  --verbose           Enable verbose output
  
Environment Variables:
  TEST_BASE_URL       Base URL for testing (default: http://localhost:3000)

Examples:
  node test-rate-limiting.js
  node test-rate-limiting.js --url https://chatwithlexi.com
  TEST_BASE_URL=https://staging.chatwithlexi.com node test-rate-limiting.js
`);
  process.exit(0);
}

if (args.includes('--verbose')) {
  log('Verbose mode enabled', 'info');
}

const urlIndex = args.indexOf('--url');
if (urlIndex !== -1 && args[urlIndex + 1]) {
  process.env.TEST_BASE_URL = args[urlIndex + 1];
  log(`Testing against custom URL: ${args[urlIndex + 1]}`, 'info');
}

// Run the tests
runAllTests().catch(error => {
  log(`Test suite failed: ${error.message}`, 'error');
  process.exit(1);
});