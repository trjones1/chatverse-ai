// Gumroad API integration for VerseCoins
import { VERSE_COIN_PRODUCTS, type VerseCoinProduct } from './verseCoins';

export interface GumroadLicenseVerifyResponse {
  success: boolean;
  uses: number;
  purchase: {
    seller_id: string;
    product_id: string;
    product_name: string;
    permalink: string;
    product_permalink: string;
    email: string;
    price: number;
    gumroad_fee: number;
    currency: string;
    quantity: number;
    discover_fee_charged: boolean;
    can_contact: boolean;
    referrer: string;
    card: {
      visual: string;
      type: string;
      bin: string;
      expiry_month: string;
      expiry_year: string;
    };
    order_number: number;
    sale_id: string;
    sale_timestamp: string;
    purchaser_id: string;
    subscription_id?: string;
    variants: Record<string, any>;
    license_key: string;
    ip_country: string;
    recurrence: string;
    is_gift_receiver_purchase: boolean;
    refunded: boolean;
    disputed: boolean;
    dispute_won: boolean;
    id: string;
    created_at: string;
    updated_at: string;
  };
}

export interface GumroadLicenseVerifyRequest {
  product_id: string;
  license_key: string;
  increment_uses_count?: boolean;
}

/**
 * Verify a license key with Gumroad
 */
export async function verifyGumroadLicense(
  productId: string,
  licenseKey: string,
  incrementUses: boolean = true
): Promise<GumroadLicenseVerifyResponse> {
  const accessToken = process.env.GUMROAD_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('GUMROAD_ACCESS_TOKEN not configured');
  }

  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      access_token: accessToken,
      product_id: productId,
      license_key: licenseKey,
      increment_uses_count: incrementUses.toString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Gumroad API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Map Gumroad product ID to our VerseCoins product
 */
export function getVerseCoinProductByGumroadId(gumroadProductId: string): VerseCoinProduct | null {
  return VERSE_COIN_PRODUCTS.find(p => p.gumroad_product_id === gumroadProductId) || null;
}

/**
 * Validate that a license key is valid and unused for VerseCoins redemption
 */
export async function validateVerseCoinLicense(gumroadProductId: string, licenseKey: string) {
  try {
    // Verify with Gumroad (but don't increment uses yet)
    const verification = await verifyGumroadLicense(gumroadProductId, licenseKey, false);

    if (!verification.success) {
      return {
        valid: false,
        error: 'Invalid license key',
        verification: null
      };
    }

    // Check if refunded or disputed
    if (verification.purchase.refunded) {
      return {
        valid: false,
        error: 'This license key has been refunded',
        verification
      };
    }

    if (verification.purchase.disputed) {
      return {
        valid: false,
        error: 'This license key is disputed',
        verification
      };
    }

    // Find our product
    const product = getVerseCoinProductByGumroadId(gumroadProductId);
    if (!product) {
      return {
        valid: false,
        error: 'Product not found in VerseCoins catalog',
        verification
      };
    }

    // Check if already used (assuming single-use licenses)
    if (verification.uses > 0) {
      return {
        valid: false,
        error: 'License key has already been redeemed',
        verification
      };
    }

    return {
      valid: true,
      error: null,
      verification,
      product
    };

  } catch (error) {
    console.error('License validation error:', error);
    return {
      valid: false,
      error: 'Failed to verify license key',
      verification: null
    };
  }
}

/**
 * Redeem a VerseCoins license (marks it as used with Gumroad)
 */
export async function redeemVerseCoinLicense(gumroadProductId: string, licenseKey: string) {
  // First validate (this also gets us the verification data)
  const validation = await validateVerseCoinLicense(gumroadProductId, licenseKey);

  if (!validation.valid) {
    return validation;
  }

  try {
    // Now increment uses count to mark as redeemed
    const verification = await verifyGumroadLicense(gumroadProductId, licenseKey, true);

    return {
      valid: true,
      error: null,
      verification,
      product: validation.product,
      credits: validation.product?.credits || 0
    } as any;

  } catch (error) {
    console.error('License redemption error:', error);
    return {
      valid: false,
      error: 'Failed to redeem license key',
      verification: null
    };
  }
}

/**
 * Auto-detect which VerseCoins product a license key belongs to
 * by trying verification against all products
 */
export async function autoDetectProductFromLicense(licenseKey: string): Promise<{
  found: boolean;
  product?: VerseCoinProduct;
  gumroadProductId?: string;
  error?: string;
}> {
  // Try each product's Gumroad ID
  for (const product of VERSE_COIN_PRODUCTS) {
    if (!product.gumroad_product_id) continue;

    try {
      const verification = await verifyGumroadLicense(product.gumroad_product_id, licenseKey, false);

      if (verification.success) {
        return {
          found: true,
          product,
          gumroadProductId: product.gumroad_product_id
        };
      }
    } catch (error) {
      // Continue to next product if this one fails
      continue;
    }
  }

  return {
    found: false,
    error: 'License key not found in any VerseCoins product'
  };
}

/**
 * Get Gumroad product IDs that need to be set in our catalog
 */
export function getMissingGumroadProductIds(): string[] {
  return VERSE_COIN_PRODUCTS
    .filter(p => !p.gumroad_product_id)
    .map(p => p.id);
}