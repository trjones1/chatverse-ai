// Generate VerseCoins redemption codes for Gumroad products
const { getSupabaseAdmin } = require('../lib/supabaseAdmin');
const { generateCodeBatch, VERSE_COIN_PRODUCTS } = require('../lib/verseCoins');

const supabase = getSupabaseAdmin();

async function generateCodes() {
  try {
    console.log('🪙 Generating VerseCoins redemption codes...\n');

    // First, ensure products exist in database
    console.log('📦 Inserting products into database...');
    for (const product of VERSE_COIN_PRODUCTS) {
      const { error } = await supabase
        .from('versecoins_products')
        .upsert({
          id: product.id,
          name: product.name,
          credits: product.credits,
          price_usd: product.price_usd,
          gumroad_product_id: product.gumroad_product_id || null,
          active: true,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error(`❌ Error inserting product ${product.id}:`, error);
      } else {
        console.log(`✅ Product ${product.id} (${product.name}) - ${product.credits} credits`);
      }
    }

    console.log('\n🔑 Generating redemption codes...\n');

    // Generate codes for each product
    const codesPerProduct = 100; // Generate 100 codes per product initially

    for (const product of VERSE_COIN_PRODUCTS) {
      console.log(`Generating ${codesPerProduct} codes for ${product.name}...`);

      try {
        const codes = generateCodeBatch(product.id, codesPerProduct);

        // Insert codes into database
        const { data, error } = await supabase
          .from('versecoins_codes')
          .insert(codes.map(code => ({
            ...code,
            created_at: new Date().toISOString()
          })));

        if (error) {
          console.error(`❌ Error inserting codes for ${product.id}:`, error);
        } else {
          console.log(`✅ Generated ${codesPerProduct} codes for ${product.name}`);

          // Show a sample code
          const sampleCode = codes[0];
          console.log(`   Sample code: ${sampleCode.code} (${sampleCode.credits} credits)`);
        }
      } catch (err) {
        console.error(`❌ Error generating codes for ${product.id}:`, err);
      }

      console.log('');
    }

    // Show summary
    console.log('📊 Summary:');
    for (const product of VERSE_COIN_PRODUCTS) {
      const { data: codes, error } = await supabase
        .from('versecoins_codes')
        .select('status')
        .eq('product_id', product.id);

      if (!error && codes) {
        const available = codes.filter(c => c.status === 'available').length;
        console.log(`   ${product.name}: ${available} codes available`);
      }
    }

    console.log('\n✅ Code generation completed!');
    console.log('\nNext steps:');
    console.log('1. Copy any sample code above to test in Gumroad');
    console.log('2. Set up Gumroad webhook to mark codes as "sold"');
    console.log('3. Build redemption API endpoint for your site');

  } catch (error) {
    console.error('❌ Error generating codes:', error);
    process.exit(1);
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🪙 VerseCoins Code Generator

Usage:
  node scripts/generate-versecoins-codes.js

This will:
- Insert/update product catalog in database
- Generate 100 redemption codes per product
- Show sample codes for testing

Environment variables required:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
    `);
    process.exit(0);
  }

  generateCodes();
}

module.exports = { generateCodes };