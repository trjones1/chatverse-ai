// lib/payment-routing.ts

export type PaymentProcessor = 'stripe' | 'segpay';

export interface ProductRouting {
  processor: PaymentProcessor;
  productId: string;
  priceId: string;
  isNsfw: boolean;
}

/**
 * Payment processor routing configuration
 * Routes products based on content type and business safety
 */
export const PAYMENT_ROUTING = {
  // Voice packs - Safe for Stripe (no adult content)
  voice_10: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.STRIPE_PRICE_VOICE_10,
    segpayProductId: process.env.SEGPAY_VOICE_10_PRODUCT_ID,
  },
  voice_25: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.STRIPE_PRICE_VOICE_25,
    segpayProductId: process.env.SEGPAY_VOICE_25_PRODUCT_ID,
  },
  voice_50: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.STRIPE_PRICE_VOICE_50,
    segpayProductId: process.env.SEGPAY_VOICE_50_PRODUCT_ID,
  },
  voice_100: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.STRIPE_PRICE_VOICE_100,
    segpayProductId: process.env.SEGPAY_VOICE_100_PRODUCT_ID,
  },

  // SFW/Premium subscriptions - Safe for Stripe
  sfw_premium: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.STRIPE_PRICE_SFW,
    segpayProductId: process.env.SEGPAY_SFW_PRODUCT_ID,
  },
  sfw_premium_nyx: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.NYX_STRIPE_PRICE_PREMIUM,
    segpayProductId: process.env.SEGPAY_NYX_SFW_PRODUCT_ID,
  },
  sfw_premium_dom: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.DOM_STRIPE_PRICE_PREMIUM,
    segpayProductId: process.env.SEGPAY_DOM_SFW_PRODUCT_ID,
  },
  sfw_premium_chase: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.CHASE_STRIPE_PRICE_PREMIUM,
    segpayProductId: process.env.SEGPAY_CHASE_SFW_PRODUCT_ID,
  },
  sfw_premium_aiko: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.AIKO_STRIPE_PRICE_PREMIUM,
    segpayProductId: process.env.SEGPAY_AIKO_SFW_PRODUCT_ID,
  },
  sfw_premium_lexi: {
    processor: 'stripe' as PaymentProcessor,
    isNsfw: false,
    stripePrice: process.env.LEXI_STRIPE_PRICE_PREMIUM,
    segpayProductId: process.env.SEGPAY_LEXI_SFW_PRODUCT_ID,
  },

  // NSFW/Premium+ subscriptions - Route to Segpay for safety
  nsfw_premium: {
    processor: 'segpay' as PaymentProcessor,
    isNsfw: true,
    stripePrice: process.env.STRIPE_PRICE_NSFW, // Fallback only
    segpayProductId: process.env.SEGPAY_NSFW_PRODUCT_ID,
  },
  nsfw_premium_nyx: {
    processor: 'segpay' as PaymentProcessor,
    isNsfw: true,
    stripePrice: process.env.NYX_STRIPE_PRICE_NSFW_PREMIUM, // Fallback only
    segpayProductId: process.env.SEGPAY_NYX_NSFW_PRODUCT_ID,
  },
  nsfw_premium_dom: {
    processor: 'segpay' as PaymentProcessor,
    isNsfw: true,
    stripePrice: process.env.DOM_STRIPE_PRICE_NSFW_PREMIUM, // Fallback only
    segpayProductId: process.env.SEGPAY_DOM_NSFW_PRODUCT_ID,
  },
  nsfw_premium_chase: {
    processor: 'segpay' as PaymentProcessor,
    isNsfw: true,
    stripePrice: process.env.CHASE_STRIPE_PRICE_NSFW_PREMIUM, // Fallback only
    segpayProductId: process.env.SEGPAY_CHASE_NSFW_PRODUCT_ID,
  },
  nsfw_premium_aiko: {
    processor: 'segpay' as PaymentProcessor,
    isNsfw: true,
    stripePrice: process.env.AIKO_STRIPE_PRICE_NSFW_PREMIUM, // Fallback only
    segpayProductId: process.env.SEGPAY_AIKO_NSFW_PRODUCT_ID,
  },
  nsfw_premium_lexi: {
    processor: 'segpay' as PaymentProcessor,
    isNsfw: true,
    stripePrice: process.env.LEXI_STRIPE_PRICE_NSFW_PREMIUM, // Fallback only
    segpayProductId: process.env.SEGPAY_LEXI_NSFW_PRODUCT_ID,
  },
};

/**
 * Environment-based processor selection
 * Allows override for testing or emergency fallback
 */
export function getProcessorOverride(): PaymentProcessor | null {
  const override = process.env.PAYMENT_PROCESSOR_OVERRIDE;
  if (override === 'stripe' || override === 'segpay') {
    return override;
  }
  return null;
}

/**
 * Main routing logic - determines which processor to use for a product
 */
