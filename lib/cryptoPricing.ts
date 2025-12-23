// Crypto payment pricing configuration
export interface CryptoPricingTier {
  id: string;
  name: string;
  price: number; // USD equivalent
  features: string[];
  cryptoDiscount: number; // Percentage discount from card price
  durationDays?: number; // Optional for non-subscription items
  type: 'subscription' | 'voice_pack' | 'tip';
  quantity?: number; // For voice packs and tips
}

export const CRYPTO_PRICING_TIERS: CryptoPricingTier[] = [
  // Subscription Passes - TEST PRICING (minimum $1.00 for Coinbase Commerce)
  {
    id: 'basic_crypto',
    name: 'Basic Crypto Pass',
    price: 1.00, // TEST PRICE - was 6.99
    cryptoDiscount: 30, // 30% off from $9.99 card price
    durationDays: 30,
    type: 'subscription',
    features: [
      '30-day access',
      'Basic chat features',
      'Standard emotional responses',
      'Early adopter pricing',
    ]
  },
  {
    id: 'premium_crypto',
    name: 'Premium Crypto Pass',
    price: 1.50, // TEST PRICE - was 24.49
    cryptoDiscount: 30, // 30% off from $34.99 card price
    durationDays: 30,
    type: 'subscription',
    features: [
      '30-day access',
      'NSFW content unlocked',
      'Advanced emotional AI',
      'Voice messages',
      'Priority responses',
      'Early adopter pricing',
    ]
  },

  // Voice Packs - TEST PRICING
  {
    id: 'voice_pack_10_crypto',
    name: '10 Voice Pack',
    price: 1.00, // TEST PRICE - was 6.99
    cryptoDiscount: 30, // 30% off from $9.99 card price
    type: 'voice_pack',
    quantity: 10,
    features: [
      '10 voice messages',
      'Instant delivery',
      'No expiration',
      'Early adopter pricing',
    ]
  },
  {
    id: 'voice_pack_25_crypto',
    name: '25 Voice Pack',
    price: 1.25, // TEST PRICE - was 17.49
    cryptoDiscount: 30, // 30% off from $24.99 card price
    type: 'voice_pack',
    quantity: 25,
    features: [
      '25 voice messages',
      'Instant delivery',
      'No expiration',
      'Best value pack',
      'Early adopter pricing',
    ]
  },
  {
    id: 'voice_pack_50_crypto',
    name: '50 Voice Pack',
    price: 1.50, // TEST PRICE - was 34.99
    cryptoDiscount: 30, // 30% off from $49.99 card price
    type: 'voice_pack',
    quantity: 50,
    features: [
      '50 voice messages',
      'Instant delivery',
      'No expiration',
      'Maximum value',
      'Early adopter pricing',
    ]
  },

  // Tips - TEST PRICING
  {
    id: 'tip_5_crypto',
    name: '$5 Tip',
    price: 1.00, // TEST PRICE - was 3.50
    cryptoDiscount: 30, // 30% off from $5.00 card price
    type: 'tip',
    quantity: 5,
    features: [
      'Show your appreciation',
      'Boost relationship score',
      'Instant delivery',
      'Early adopter pricing',
    ]
  },
  {
    id: 'tip_10_crypto',
    name: '$10 Tip',
    price: 1.25, // TEST PRICE - was 7.00
    cryptoDiscount: 30, // 30% off from $10.00 card price
    type: 'tip',
    quantity: 10,
    features: [
      'Show your appreciation',
      'Boost relationship score',
      'Instant delivery',
      'Popular choice',
      'Early adopter pricing',
    ]
  },
  {
    id: 'tip_25_crypto',
    name: '$25 Tip',
    price: 1.50, // TEST PRICE - was 17.50
    cryptoDiscount: 30, // 30% off from $25.00 card price
    type: 'tip',
    quantity: 25,
    features: [
      'Show your appreciation',
      'Major relationship boost',
      'Instant delivery',
      'VIP treatment',
      'Early adopter pricing',
    ]
  }
];

export const SUPPORTED_CRYPTOCURRENCIES = [
  'bitcoin',
  'ethereum',
  'usdc',
  'dai'
] as const;

export type SupportedCrypto = typeof SUPPORTED_CRYPTOCURRENCIES[number];

// Coinbase Commerce configuration
export const COINBASE_COMMERCE_CONFIG = {
  apiUrl: 'https://api.commerce.coinbase.com',
  webhookUrl: process.env.NEXT_PUBLIC_SITE_URL + '/api/crypto/webhook',
  successUrl: process.env.NEXT_PUBLIC_SITE_URL + '/crypto/success',
  cancelUrl: process.env.NEXT_PUBLIC_SITE_URL + '/crypto/cancel',
};

export function getCryptoPricingTier(tierId: string): CryptoPricingTier | null {
  return CRYPTO_PRICING_TIERS.find(tier => tier.id === tierId) || null;
}

export function getCryptoPricingTiersByType(type: 'subscription' | 'voice_pack' | 'tip'): CryptoPricingTier[] {
  return CRYPTO_PRICING_TIERS.filter(tier => tier.type === type);
}

export function calculateCryptoSavings(cryptoPrice: number, cardPrice: number): number {
  return ((cardPrice - cryptoPrice) / cardPrice) * 100;
}

export function getOriginalPrice(cryptoPrice: number, discountPercent: number): number {
  return cryptoPrice / (1 - discountPercent / 100);
}