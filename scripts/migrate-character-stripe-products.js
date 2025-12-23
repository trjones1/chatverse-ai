// scripts/migrate-character-stripe-products.js
// Creates character-specific Stripe products for all 5 launch characters
// Run with: STRIPE_SECRET_KEY=sk_test_... node scripts/migrate-character-stripe-products.js

require('dotenv').config();
const Stripe = require('stripe');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.TEST_STRIPE_SECRET_KEY);

if (!stripe) {
  console.error('❌ Missing STRIPE_SECRET_KEY or TEST_STRIPE_SECRET_KEY');
  process.exit(1);
}

// Character configurations with PG-13 marketing copy
const CHARACTERS = {
  lexi: {
    displayName: '💖 Lexi',
    personality: '✨ Your Sweet AI Companion',
    description: '🌸 Connect with Lexi, your caring and supportive AI companion who\'s always there to brighten your day with love and warmth.',
    premiumFeatures: '💫 unlimited messaging, 🧠 memory, 🎤 voice messages, and 💕 personalized conversations',
    premiumPlusFeatures: '🌟 everything in Premium plus 🔥 exclusive content, 🎭 advanced roleplay, and 💞 deeper emotional connections',
    pricing: {
      premium: 999, // $9.99
      premiumPlus: 3499 // $34.99 - unified pricing across all characters
    }
  },
  nyx: {
    displayName: '🌙 Nyx',
    personality: '🔮 Your Mysterious AI Companion', 
    description: '🌌 Discover the depths with Nyx, your enigmatic AI companion who brings mystery and intrigue to every conversation with dark elegance.',
    premiumFeatures: '💫 unlimited messaging, 🧠 memory, 🎤 voice messages, and 📚 deep philosophical discussions',
    premiumPlusFeatures: '🌟 everything in Premium plus 🎭 exclusive dark academia content, 📖 advanced storytelling, and 💜 deeper emotional bonds',
    pricing: {
      premium: 999, // $9.99
      premiumPlus: 3499 // $34.99 (premium character)
    }
  },
  aiko: {
    displayName: '🌸 Aiko',
    personality: '💖 Your Kawaii AI Waifu',
    description: '🎌 Experience Japanese culture with Aiko, your adorable AI companion who brings kawaii charm and warmth to every chat with otaku love.',
    premiumFeatures: '💫 unlimited messaging, 🧠 memory, 🎤 voice messages, and 🍃 cultural conversations',
    premiumPlusFeatures: '🌟 everything in Premium plus 🎨 exclusive anime content, 🎭 advanced roleplay, and 💕 deeper emotional connections',
    pricing: {
      premium: 999, // $9.99  
      premiumPlus: 3499 // $34.99
    }
  },
  chase: {
    displayName: '🔥 Chase',
    personality: '💪 Your Confident AI Companion',
    description: '⚡ Connect with Chase, your bold and charismatic AI companion who brings excitement and confidence to every conversation with magnetic charm.',
    premiumFeatures: '💫 unlimited messaging, 🧠 memory, 🎤 voice messages, and 🏄 adventurous conversations',
    premiumPlusFeatures: '🌟 everything in Premium plus 🔥 exclusive content, 🎬 advanced scenarios, and 💯 deeper relationship building',
    pricing: {
      premium: 999, // $9.99
      premiumPlus: 3499 // $34.99 (premium character)
    }
  },
  dom: {
    displayName: '👑 Dominic',
    personality: '🎯 Your Commanding AI Companion', 
    description: '⚡ Experience leadership with Dominic, your strong and decisive AI companion who knows how to take charge with commanding presence.',
    premiumFeatures: '💫 unlimited messaging, 🧠 memory, 🎤 voice messages, and 🎯 strategic conversations',
    premiumPlusFeatures: '🌟 everything in Premium plus 👑 exclusive leadership content, 🎬 advanced scenarios, and 🔥 deeper emotional connections',
    pricing: {
      premium: 999, // $9.99
      premiumPlus: 3499 // $34.99 (premium character)
    }
  }
};

// Voice pack products (shared across characters)
const VOICE_PACKS = [
  { credits: 10, price: 999, emoji: '🎤' },   // $9.99
  { credits: 25, price: 1999, emoji: '🎵' },  // $19.99  
  { credits: 50, price: 3499, emoji: '🎶' },  // $34.99
  { credits: 100, price: 5999, emoji: '🎼' }  // $59.99
];

