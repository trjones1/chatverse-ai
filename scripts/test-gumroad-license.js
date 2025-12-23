// Test script for Gumroad license verification
// Usage: GUMROAD_ACCESS_TOKEN=your_token npx tsx scripts/test-gumroad-license.js

import { verifyGumroadLicense, validateVerseCoinLicense, redeemVerseCoinLicense } from '../lib/gumroad';

const SAMPLE_PRODUCT_ID = 'lWXwtiutzY74r8CcMvoLYA=='; // Starter Pack
const SAMPLE_LICENSE_KEY = 'SAMPLE-TEST-KEY'; // Replace with actual test key

async function testLicenseVerification() {
  console.log('🧪 Testing Gumroad License Verification');
  console.log('=' .repeat(50));

  // Check environment
  if (!process.env.GUMROAD_ACCESS_TOKEN) {
    console.error('❌ GUMROAD_ACCESS_TOKEN environment variable not set');
    console.log('   Usage: GUMROAD_ACCESS_TOKEN=your_token node scripts/test-gumroad-license.js');
    process.exit(1);
  }

  try {
    console.log('📋 Test Configuration:');
    console.log(`   Product ID: ${SAMPLE_PRODUCT_ID}`);
    console.log(`   License Key: ${SAMPLE_LICENSE_KEY}`);
    console.log('');

    // Test 1: Raw Gumroad API verification (without incrementing)
    console.log('🔍 Test 1: Raw Gumroad API verification');
    try {
      const rawVerification = await verifyGumroadLicense(SAMPLE_PRODUCT_ID, SAMPLE_LICENSE_KEY, false);
      console.log('✅ Raw verification successful:');
      console.log(`   Success: ${rawVerification.success}`);
      console.log(`   Uses: ${rawVerification.uses}`);
      if (rawVerification.success) {
        console.log(`   Product: ${rawVerification.purchase.product_name}`);
        console.log(`   Price: ${rawVerification.purchase.currency} ${rawVerification.purchase.price}`);
        console.log(`   Email: ${rawVerification.purchase.email}`);
        console.log(`   Refunded: ${rawVerification.purchase.refunded}`);
        console.log(`   Disputed: ${rawVerification.purchase.disputed}`);
      }
    } catch (error) {
      console.log('❌ Raw verification failed:');
      console.log(`   Error: ${error.message}`);
    }
    console.log('');

    // Test 2: VerseCoins validation (checks business rules)
    console.log('🔍 Test 2: VerseCoins validation');
    try {
      const validation = await validateVerseCoinLicense(SAMPLE_PRODUCT_ID, SAMPLE_LICENSE_KEY);
      console.log('✅ Validation result:');
      console.log(`   Valid: ${validation.valid}`);
      if (validation.error) {
        console.log(`   Error: ${validation.error}`);
      }
      if (validation.product) {
        console.log(`   Product Name: ${validation.product.name}`);
        console.log(`   Credits: ${validation.product.credits}`);
        console.log(`   Price: $${validation.product.price_usd}`);
      }
    } catch (error) {
      console.log('❌ Validation failed:');
      console.log(`   Error: ${error.message}`);
    }
    console.log('');

    // Test 3: Full redemption (only if validation passed)
    console.log('🔍 Test 3: Full redemption simulation');
    console.log('   (This will increment the license use count if successful!)');

    const shouldProceed = process.argv.includes('--redeem');
    if (!shouldProceed) {
      console.log('   ⏭️  Skipping redemption test (use --redeem flag to actually redeem)');
    } else {
      try {
        const redemption = await redeemVerseCoinLicense(SAMPLE_PRODUCT_ID, SAMPLE_LICENSE_KEY);
        console.log('✅ Redemption result:');
        console.log(`   Valid: ${redemption.valid}`);
        if (redemption.error) {
          console.log(`   Error: ${redemption.error}`);
        }
        if (redemption.valid) {
          console.log(`   Credits Earned: ${redemption.credits}`);
          console.log(`   Product: ${redemption.product?.name}`);
        }
      } catch (error) {
        console.log('❌ Redemption failed:');
        console.log(`   Error: ${error.message}`);
      }
    }
    console.log('');

    console.log('🎯 Testing complete!');
    console.log('');
    console.log('💡 To test with a real license key:');
    console.log('   1. Get a license key from one of your Gumroad products');
    console.log('   2. Replace SAMPLE_LICENSE_KEY in this script');
    console.log('   3. Run again with: GUMROAD_ACCESS_TOKEN=your_token node scripts/test-gumroad-license.js');
    console.log('   4. Use --redeem flag to actually consume the license');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Run the test
testLicenseVerification().catch(console.error);