// VerseCoins virtual currency system
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface VerseCoinProduct {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  gumroad_product_id?: string;
  gumroad_url?: string;
  bonus_credits?: number;
  savings_percent?: number;
  // Discount engine fields
  promotional_credits?: number;
  promotional_name?: string;
  promotional_badge?: string;
  total_value?: number; // credits + bonus_credits + promotional_credits
}

export interface DiscountRule {
  id: string;
  name: string;
  badge?: string; // Display badge like "LIMITED TIME", "FLASH SALE"
  type: 'percentage_bonus' | 'flat_bonus' | 'first_purchase_bonus' | 'bulk_bonus';
  condition: {
    type: 'always' | 'first_purchase' | 'product_id' | 'minimum_purchase' | 'promo_code' | 'date_range';
    value?: any; // product_id, minimum amount, promo code, etc.
  };
  bonus_credits: number; // Additional credits to add
  productId?: string; // Optional: restrict discount to specific product (e.g., COMEBACK only for weekly_premium_pack)
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  userLimit?: number; // max uses per user
  priority: number; // Higher priority discounts apply first
  stackable: boolean; // Can combine with other discounts
}

export interface RedemptionCode {
  id: string;
  code: string;
  product_id: string;
  credits: number;
  status: 'available' | 'sold' | 'redeemed' | 'refunded';
  gumroad_order_id?: string;
  purchaser_email?: string;
  redeemed_by_user_id?: string;
  created_at: string;
  sold_at?: string;
  redeemed_at?: string;
}

export interface UserVerseCoins {
  user_id: string;
  credits: number;
  updated_at: string;
}

/**
 * Fetch active promotional discounts from database
 */
export async function fetchPromotionalDiscounts(): Promise<DiscountRule[]> {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return getFallbackPromotionalDiscounts();
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found, using fallback promotional rules');
      return getFallbackPromotionalDiscounts();
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('promotional_discounts')
      .select('*')
      .eq('active', true)
      .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order('priority', { ascending: false });

    if (error) {
      // Silently fallback to avoid console spam in admin dashboard
      console.warn('Promotional discounts unavailable, using fallback rules');
      return getFallbackPromotionalDiscounts();
    }

    return data.map((promo: any) => ({
      id: promo.id,
      name: promo.name,
      badge: promo.badge,
      type: promo.type,
      condition: {
        type: promo.condition_type,
        value: promo.condition_value
      },
      bonus_credits: promo.bonus_credits,
      startDate: promo.start_date,
      endDate: promo.end_date,
      priority: promo.priority,
      stackable: promo.stackable,
      maxUses: promo.max_uses,
      userLimit: promo.max_uses_per_user
    }));
  } catch (err) {
    console.error('Unexpected error fetching promotional discounts:', err);
    return getFallbackPromotionalDiscounts();
  }
}

/**
 * Fallback promotional discounts (same as before for reliability)
 */
function getFallbackPromotionalDiscounts(): DiscountRule[] {
  // Calculate 30 days from now for COMEBACK expiry
  const comebackExpiry = new Date();
  comebackExpiry.setDate(comebackExpiry.getDate() + 30);

  return [
    {
      id: 'welcome_bonus',
      name: 'Welcome Bonus',
      badge: '🎉 NEW USER',
      type: 'first_purchase_bonus',
      condition: { type: 'first_purchase' },
      bonus_credits: 100,
      priority: 10,
      stackable: true
    },
    {
      id: 'comeback_2for1',
      name: 'Comeback 2-for-1',
      badge: '🔥 50% OFF',
      type: 'flat_bonus',
      condition: { type: 'promo_code', value: 'COMEBACK' },
      bonus_credits: 500, // Doubles 500 VC pack to 1000 VC
      productId: 'weekly_premium_pack', // Only apply to this product
      startDate: new Date().toISOString(),
      endDate: comebackExpiry.toISOString(),
      priority: 11, // HIGHEST priority - overrides Welcome Bonus
      stackable: false, // Not stackable - already huge discount
      userLimit: 1 // One per user
    },
    {
      id: 'flash_friday',
      name: 'Flash Friday',
      badge: '⚡ FLASH SALE',
      type: 'percentage_bonus',
      condition: { type: 'always' },
      bonus_credits: 0,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      priority: 5,
      stackable: true
    },
    {
      id: 'founder_exclusive',
      name: 'Founder Exclusive',
      badge: '👑 FOUNDER',
      type: 'flat_bonus',
      condition: { type: 'product_id', value: 'founder_pack' },
      bonus_credits: 500,
      priority: 8,
      stackable: true
    }
  ];
}