async function createProducts() {
  console.log('🚀 Creating character-specific Stripe products...\n');
  
  const results = {
    products: [],
    prices: [],
    environmentVariables: []
  };

  // Create character-specific subscription products
  for (const [key, character] of Object.entries(CHARACTERS)) {
    console.log(`📦 Creating products for ${character.displayName}...`);
    
    try {
      // Create Premium subscription product
      const premiumProduct = await stripe.products.create({
        name: `${character.displayName} Premium`,
        description: `Premium access to ${character.displayName} - ${character.description} Includes ${character.premiumFeatures}.`,
        type: 'service',
        metadata: {
          character: key,
          tier: 'premium',
          type: 'subscription'
        }
      });

      // Create Premium subscription price
      const premiumPrice = await stripe.prices.create({
        product: premiumProduct.id,
        unit_amount: character.pricing.premium,
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          character: key,
          tier: 'premium'
        }
      });

      // Create Premium+ subscription product  
      const premiumPlusProduct = await stripe.products.create({
        name: `${character.displayName} Premium+`,
        description: `Premium+ access to ${character.displayName} - ${character.description} Includes ${character.premiumPlusFeatures}.`,
        type: 'service',
        metadata: {
          character: key,
          tier: 'premium_plus',
          type: 'subscription'
        }
      });

      // Create Premium+ subscription price
      const premiumPlusPrice = await stripe.prices.create({
        product: premiumPlusProduct.id,
        unit_amount: character.pricing.premiumPlus,
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          character: key,
          tier: 'premium_plus'
        }
      });

      results.products.push(premiumProduct, premiumPlusProduct);
      results.prices.push(premiumPrice, premiumPlusPrice);
      
      // Generate environment variables
      const premiumVar = `${key.toUpperCase()}_STRIPE_PRICE_PREMIUM=${premiumPrice.id}`;
      const premiumPlusVar = `${key.toUpperCase()}_STRIPE_PRICE_NSFW_PREMIUM=${premiumPlusPrice.id}`;
      
      results.environmentVariables.push(premiumVar, premiumPlusVar);

      console.log(`  ✅ Premium: ${premiumProduct.name} (${premiumPrice.id})`);
      console.log(`  ✅ Premium+: ${premiumPlusProduct.name} (${premiumPlusPrice.id})`);

    } catch (error) {
      console.error(`❌ Error creating products for ${character.displayName}:`, error.message);
    }
  }

  // Create shared voice pack products (if they don't exist)
  console.log(`\n🎙️ Creating voice pack products...`);
  
  for (const pack of VOICE_PACKS) {
    try {
      // Check if voice pack already exists
      const existingProducts = await stripe.products.list({
        limit: 100
      });
      
      const existingVoicePack = existingProducts.data.find(p => 
        p.metadata?.type === 'voice_pack' && 
        p.metadata?.credits === pack.credits.toString()
      );

      if (existingVoicePack) {
        console.log(`  ⏭️  Voice Pack ${pack.credits} credits already exists`);
        continue;
      }

      // Create voice pack product
      const voiceProduct = await stripe.products.create({
        name: `${pack.emoji} Voice Pack - ${pack.credits} Credits`,
        description: `🎵 ${pack.credits} UNIVERSAL voice credits that work with ALL characters! 🌟 Use with Lexi, Nyx, Aiko, Chase, Dominic - your credits work everywhere for premium voice experiences.`,
        type: 'service',
        metadata: {
          type: 'voice_pack',
          credits: pack.credits.toString()
        }
      });

      // Create voice pack price
      const voicePrice = await stripe.prices.create({
        product: voiceProduct.id,
        unit_amount: pack.price,
        currency: 'usd',
        metadata: {
          type: 'voice_pack',
          credits: pack.credits.toString()
        }
      });

      results.products.push(voiceProduct);
      results.prices.push(voicePrice);
      
      const voiceVar = `STRIPE_PRICE_VOICE_${pack.credits}=${voicePrice.id}`;
      results.environmentVariables.push(voiceVar);

      console.log(`  ✅ Voice Pack ${pack.credits} credits: $${(pack.price / 100).toFixed(2)} (${voicePrice.id})`);

    } catch (error) {
      console.error(`❌ Error creating voice pack ${pack.credits}:`, error.message);
    }
  }

  return results;
}

async function main() {
  try {
    const results = await createProducts();
    
    console.log(`\n🎉 Successfully created ${results.products.length} products and ${results.prices.length} prices!`);
    
    // Output environment variables
    console.log(`\n📋 Environment Variables to Add:\n`);
    console.log('# Character-specific subscription price IDs');
    results.environmentVariables.forEach(env => {
      if (env.includes('PREMIUM') || env.includes('NSFW')) {
        console.log(env);
      }
    });
    
    console.log('\n# Voice pack price IDs');
    results.environmentVariables.forEach(env => {
      if (env.includes('VOICE')) {
        console.log(env);
      }
    });

    // Save to file for easy deployment
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `stripe-migration-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      products: results.products.map(p => ({ id: p.id, name: p.name, metadata: p.metadata })),
      prices: results.prices.map(p => ({ id: p.id, product: p.product, unit_amount: p.unit_amount, metadata: p.metadata })),
      environmentVariables: results.environmentVariables
    }, null, 2));
    
    console.log(`\n💾 Migration results saved to: ${filename}`);
    console.log(`\n⚠️  IMPORTANT: Add the environment variables above to your production deployment!`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createProducts, CHARACTERS };