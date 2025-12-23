// Coinbase Commerce API integration
import axios from 'axios';
import { COINBASE_COMMERCE_CONFIG, CryptoPricingTier } from './cryptoPricing';

interface CoinbaseChargeRequest {
  name: string;
  description: string;
  pricing_type: 'fixed_price';
  local_price: {
    amount: string;
    currency: 'USD';
  };
  redirect_url?: string;
  cancel_url?: string;
  metadata: Record<string, any>;
}

interface CoinbaseChargeResponse {
  data: {
    id: string;
    code: string;
    name: string;
    description: string;
    hosted_url: string;
    created_at: string;
    expires_at: string;
    timeline: any[];
    metadata: Record<string, any>;
    pricing_type: string;
    pricing: {
      local: { amount: string; currency: string };
      [key: string]: any;
    };
    addresses: Record<string, string>;
  };
}

export class CoinbaseCommerceService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.COINBASE_COMMERCE_API_KEY || '';
    this.baseUrl = COINBASE_COMMERCE_CONFIG.apiUrl;

    if (!this.apiKey) {
      throw new Error('COINBASE_COMMERCE_API_KEY environment variable is required');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': this.apiKey,
      'X-CC-Version': '2018-03-22'
    };
  }

  async createCharge(
    userId: string,
    characterKey: string,
    tier: CryptoPricingTier,
    userEmail?: string
  ): Promise<CoinbaseChargeResponse['data']> {
    try {
      const chargeData: CoinbaseChargeRequest = {
        name: `${tier.name} - ${characterKey.charAt(0).toUpperCase() + characterKey.slice(1)}`,
        description: `30-day premium access to ${characterKey} with advanced AI features`,
        pricing_type: 'fixed_price',
        local_price: {
          amount: tier.price.toFixed(2),
          currency: 'USD'
        },
        redirect_url: COINBASE_COMMERCE_CONFIG.successUrl,
        cancel_url: COINBASE_COMMERCE_CONFIG.cancelUrl,
        metadata: {
          user_id: userId,
          character_key: characterKey,
          tier_id: tier.id,
          tier_name: tier.name,
          duration_days: tier.durationDays,
          user_email: userEmail || '',
          created_by: 'crypto_payment_system',
          timestamp: new Date().toISOString()
        }
      };

      console.log('🚀 Creating Coinbase Commerce charge:', {
        userId: userId.substring(0, 8) + '...',
        character: characterKey,
        tier: tier.name,
        price: tier.price
      });

      const response = await axios.post<CoinbaseChargeResponse>(
        `${this.baseUrl}/charges`,
        chargeData,
        { headers: this.getHeaders() }
      );

      console.log('✅ Coinbase Commerce charge created:', {
        chargeId: response.data.data.id,
        code: response.data.data.code,
        hostedUrl: response.data.data.hosted_url
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Coinbase Commerce charge creation failed:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      throw new Error('Failed to create crypto payment charge');
    }
  }

  async getCharge(chargeId: string): Promise<CoinbaseChargeResponse['data']> {
    try {
      const response = await axios.get<CoinbaseChargeResponse>(
        `${this.baseUrl}/charges/${chargeId}`,
        { headers: this.getHeaders() }
      );

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to fetch Coinbase Commerce charge:', error);
      throw new Error('Failed to fetch crypto payment charge');
    }
  }

  async listCharges(limit: number = 25): Promise<CoinbaseChargeResponse['data'][]> {
    try {
      const response = await axios.get<{ data: CoinbaseChargeResponse['data'][] }>(
        `${this.baseUrl}/charges?limit=${limit}`,
        { headers: this.getHeaders() }
      );

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to list Coinbase Commerce charges:', error);
      throw new Error('Failed to list crypto payment charges');
    }
  }
}

// Export singleton instance
export const coinbaseCommerce = new CoinbaseCommerceService();