// lib/foundersCircle.ts
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export interface FounderInfo {
  is_founder: boolean;
  founder_number: number | null;
  subscription_created_at: string | null;
  bonus_versecoins: number;
  locked_pricing: any | null;
}

export interface FounderPricing {
  sfw_price_cents: number;
  nsfw_price_cents: number;
  versecoins_sfw_cost: number;
  versecoins_nsfw_cost: number;
}

// Legacy founder pricing (locked in when they first subscribed)
export const FOUNDER_LOCKED_PRICING: FounderPricing = {
  sfw_price_cents: 999,  // $9.99 (legacy pricing)
  nsfw_price_cents: 2999, // $29.99 (legacy pricing)
  versecoins_sfw_cost: 1350, // 10% discount on VerseCoins (current: 1500)
  versecoins_nsfw_cost: 2250 // 10% discount on VerseCoins (current: 2500)
};

/**
 * Check if user is a founder for the given character and get their locked pricing
 */
export async function getFounderInfo(userId: string, characterKey: string): Promise<FounderInfo | null> {
  try {
    const admin = getSupabaseAdmin();

    const { data: founderData, error } = await admin
      .from('founders_circle')
      .select('founder_number, subscription_created_at, bonus_versecoins, locked_pricing')
      .eq('user_id', userId)
      .eq('character_key', characterKey.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking founder status:', error);
      return null;
    }

    if (!founderData) {
      return {
        is_founder: false,
        founder_number: null,
        subscription_created_at: null,
        bonus_versecoins: 0,
        locked_pricing: null
      };
    }

    return {
      is_founder: true,
      founder_number: founderData.founder_number,
      subscription_created_at: founderData.subscription_created_at,
      bonus_versecoins: founderData.bonus_versecoins || 500,
      locked_pricing: founderData.locked_pricing || FOUNDER_LOCKED_PRICING
    };

  } catch (error) {
    console.error('Failed to get founder info:', error);
    return null;
  }
}

/**
 * Get founder pricing for subscription costs
 */
export function getFounderPricing(founderInfo: FounderInfo | null): FounderPricing | null {
  if (!founderInfo?.is_founder) {
    return null;
  }

  // Use stored locked pricing if available, otherwise use default founder pricing
  const lockedPricing = founderInfo.locked_pricing;
  if (lockedPricing && typeof lockedPricing === 'object') {
    return {
      sfw_price_cents: lockedPricing.sfw_price_cents || FOUNDER_LOCKED_PRICING.sfw_price_cents,
      nsfw_price_cents: lockedPricing.nsfw_price_cents || FOUNDER_LOCKED_PRICING.nsfw_price_cents,
      versecoins_sfw_cost: lockedPricing.versecoins_sfw_cost || FOUNDER_LOCKED_PRICING.versecoins_sfw_cost,
      versecoins_nsfw_cost: lockedPricing.versecoins_nsfw_cost || FOUNDER_LOCKED_PRICING.versecoins_nsfw_cost
    };
  }

  return FOUNDER_LOCKED_PRICING;
}

/**
 * Calculate actual cost with founder discount applied
 */
export function applyFounderDiscount(
  baseCost: number,
  costType: 'sfw_price_cents' | 'nsfw_price_cents' | 'versecoins_sfw_cost' | 'versecoins_nsfw_cost',
  founderInfo: FounderInfo | null
): { cost: number; is_founder_price: boolean; savings: number } {
  const founderPricing = getFounderPricing(founderInfo);

  if (!founderPricing) {
    return {
      cost: baseCost,
      is_founder_price: false,
      savings: 0
    };
  }

  let founderCost: number;

  // Handle weekly subscriptions specially - the locked pricing only has monthly prices
  // For weekly subscriptions, calculate 10% discount off the base cost instead
  const isWeeklySubscription = baseCost <= 833; // Weekly costs are much lower than monthly

  if (isWeeklySubscription && (costType === 'versecoins_sfw_cost' || costType === 'versecoins_nsfw_cost')) {
    // Apply 10% founder discount to weekly subscription base cost
    founderCost = Math.floor(baseCost * 0.9);
  } else {
    // Use locked monthly founder pricing for monthly subscriptions
    founderCost = founderPricing[costType];
  }

  const savings = baseCost - founderCost;

  return {
    cost: founderCost,
    is_founder_price: true,
    savings: Math.max(0, savings)
  };
}