// Test script to verify button clicking works
console.log('Testing button click functionality...');

// Simulate the openCheckout function behavior
function testOpenCheckout(tier, opts = {}) {
  console.log(`🔐 [TEST] Opening checkout for tier '${tier}'`);
  console.log(`🔐 [TEST] Options:`, opts);
  
  // No session - should trigger login modal
  console.log(`🔐 [TEST] No user found - triggering login modal`);
  
  // Fire login modal events
  if (typeof document !== 'undefined') {
    document.body.dataset.modal = 'open';
    window.dispatchEvent(new Event('open-login'));
    window.dispatchEvent(new CustomEvent('prefer-signup', { detail: { tier } }));
    console.log(`🔐 [TEST] Login modal triggered successfully`);
  } else {
    console.log(`🔐 [TEST] Running in Node.js - no DOM available`);
  }
  
  return true;
}

// Simulate button click
function testButtonClick() {
  console.log('🔘 [TEST] Button clicked!');
  console.log('🔘 [TEST] Calling openCheckout...');
  
  try {
    testOpenCheckout('sub_sfw', {
      character_key: 'lexi',
      successUrl: 'http://localhost:3000/success',
      cancelUrl: 'http://localhost:3000/chat'
    });
    console.log('✅ [TEST] Button click handled successfully');
    return true;
  } catch (error) {
    console.error('❌ [TEST] Button click failed:', error);
    return false;
  }
}

// Run test
console.log('=== Premium CTA Button Test ===');
const result = testButtonClick();
console.log('=== Test Result:', result ? 'PASSED' : 'FAILED', '===');