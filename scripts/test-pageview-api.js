// Test the /api/track/pageview endpoint directly
// Run with: node scripts/test-pageview-api.js

async function testPageViewAPI() {
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
  const testVisitorId = `anon-${Date.now()}-test`;

  console.log('🧪 Testing page view API...\n');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Test Visitor ID: ${testVisitorId}\n`);

  // Test POST (initial page view)
  console.log('1️⃣ Testing POST /api/track/pageview (initial page view)...');
  try {
    const response = await fetch(`${baseUrl}/api/track/pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'chatwithlexi.com',
      },
      body: JSON.stringify({
        visitorId: testVisitorId,
        engaged: false,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ POST successful\n');
    } else {
      console.error('❌ POST failed\n');
      return;
    }
  } catch (error) {
    console.error('❌ POST request failed:', error.message);
    return;
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test PATCH (mark as engaged)
  console.log('2️⃣ Testing PATCH /api/track/pageview (mark engaged)...');
  try {
    const response = await fetch(`${baseUrl}/api/track/pageview`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'chatwithlexi.com',
      },
      body: JSON.stringify({
        visitorId: testVisitorId,
        engaged: true,
        timeOnPage: 30,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ PATCH successful\n');
    } else {
      console.error('❌ PATCH failed\n');
    }
  } catch (error) {
    console.error('❌ PATCH request failed:', error.message);
  }

  console.log('\n📊 Now run: node scripts/check-page-views.js');
  console.log('   You should see 1 page view with engaged=true\n');
}

testPageViewAPI().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
