// Service to manage crypto subscription status and features
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdmin();

export interface CryptoSubscriptionStatus {
  hasSubscription: boolean;
  tierId: string | null;
  tierName: string | null;
  expiresAt: Date | null;
  nsfwEnabled: boolean;
  voiceEnabled: boolean;
  priorityEnabled: boolean;
  daysRemaining: number;
  isExpired: boolean;
}

export class CryptoSubscriptionService {
  /**
   * Check if user has active crypto subscription for character
   */
  static async checkSubscription(
    userId: string,
    characterKey: string
  ): Promise<CryptoSubscriptionStatus> {
    try {
      console.log('🔍 Checking crypto subscription:', {
        userId: userId.substring(0, 8) + '...',
        character: characterKey
      });

      // First, expire any subscriptions that should be expired
      await this.expireOldSubscriptions();

      // Check for active subscription
      const { data, error } = await supabase
        .rpc('check_crypto_subscription', {
          p_user_id: userId,
          p_character_key: characterKey
        });

      if (error) {
        console.error('❌ Error checking crypto subscription:', error);
        return this.getDefaultStatus();
      }

      if (!data || data.length === 0) {
        console.log('📭 No active crypto subscription found');
        return this.getDefaultStatus();
      }

      const subscription = data[0];
      const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
      const now = new Date();
      const daysRemaining = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      const isExpired = expiresAt ? expiresAt <= now : true;

      const status: CryptoSubscriptionStatus = {
        hasSubscription: subscription.has_subscription && !isExpired,
        tierId: subscription.tier_id,
        tierName: subscription.tier_name,
        expiresAt,
        nsfwEnabled: subscription.nsfw_enabled || false,
        voiceEnabled: subscription.voice_enabled || false,
        priorityEnabled: subscription.priority_enabled || false,
        daysRemaining,
        isExpired
      };

      console.log('✅ Crypto subscription status:', {
        hasSubscription: status.hasSubscription,
        tier: status.tierName,
        daysRemaining: status.daysRemaining,
        features: {
          nsfw: status.nsfwEnabled,
          voice: status.voiceEnabled,
          priority: status.priorityEnabled
        }
      });

      return status;

    } catch (error) {
      console.error('❌ Crypto subscription check failed:', error);
      return this.getDefaultStatus();
    }
  }

  /**
   * Get all active crypto subscriptions for user
   */
  static async getAllUserSubscriptions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('crypto_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching user crypto subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get user crypto subscriptions:', error);
      return [];
    }
  }

  /**
   * Manually expire old subscriptions
   */
  static async expireOldSubscriptions(): Promise<number> {
    try {
      const { data: expiredCount, error } = await supabase
        .rpc('expire_crypto_subscriptions');

      if (error) {
        console.error('❌ Error expiring crypto subscriptions:', error);
        return 0;
      }

      if (expiredCount > 0) {
        console.log(`🗓️ Expired ${expiredCount} crypto subscriptions`);
      }

      return expiredCount || 0;
    } catch (error) {
      console.error('❌ Failed to expire crypto subscriptions:', error);
      return 0;
    }
  }

  /**
   * Get crypto subscription history for user
   */
  static async getSubscriptionHistory(userId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('crypto_subscriptions')
        .select(`
          *,
          crypto_charges (
            coinbase_charge_id,
            usd_amount,
            created_at,
            confirmed_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching crypto subscription history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get crypto subscription history:', error);
      return [];
    }
  }

  /**
   * Check if user has any crypto payment history
   */
  static async hasPaymentHistory(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('crypto_charges')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .limit(1);

      if (error) {
        console.error('❌ Error checking crypto payment history:', error);
        return false;
      }

      return (data && data.length > 0) || false;
    } catch (error) {
      console.error('❌ Failed to check crypto payment history:', error);
      return false;
    }
  }

  private static getDefaultStatus(): CryptoSubscriptionStatus {
    return {
      hasSubscription: false,
      tierId: null,
      tierName: null,
      expiresAt: null,
      nsfwEnabled: false,
      voiceEnabled: false,
      priorityEnabled: false,
      daysRemaining: 0,
      isExpired: true
    };
  }
}

// Export convenience functions
export const checkCryptoSubscription = CryptoSubscriptionService.checkSubscription;
export const getAllUserCryptoSubscriptions = CryptoSubscriptionService.getAllUserSubscriptions;
export const expireCryptoSubscriptions = CryptoSubscriptionService.expireOldSubscriptions;