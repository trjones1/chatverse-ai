// lib/payment-utils.ts

import { getPaymentProcessor, generateCheckoutUrl, type PaymentProcessor } from './payment-routing';
import { getCharacterConfig } from './characters.config';

export type ProductType = 'voice_10' | 'voice_25' | 'voice_50' | 'voice_100' | 'sfw_premium' | 'nsfw_premium';

export interface CheckoutOptions {
  productType: ProductType;
  characterKey?: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  hostname?: string;
}

/**
 * Smart checkout URL generation with dual processor routing
 * This is the main function components should use for payments
 */
export function createSmartCheckoutUrl(options: CheckoutOptions): {
  url: string;
  processor: PaymentProcessor;
  isNsfw: boolean;
} {
  const { productType, characterKey, userId, successUrl, cancelUrl, hostname } = options;
  
  // Get character config if hostname provided
  const characterConfig = hostname ? getCharacterConfig(hostname) : null;
  const finalCharacterKey = characterKey || characterConfig?.key || 'lexi';
  
  // Determine routing based on product and character
  const routing = getPaymentProcessor(productType, finalCharacterKey);
  
  // Generate appropriate checkout URL
  const url = generateCheckoutUrl(routing, userId, successUrl, cancelUrl);
  
  return {
    url,
    processor: routing.processor,
    isNsfw: routing.isNsfw,
  };
}

/**
 * Legacy compatibility function for existing components
 * Maps old product naming to new routing system
 */
export function getLegacyProductPrice(
  characterKey: string,
  productType: 'sub_sfw' | 'sub_nsfw' | 'voice_pack_10' | 'voice_pack_25' | 'voice_pack_50' | 'voice_pack_100'
): string {
  // Map legacy names to new routing system
  const routingMap: Record<string, ProductType> = {
    'sub_sfw': 'sfw_premium',
    'sub_nsfw': 'nsfw_premium',
    'voice_pack_10': 'voice_10',
    'voice_pack_25': 'voice_25',
    'voice_pack_50': 'voice_50',
    'voice_pack_100': 'voice_100',
  };
  
  const newProductType = routingMap[productType];
  if (!newProductType) {
    console.warn(`Unknown legacy product type: ${productType}`);
    return '';
  }
  
  try {
    const routing = getPaymentProcessor(newProductType, characterKey);
    return routing.priceId;
  } catch (error) {
    console.error(`Error getting price for ${productType}:`, error);
    return '';
  }
}

/**
 * Check if a product requires adult content processor
 */
export function isNsfwProduct(productType: ProductType, characterKey?: string): boolean {
  try {
    const routing = getPaymentProcessor(productType, characterKey);
    return routing.isNsfw;
  } catch {
    return false;
  }
}

/**
 * Get processor status for debugging/admin
 */
export function getProcessorStatus(): {
  stripe: boolean;
  segpay: boolean;
  override?: PaymentProcessor;
} {
  return {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    segpay: !!(process.env.SEGPAY_MERCHANT_ID && process.env.SEGPAY_NSFW_PRODUCT_ID),
    override: (process.env.PAYMENT_PROCESSOR_OVERRIDE as PaymentProcessor) || undefined,
  };
}

/**
 * Component helper: Generate checkout for voice packs
 */
export function createVoicePackCheckout(
  credits: 10 | 25 | 50 | 100,
  userId: string,
  hostname?: string
) {
  const productType = `voice_${credits}` as ProductType;
  const characterConfig = hostname ? getCharacterConfig(hostname) : null;
  
  return createSmartCheckoutUrl({
    productType,
    userId,
    characterKey: characterConfig?.key,
    successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=voice_pack_${credits}`,
    cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?cancelled=voice_pack_${credits}`,
    hostname,
  });
}

/**
 * Component helper: Generate checkout for subscriptions
 */
export function createSubscriptionCheckout(
  tier: 'sfw' | 'nsfw',
  userId: string,
  hostname?: string
) {
  const productType = tier === 'sfw' ? 'sfw_premium' : 'nsfw_premium';
  const characterConfig = hostname ? getCharacterConfig(hostname) : null;
  
  return createSmartCheckoutUrl({
    productType,
    userId,
    characterKey: characterConfig?.key,
    successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=${tier}_subscription`,
    cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?cancelled=${tier}_subscription`,
    hostname,
  });
}

/**
 * Environment variable mapping for migration script
 * Helps map new consolidated variables to the routing system
 */
export function getEnvironmentMapping(): Record<string, string> {
  return {
    // Voice packs (Stripe)
    'STRIPE_PRICE_VOICE_10': 'voice_10.stripePrice',
    'STRIPE_PRICE_VOICE_25': 'voice_25.stripePrice', 
    'STRIPE_PRICE_VOICE_50': 'voice_50.stripePrice',
    'STRIPE_PRICE_VOICE_100': 'voice_100.stripePrice',
    
    // SFW subscriptions (Stripe)
    'STRIPE_PRICE_SFW': 'sfw_premium.stripePrice',
    
    // NSFW subscriptions (Segpay preferred, Stripe fallback)
    'STRIPE_PRICE_NSFW': 'nsfw_premium.stripePrice',
    'NYX_STRIPE_PRICE_NSFW_PREMIUM': 'nsfw_premium_nyx.stripePrice',
    'DOM_STRIPE_PRICE_NSFW_PREMIUM': 'nsfw_premium_dom.stripePrice',
    
    // Segpay product IDs (when approved)
    'SEGPAY_NSFW_PRODUCT_ID': 'nsfw_premium.segpayProductId',
    'SEGPAY_NYX_NSFW_PRODUCT_ID': 'nsfw_premium_nyx.segpayProductId', 
    'SEGPAY_DOM_NSFW_PRODUCT_ID': 'nsfw_premium_dom.segpayProductId',
  };
}

/**
 * Debug helper: Test routing for all products
 */
export function debugRouting(characterKey = 'lexi') {
  const products: ProductType[] = ['voice_10', 'voice_25', 'voice_50', 'voice_100', 'sfw_premium', 'nsfw_premium'];
  
  console.log(`\n=== Payment Routing Debug for ${characterKey} ===`);
  console.log('Processor Status:', getProcessorStatus());
  console.log('\nProduct Routing:');
  
  products.forEach(product => {
    try {
      const routing = getPaymentProcessor(product, characterKey);
      console.log(`${product.padEnd(15)} → ${routing.processor.padEnd(8)} | ${routing.priceId || 'NO_PRICE'} | NSFW: ${routing.isNsfw}`);
    } catch (error) {
      console.log(`${product.padEnd(15)} → ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  console.log('='.repeat(60));
}