// VerseCoins product catalog with progressive discounts for larger packs
export const VERSE_COIN_PRODUCTS: VerseCoinProduct[] = [
  {
    id: 'weekly_premium_pack',
    name: 'VerseCoins – Weekly Premium Pass (500)',
    credits: 500, // Perfect for 1 week premium access
    price_usd: 4.99, // Micro-purchase for weekly premium subscription
    gumroad_product_id: '5j98SD2HoXZ440RhWBjELg==',
    gumroad_url: 'https://chatverse.gumroad.com/l/ljgaka',
    bonus_credits: 0, // No bonus - this IS the value (7 days premium)
    savings_percent: 0
  },
  {
    id: 'weekly_premium_plus_pack',
    name: 'VerseCoins – Weekly Premium+ Pass (833)',
    credits: 833, // Perfect for 1 week premium+ access - derived from monthly pricing
    price_usd: 8.33, // Micro-purchase for weekly premium+ subscription
    gumroad_product_id: 'T2k2tdjvsqfOsJXaB3VW8g==',
    gumroad_url: 'https://chatverse.gumroad.com/l/dlssf',
    bonus_credits: 0, // No bonus - this IS the value (7 days premium+)
    savings_percent: 0
  },
  {
    id: 'premium_starter',
    name: 'VerseCoins – Premium Starter (1,700)',
    credits: 1700, // 1500 base + 200 bonus for voice trials
    price_usd: 14.99, // Base rate: ~100 VC ≈ $0.88 - perfect for one SFW sub + tips
    gumroad_product_id: 'lWXwtiutzY74r8CcMvoLYA==',
    gumroad_url: 'https://chatverse.gumroad.com/l/gvidk',
    bonus_credits: 200, // +200 for 2 voice message trials
    savings_percent: 0
  },
  {
    id: 'premium_plus_pack',
    name: 'VerseCoins – Premium+ All Access Pack (2,500)',
    credits: 2500, // Monthly premium+ access - $10 premium over basic
    price_usd: 24.99, // Perfect for one NSFW sub + tips/gifts
    gumroad_product_id: 'yy6KxFMPYCffty2sRZOOzA==',
    gumroad_url: 'https://chatverse.gumroad.com/l/oprczi',
    bonus_credits: 0, // No separate bonus - this IS the discounted amount
    savings_percent: 25
  },
  {
    id: 'power_user_pack',
    name: 'VerseCoins – Power User Pack (4,600)',
    credits: 4600, // 4000 base + 600 bonus
    price_usd: 39.99, // ~100 VC = $0.87 - can get both subs + extras
    gumroad_product_id: 'WyS_pdT5_mVsFra52WHwzQ==',
    gumroad_url: 'https://chatverse.gumroad.com/l/lbmpn',
    bonus_credits: 600, // +15% bonus for bulk
    savings_percent: 15
  },
  {
    id: 'ultimate_pack',
    name: "VerseCoins – Ultimate Pack (7,000)",
    credits: 7000, // 6000 base + 1000 bonus
    price_usd: 59.99, // Best value: ~100 VC = $0.86 - multiple months coverage
    gumroad_product_id: 'wW0NN_IZx_eOnEkd_uu5dA==',
    gumroad_url: 'https://chatverse.gumroad.com/l/qijso',
    bonus_credits: 1000, // +16.7% bonus for maximum pack
    savings_percent: 17
  }
];

/**
 * Generate a secure, readable redemption code
 * Format: XXXX-XXXX-XXXX (12 chars, uppercase letters/numbers, no confusing chars)
 */