export function getPaymentProcessor(
  productType: keyof typeof PAYMENT_ROUTING,
  characterKey?: string
): ProductRouting {
  const override = getProcessorOverride();
  const routing = PAYMENT_ROUTING[productType];
  
  if (!routing) {
    throw new Error(`Unknown product type: ${productType}`);
  }

  // Apply environment override if set
  const processor = override || routing.processor;
  
  // Special handling for character-specific products
  let finalProductType = productType;
  if (productType === 'sfw_premium') {
    if (characterKey === 'nyx') {
      finalProductType = 'sfw_premium_nyx';
    } else if (characterKey === 'dom') {
      finalProductType = 'sfw_premium_dom';
    } else if (characterKey === 'chase') {
      finalProductType = 'sfw_premium_chase';
    } else if (characterKey === 'aiko') {
      finalProductType = 'sfw_premium_aiko';
    } else if (characterKey === 'lexi') {
      finalProductType = 'sfw_premium_lexi';
    }
  } else if (productType === 'nsfw_premium') {
    if (characterKey === 'nyx') {
      finalProductType = 'nsfw_premium_nyx';
    } else if (characterKey === 'dom') {
      finalProductType = 'nsfw_premium_dom';
    } else if (characterKey === 'chase') {
      finalProductType = 'nsfw_premium_chase';
    } else if (characterKey === 'aiko') {
      finalProductType = 'nsfw_premium_aiko';
    } else if (characterKey === 'lexi') {
      finalProductType = 'nsfw_premium_lexi';
    }
  }

  const finalRouting = PAYMENT_ROUTING[finalProductType] || routing;
  
  // Select appropriate price ID based on processor
  const priceId = processor === 'stripe' 
    ? finalRouting.stripePrice || ''
    : finalRouting.segpayProductId || '';

  return {
    processor,
    productId: finalProductType,
    priceId,
    isNsfw: finalRouting.isNsfw,
  };
}

/**
 * Generate checkout URL based on processor
 */
export function generateCheckoutUrl(
  routing: ProductRouting,
  userId: string,
  successUrl: string,
  cancelUrl: string
): string {
  if (routing.processor === 'stripe') {
    return generateStripeCheckoutUrl(routing.priceId, userId, successUrl, cancelUrl);
  } else {
    return generateSegpayCheckoutUrl(routing.priceId, userId, successUrl, cancelUrl);
  }
}

/**
 * Stripe checkout URL generation
 */
function generateStripeCheckoutUrl(
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): string {
  // Use NEXT_PUBLIC_BASE_URL if set, otherwise detect from environment
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (!baseUrl) {
    // If running in browser, use window.location.origin
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
    } else {
      // Server-side fallback: detect production vs development
      const isProduction = process.env.NODE_ENV === 'production' || 
                          process.env.NEXT_PUBLIC_SITE_URL?.includes('https://');
      baseUrl = isProduction ? 'https://chatwithlexi.com' : 'http://localhost:3000';
    }
  }
  
  // Modern checkout API expects POST with JSON body, not GET with query params
  return `${baseUrl}/api/checkout`;
}

/**
 * Segpay checkout URL generation  
 * Note: This will need to be implemented once Segpay account is approved
 */
function generateSegpayCheckoutUrl(
  productId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): string {
  // TODO: Replace with actual Segpay integration once approved
  const segpayMerchantId = process.env.SEGPAY_MERCHANT_ID;
  const segpayPackageId = productId;
  
  if (!segpayMerchantId || !segpayPackageId) {
    console.warn('Segpay not configured, falling back to Stripe');
    return generateStripeCheckoutUrl(
      PAYMENT_ROUTING.sfw_premium.stripePrice || '',
      userId,
      successUrl,
      cancelUrl
    );
  }

  // Segpay hosted payment page URL format
  // Reference: https://docs.segpay.com/hosted-payment-page
  const params = new URLSearchParams({
    'merchant-id': segpayMerchantId,
    'package-id': segpayPackageId,
    'user-id': userId,
    'success-url': successUrl,
    'cancel-url': cancelUrl,
  });

  return `https://secure2.segpay.com/billing/poset.cgi?${params.toString()}`;
}

/**
 * Webhook signature verification helper
 */
export function verifyWebhookSignature(
  processor: PaymentProcessor,
  payload: string,
  signature: string
): boolean {
  if (processor === 'stripe') {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    try {
      stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return true;
    } catch {
      return false;
    }
  } else if (processor === 'segpay') {
    // TODO: Implement Segpay webhook verification
    // Reference: https://docs.segpay.com/webhooks
    const segpayWebhookSecret = process.env.SEGPAY_WEBHOOK_SECRET;
    if (!segpayWebhookSecret) return false;
    
    // Placeholder - implement actual Segpay signature verification
    return true;
  }
  
  return false;
}

/**
 * Development/testing helpers
 */
export function getAvailableProcessors(): PaymentProcessor[] {
  const processors: PaymentProcessor[] = [];
  
  if (process.env.STRIPE_SECRET_KEY) {
    processors.push('stripe');
  }
  
  if (process.env.SEGPAY_MERCHANT_ID && process.env.SEGPAY_PACKAGE_IDS) {
    processors.push('segpay');
  }
  
  return processors;
}

/**
 * Safe routing for emergency fallback
 * Always routes to Stripe with clean products if Segpay fails
 */
export function getSafeRoutingFallback(productType: string): ProductRouting {
  return {
    processor: 'stripe',
    productId: 'sfw_premium',
    priceId: process.env.STRIPE_PRICE_SFW || '',
    isNsfw: false,
  };
}