export function generateRedemptionCode(): string {
  // Use characters that are easy to read and type (no 0, O, I, 1, etc.)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) {
      code += '-';
    }
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }

  return code;
}

/**
 * Generate a batch of redemption codes for a specific product
 */
export function generateCodeBatch(productId: string, quantity: number): Omit<RedemptionCode, 'id' | 'created_at'>[] {
  const product = VERSE_COIN_PRODUCTS.find(p => p.id === productId);
  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  const codes: Omit<RedemptionCode, 'id' | 'created_at'>[] = [];
  const usedCodes = new Set<string>();

  for (let i = 0; i < quantity; i++) {
    let code: string;
    do {
      code = generateRedemptionCode();
    } while (usedCodes.has(code));

    usedCodes.add(code);

    codes.push({
      code,
      product_id: productId,
      credits: product.credits,
      status: 'available'
    });
  }

  return codes;
}

/**
 * Get product by ID
 */
export function getVerseCoinProduct(productId: string): VerseCoinProduct | null {
  return VERSE_COIN_PRODUCTS.find(p => p.id === productId) || null;
}

/**
 * Check if a discount rule is currently active
 */
function isDiscountActive(discount: DiscountRule): boolean {
  const now = new Date();

  if (discount.startDate && new Date(discount.startDate) > now) {
    return false;
  }

  if (discount.endDate && new Date(discount.endDate) < now) {
    return false;
  }

  return true;
}

/**
 * Check if a discount rule applies to a specific context
 */
function doesDiscountApply(
  discount: DiscountRule,
  productId: string,
  context: {
    isFirstPurchase?: boolean;
    promoCode?: string;
    totalPurchaseAmount?: number;
  }
): boolean {
  if (!isDiscountActive(discount)) return false;

  // Special handling for promo codes that target specific products
  // For COMEBACK: need promo code AND must be weekly_premium_pack
  if (discount.condition.type === 'promo_code') {
    const promoCodeMatches = context.promoCode?.toUpperCase() === discount.condition.value?.toUpperCase();

    // If discount has a productId restriction (like COMEBACK), check it
    if (discount.productId) {
      return promoCodeMatches && discount.productId === productId;
    }

    // Otherwise promo code applies to all products
    return promoCodeMatches;
  }

  switch (discount.condition.type) {
    case 'always':
      return true;
    case 'first_purchase':
      return context.isFirstPurchase === true;
    case 'product_id':
      return discount.condition.value === productId;
    case 'minimum_purchase':
      return (context.totalPurchaseAmount || 0) >= discount.condition.value;
    case 'date_range':
      return isDiscountActive(discount);
    default:
      return false;
  }
}

/**
 * Apply promotional discounts to a product
 */
export async function applyPromotionalDiscounts(
  product: VerseCoinProduct,
  context: {
    userId?: string;
    isFirstPurchase?: boolean;
    promoCode?: string;
    totalPurchaseAmount?: number;
  } = {}
): Promise<VerseCoinProduct> {
  const promotionalDiscounts = await fetchPromotionalDiscounts();
  const applicableDiscounts = promotionalDiscounts
    .filter(discount => doesDiscountApply(discount, product.id, context))
    .sort((a, b) => b.priority - a.priority); // Higher priority first

  if (applicableDiscounts.length === 0) {
    return { ...product, total_value: product.credits };
  }

  let totalPromotionalCredits = 0;
  let promotionalNames: string[] = [];
  let promotionalBadges: string[] = [];

  for (const discount of applicableDiscounts) {
    if (!discount.stackable && totalPromotionalCredits > 0) {
      continue; // Skip if not stackable and we already have a discount
    }

    let bonusCredits = discount.bonus_credits;

    // Calculate percentage bonuses
    if (discount.type === 'percentage_bonus') {
      const baseCredits = product.credits + (product.bonus_credits || 0);
      bonusCredits = Math.floor(baseCredits * 0.15); // 15% bonus for flash sales
    }

    totalPromotionalCredits += bonusCredits;
    promotionalNames.push(discount.name);
    if (discount.badge) {
      promotionalBadges.push(discount.badge);
    }

    // If not stackable, break after first discount
    if (!discount.stackable) break;
  }

  return {
    ...product,
    promotional_credits: totalPromotionalCredits,
    promotional_name: promotionalNames.join(' + '),
    promotional_badge: promotionalBadges[0], // Use first/highest priority badge
    total_value: product.credits + (product.bonus_credits || 0) + totalPromotionalCredits
  };
}

/**
 * Get all products with promotional discounts applied
 */
export async function getPromotionalProducts(context: {
  userId?: string;
  isFirstPurchase?: boolean;
  promoCode?: string;
} = {}): Promise<VerseCoinProduct[]> {
  const promises = VERSE_COIN_PRODUCTS.map(product =>
    applyPromotionalDiscounts(product, context)
  );
  return Promise.all(promises);
}

/**
 * Get the best value VerseCoins pack (highest total value relative to price)
 */
export async function getBestValuePack(context?: {
  userId?: string;
  isFirstPurchase?: boolean;
  promoCode?: string;
}): Promise<VerseCoinProduct> {
  const products = await getPromotionalProducts(context);
  return products.reduce((best, current) => {
    const bestValue = (best.total_value || best.credits) / best.price_usd;
    const currentValue = (current.total_value || current.credits) / current.price_usd;
    return currentValue > bestValue ? current : best;
  });
}

/**
 * Format savings display for VerseCoins packs
 */
export function formatPackSavings(pack: VerseCoinProduct): string {
  if (!pack.bonus_credits || pack.bonus_credits === 0) {
    return '';
  }
  return `+${pack.bonus_credits} Bonus (${pack.savings_percent}% off)`;
}

/**
 * Convert credits to different character-themed currencies for display
 */
export function getCharacterCurrency(credits: number, characterKey: string): { name: string; icon: string; amount: number } {
  const currencies = {
    lexi: { name: 'Charms', icon: '💋' },
    nyx: { name: 'Lunas', icon: '🌙' },
    aiko: { name: 'Sakuras', icon: '🌸' },
    zaria: { name: 'Petals', icon: '🌺' },
    default: { name: 'VerseCoins', icon: '⭐' }
  };

  const currency = currencies[characterKey.toLowerCase() as keyof typeof currencies] || currencies.default;

  return {
    name: currency.name,
    icon: currency.icon,
    amount: credits
  };
}

/**
 * VerseCoins Economy - Updated pricing structure
 * Based on 1 credit ≈ $0.01 USD (from Gumroad pricing)
 */
export const VERSE_COIN_ECONOMY = {
  // Voice messages (replacing voice credits system)
  voice_message: 100,          // $1.00 equivalent (same as old voice credit cost)

  // Subscriptions (monthly)
  subscription_premium: 1500,      // $15 equivalent - "Premium Pass"
  subscription_premium_plus: 2500, // $25 equivalent - "Premium+ All Access Pass"

  // Weekly subscriptions (micro-purchase tier) - derived from monthly with 25% discount
  subscription_premium_weekly: 500,      // $5 equivalent - "Premium Pass (7 days)" (1500÷4÷0.75)
  subscription_premium_plus_weekly: 833, // $8.33 equivalent - "Premium+ All Access Pass (7 days)" (2500÷4÷0.75)

  // Tips (bring back tip jar modal with VerseCoins)
  tip_small: 50,               // $0.50 equivalent
  tip_medium: 100,             // $1.00 equivalent
  tip_large: 250,              // $2.50 equivalent
  tip_generous: 500,           // $5.00 equivalent
  tip_amazing: 1000,           // $10.00 equivalent
  // Note: Custom tip amounts above 1000 VC allowed via input field

  // Gifts (new feature - improves relationship + gets selfie)
  gift_flower: 200,            // $2.00 equivalent
  gift_chocolate: 300,         // $3.00 equivalent
  gift_jewelry: 500,           // $5.00 equivalent
  gift_perfume: 750,           // $7.50 equivalent
  gift_luxury: 1500,           // $15.00 equivalent
} as const;

export type VerseCoinFeature = keyof typeof VERSE_COIN_ECONOMY;