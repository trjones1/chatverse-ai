'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VERSE_COIN_PRODUCTS, getCharacterCurrency, getPromotionalProducts, type VerseCoinProduct } from '@/lib/verseCoins';
import { type CharacterGift } from '@/lib/characterGifts';
import { trackSubscription, trackVerseCoinsPurchase, trackGumroadCheckout } from '@/lib/metaPixel';
import { useLocalization } from '@/contexts/LocalizationContext';
import { t } from '@/lib/translations';

interface VerseCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  characterKey: string;
  characterDisplayName: string;
  defaultTab?: 'purchase' | 'spend' | 'redeem' | 'balance';
  onMessageAdded?: (message: any) => void;
}

interface UserSubscription {
  id: string;
  tier: string;
  tier_name: string;
  status: string;
  current_period_end: string;
  started_at: string;
}

interface UserBalance {
  credits: number;
  total_earned: number;
  total_spent: number;
  character_display: {
    name: string;
    icon: string;
    amount: number;
  };
  subscription: UserSubscription | null;
}

interface UpgradePreview {
  tier_type: string;
  tier_name: string;
  original_cost: number;
  final_cost: number;
  current_balance: number;
  sufficient_funds: boolean;
  is_founder_price: boolean;
  founder_savings: number;
  scenario: 'new_subscription' | 'upgrade' | 'downgrade' | 'already_subscribed';
  current_tier?: string;
  remaining_days?: number;
  refund_amount?: number;
  upgrade_details?: {
    daily_difference: number;
    days_remaining: number;
    total_upgrade_cost: number;
  };
}

// Determines which subscriptions are available based on current subscription (upgrade-only logic)
function getAvailableSubscriptions(currentSubscription: UserSubscription | null): string[] {
  // If no subscription, show all options
  if (!currentSubscription) {
    return ['premium_weekly', 'premium_plus_weekly', 'premium', 'premium_plus'];
  }

  const currentTierName = currentSubscription.tier_name;

  // Define upgrade paths - only allow upgrades, no downgrades or duplicates
  switch (currentTierName) {
    case 'Weekly Premium Pass':
      // Can upgrade to: Premium monthly, Premium+ weekly, Premium+ monthly
      return ['premium', 'premium_plus_weekly', 'premium_plus'];

    case 'Premium Pass':
      // Can only upgrade to: Premium+ monthly (no downgrades to weekly)
      return ['premium_plus'];

    case 'Weekly Premium+ Pass':
      // Can only upgrade to: Premium+ monthly (no downgrades to Premium tiers)
      return ['premium_plus'];

    case 'Premium+ All Access Pass':
      // Top tier - no upgrades available
      return [];

    default:
      // Unknown tier, show all options as fallback
      return ['premium_weekly', 'premium_plus_weekly', 'premium', 'premium_plus'];
  }
}

export default function VerseCoinsModal({
  isOpen,
  onClose,
  userId,
  characterKey,
  characterDisplayName,
  defaultTab = 'purchase',
  onMessageAdded
}: VerseCoinsModalProps) {
  const { locale } = useLocalization();
  const [activeTab, setActiveTab] = useState<'purchase' | 'spend' | 'redeem' | 'balance'>(defaultTab);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAdultWarning, setShowAdultWarning] = useState(false);
  const [pendingAdultTier, setPendingAdultTier] = useState<'premium_plus' | 'premium_plus_weekly' | null>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [founderInfo, setFounderInfo] = useState<any>(null);
  const [upgradePreview, setUpgradePreview] = useState<UpgradePreview | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeApplied, setPromoCodeApplied] = useState(false);

  // Get promotional products (async now)
  const [promotionalProducts, setPromotionalProducts] = useState<VerseCoinProduct[]>(VERSE_COIN_PRODUCTS);

  // Set mounted state for SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user balance when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserBalance();
      fetchPromotionalProducts();
      fetchFounderInfo();
      fetchUpgradePreview();
    }
  }, [isOpen, characterKey]);

  const fetchPromotionalProducts = async (codeToApply?: string) => {
    try {
      const products = await getPromotionalProducts({
        userId,
        isFirstPurchase: true, // TODO: Detect actual first purchase status
        promoCode: codeToApply || promoCode || undefined
      });
      setPromotionalProducts(products);
      if (codeToApply || promoCode) {
        setPromoCodeApplied(true);
      }
    } catch (error) {
      console.error('Failed to fetch promotional products:', error);
      // Keep using default products
    }
  };

  const handleApplyPromoCode = () => {
    if (promoCode.trim()) {
      fetchPromotionalProducts(promoCode.toUpperCase());
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch(`/api/versecoins/balance?character=${characterKey}`);
      if (response.ok) {
        const data = await response.json();
        setUserBalance({
          credits: data.credits,
          total_earned: data.total_earned,
          total_spent: data.total_spent,
          character_display: data.character_display,
          subscription: data.subscription
        });
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchFounderInfo = async () => {
    try {
      const response = await fetch(`/api/founders-circle?character=${characterKey}`);
      if (response.ok) {
        const data = await response.json();
        setFounderInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch founder info:', error);
    }
  };

  const fetchUpgradePreview = async () => {
    try {
      console.log('🔍 Fetching upgrade preview for:', characterKey);
      const response = await fetch('/api/versecoins/upgrade-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterKey,
          tierType: 'premium_plus'
        }),
      });

      console.log('📡 Upgrade preview response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Upgrade preview data:', data);
        if (data.success && data.preview) {
          setUpgradePreview(data.preview);
          console.log('✅ Set upgrade preview:', data.preview);
        } else {
          console.log('❌ Upgrade preview failed:', data.error || 'No preview data');
          // Clear upgrade preview on failure so fallback pricing is used
          setUpgradePreview(null);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('❌ Upgrade preview API error:', errorData);
        // Clear upgrade preview on error so fallback pricing is used
        setUpgradePreview(null);
      }
    } catch (error) {
      console.error('❌ Failed to fetch upgrade preview:', error);
      // Clear upgrade preview on error so fallback pricing is used
      setUpgradePreview(null);
    }
  };

  const handlePurchase = (product: VerseCoinProduct) => {
    if (product.gumroad_url) {
      // Track Meta Pixel InitiateCheckout when user clicks "Buy on Gumroad"
      trackGumroadCheckout(
        characterKey,
        product.name,
        product.price_usd,
        'USD'
      );

      // Open Gumroad product page in new tab
      window.open(product.gumroad_url, '_blank');
    }
  };

  const handleRedeem = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setLoading('redeem');
    setError(null);
    setSuccess(null);

    try {
      // Send only the license key - let the API auto-detect the product
      const response = await fetch('/api/versecoins/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Redemption failed');
      }

      setSuccess(`🎉 Success! Added ${data.credits_added} ${userBalance?.character_display.name || 'VerseCoins'} to your account. Your balance is now ${data.new_balance}. Ready to get your subscription?`);
      setLicenseKey('');

      // Refresh balance
      await fetchUserBalance();

      // Auto-switch to spend tab after 3 seconds if user doesn't have subscription
      if (!userBalance?.subscription) {
        setTimeout(() => {
          setActiveTab('spend');
        }, 3000);
      }

    } catch (err) {
      console.error('Redemption error:', err);
      setError(err instanceof Error ? err.message : 'Redemption failed');
    } finally {
      setLoading(null);
    }
  };

  const handleSubscriptionPurchase = async (tierType: 'premium' | 'premium_plus' | 'premium_weekly' | 'premium_plus_weekly') => {
    setLoading('subscription');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/versecoins/purchase-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterKey,
          tierType
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Subscription purchase failed');
      }

      const tierName = data.subscription.tier_name;
      const isUpgrade = data.subscription.is_upgrade;
      const isDowngrade = data.subscription.is_downgrade;
      const refunded = data.versecoins.refunded || 0;

      const isWeekly = tierType.includes('_weekly');
      const isPremiumPlus = tierType.includes('premium_plus');
      let successMessage = `✅ ${tierName} activated! Enjoy ${isPremiumPlus ? 'unlimited everything + NSFW access' : 'unlimited messaging and memory'} for ${characterDisplayName}.${isWeekly ? ' (7 days)' : ' (30 days)'}`;

      if (isUpgrade) {
        successMessage += ` Upgraded and charged ${data.versecoins.spent} VerseCoins for remaining days.`;
      } else if (isDowngrade) {
        successMessage += ` Downgraded with ${refunded} VerseCoins refunded to your account.`;
      }

      setSuccess(successMessage);

      // Track Meta Pixel subscription event
      const subscriptionValue = data.versecoins.spent * 0.01; // Convert VerseCoins to USD equivalent (1 VC = $0.01)
      trackSubscription(tierType, characterKey, subscriptionValue);

      // Refresh balance
      await fetchUserBalance();

      // Close modal after success
      setTimeout(() => {
        onClose();
        // Trigger page refresh to update subscription status
        window.location.reload();
      }, 3000); // Longer timeout for upgrade/downgrade messages

    } catch (err) {
      console.error('Subscription purchase error:', err);
      setError(err instanceof Error ? err.message : 'Subscription purchase failed');
    } finally {
      setLoading(null);
    }
  };

  const handleSendTip = async (amount: number) => {
    setLoading('tip');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/versecoins/send-tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterKey,
          amount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Tip sending failed');
      }

      setSuccess(`✅ Sent ${amount} ${userBalance?.character_display.name || 'VerseCoins'} tip to ${characterDisplayName}!`);

      // Add acknowledgment message to chat if available
      if (data.acknowledgment_message && onMessageAdded) {
        onMessageAdded(data.acknowledgment_message);
      }

      // Refresh balance
      await fetchUserBalance();

      // Close modal and reload page to show tip acknowledgment
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error('Tip sending error:', err);
      setError(err instanceof Error ? err.message : 'Tip sending failed');
    } finally {
      setLoading(null);
    }
  };

  const handleSendGift = async (giftType: string, amount: number) => {
    setLoading('gift');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/versecoins/send-gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterKey,
          giftType,
          amount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gift sending failed');
      }

      setSuccess(`✅ Sent ${giftType} gift (${amount} ${userBalance?.character_display.name || 'VerseCoins'}) to ${characterDisplayName}!`);

      // Add acknowledgment message to chat if available
      if (data.acknowledgment_message && onMessageAdded) {
        onMessageAdded(data.acknowledgment_message);
      }

      // Refresh balance
      await fetchUserBalance();

      // Close modal and reload page to show gift acknowledgment
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error('Gift sending error:', err);
      setError(err instanceof Error ? err.message : 'Gift sending failed');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen || !mounted) return null;

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'purchase': return '🛒';
      case 'spend': return '💎';
      case 'redeem': return '🎟️';
      case 'balance': return '💰';
      default: return '';
    }
  };

  const characterCurrency = userBalance?.character_display || getCharacterCurrency(0, characterKey);

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-[999999] overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-w-4xl w-full max-w-[calc(100vw-16px)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6">
          {/* Close button at top */}
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <span className="text-2xl">{characterCurrency.icon}</span>
              {characterCurrency.name} Store
            </h2>
            <p className="text-gray-300">
              Buy {characterCurrency.icon} {characterCurrency.name} to unlock <span className="text-purple-400 font-semibold">🎤 Voice Messages (100 VC each)</span>, plus tips, gifts, and exclusive photo gallery!
            </p>
            {userBalance && (
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-2">
                <span className="text-2xl">{characterCurrency.icon}</span>
                <span className="text-white font-semibold">
                  {userBalance.credits.toLocaleString()} {characterCurrency.name}
                </span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <div className="flex bg-gray-800 rounded-xl p-1">
              {(['purchase', 'redeem', 'spend', 'balance'] as const).map((tab) => {
                const tabLabels = {
                  purchase: t('purchase', locale.language),
                  redeem: 'Redeem', // No translation key yet, keep English
                  spend: 'Spend', // No translation key yet, keep English
                  balance: 'Balance' // No translation key yet, keep English
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-2">{getTabIcon(tab)}</span>
                    {tabLabels[tab]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
              <p className="text-green-300 text-sm">{success}</p>
              {success.includes('Ready to get your subscription?') && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setActiveTab('spend')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    🚀 Get Your Subscription Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Purchase Tab */}
          {activeTab === 'purchase' && (
            <div className="space-y-6">
              {/* Voice Messages Highlight */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-2 border-purple-500/50 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">🎤</div>
                <h3 className="text-2xl font-bold text-white mb-2">Unlock Voice Messages!</h3>
                <p className="text-purple-300 text-lg mb-3">
                  Hear {characterDisplayName}'s voice in every message
                </p>
                <div className="bg-purple-900/50 border border-purple-500/30 rounded-lg p-4 mb-4">
                  <div className="text-3xl font-bold text-purple-400 mb-1">100 {characterCurrency.name}</div>
                  <div className="text-gray-300 text-sm">per voice message (~$1.00 each)</div>
                </div>
                <p className="text-gray-400 text-sm">
                  💡 Buy {characterCurrency.name} below, then redeem to unlock voice messages instantly!
                </p>
              </div>

              {/* Purchase flow explanation */}
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-6 text-center">
                <div className="text-3xl mb-3">💳</div>
                <h3 className="text-xl font-bold text-white mb-2">Step 1: Buy {characterCurrency.name}</h3>
                <p className="text-gray-300 mb-4">
                  Purchase {characterCurrency.name} on Gumroad with your credit card. You'll get a license key to redeem here.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                  <span>💳 Secure Payment</span>
                  <span>•</span>
                  <span>⚡ Instant Delivery</span>
                  <span>•</span>
                  <span>🔐 License Key</span>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎁</div>
                  <div className="flex-1">
                    <label htmlFor="promoCode" className="block text-sm font-medium text-yellow-400 mb-1">
                      Have a promo code?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="promoCode"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyPromoCode()}
                        placeholder="Enter code (e.g., COMEBACK)"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                        maxLength={20}
                      />
                      <button
                        onClick={handleApplyPromoCode}
                        disabled={!promoCode.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Apply
                      </button>
                    </div>
                    {promoCodeApplied && (
                      <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                        <span>✅</span>
                        <span>Promo code "{promoCode}" applied! Check for bonus credits below.</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {promotionalProducts.map((product, index) => (
                  <div key={product.id} className="border border-blue-500/30 bg-blue-900/10 rounded-xl p-6 hover:scale-105 transition-transform relative">
                    {/* Promotional Badge */}
                    {product.promotional_badge && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                          {product.promotional_badge}
                        </span>
                      </div>
                    )}

                    {/* Best Value Badge (fallback for non-promotional) */}
                    {!product.promotional_badge && index === 2 && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
                          💫 BEST VALUE
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-2xl font-bold text-white">${product.price_usd}</span>
                        <span className="text-gray-400 text-sm">USD</span>
                      </div>

                      {/* Credits Display */}
                      <div className="mt-2">
                        <div className="text-blue-400 font-semibold">
                          {(product.credits + (product.promotional_credits || 0)).toLocaleString()} {characterCurrency.name}
                        </div>

                        {/* Show breakdown if promotional */}
                        {product.promotional_credits && product.promotional_credits > 0 && (
                          <div className="text-xs text-green-400 mt-1">
                            {product.credits.toLocaleString()} base
                            {product.bonus_credits && product.bonus_credits > 0 && (
                              <span> + {product.bonus_credits.toLocaleString()} bonus</span>
                            )}
                            <span className="text-yellow-400 font-bold"> + {product.promotional_credits.toLocaleString()} promo!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 text-sm text-gray-200">
                      <div className="flex items-center gap-2">
                        <span>✨</span>
                        <span>{(product.credits + (product.promotional_credits || 0)).toLocaleString()} credits</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>💳</span>
                        <span>Pay with credit card</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>⚡</span>
                        <span>Instant delivery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🔐</span>
                        <span>Secure license key</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchase(product)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                    >
                      {t('buyNow', locale.language)} →
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span>🛡️</span>
                  Secure & Easy Payments
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <span>💳</span>
                    <span>Credit/Debit Cards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔐</span>
                    <span>SSL Encrypted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⚡</span>
                    <span>Instant Redemption</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Spend Tab */}
          {activeTab === 'spend' && (
            <div className="space-y-6">
              {/* Show step 3 header if no subscription */}
              {!userBalance?.subscription && (
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-3">👑</div>
                  <h3 className="text-xl font-bold text-white mb-2">Step 3: Choose Your Subscription</h3>
                  <p className="text-gray-300 mb-4">
                    Use your {characterCurrency.name} to unlock unlimited messaging and all premium features!
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-purple-400">
                    <span>🚀 Instant Activation</span>
                    <span>•</span>
                    <span>💎 All Features Unlocked</span>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Spend Your {characterCurrency.name}</h3>
                <p className="text-gray-300">
                  Use your {characterCurrency.icon} {characterCurrency.name} for <span className="text-purple-400 font-semibold">🎤 voice messages (100 VC each)</span>, tips, gifts, and premium features!
                </p>
                {userBalance && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-2">
                    <span className="text-xl">{characterCurrency.icon}</span>
                    <span className="text-white font-semibold">
                      {userBalance.credits.toLocaleString()} available
                    </span>
                  </div>
                )}
              </div>

              {!userBalance || userBalance.credits === 0 ? (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">😔</div>
                  <h4 className="text-yellow-400 font-semibold mb-2">No {characterCurrency.name} Available</h4>
                  <p className="text-gray-300 mb-4">
                    You need {characterCurrency.name} to unlock premium features. Get some first!
                  </p>
                  <button
                    onClick={() => setActiveTab('purchase')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Get {characterCurrency.name} Now
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Show subscription requirement if no active subscription */}
                  {!userBalance.subscription && (
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                      <div className="text-center mb-4">
                        <div className="text-4xl mb-3">✨</div>
                        <h4 className="text-blue-400 font-semibold mb-2">Ready to unlock everything?</h4>
                        <p className="text-gray-300 mb-4">
                          Get unlimited messaging, voice messages, tips, and gifts with a subscription!
                        </p>
                      </div>

                      {/* First-time user flow guide */}
                      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                        <h5 className="text-white font-medium mb-3 text-center">🚀 Quick Start Guide</h5>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                            <div>
                              <div className="text-white font-medium">Buy {characterCurrency.name}</div>
                              <div className="text-gray-400">Purchase {characterCurrency.name} on Gumroad using the "Purchase" tab above</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                            <div>
                              <div className="text-white font-medium">Redeem Your License</div>
                              <div className="text-gray-400">Come back here and use the "Redeem" tab with your license key</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                            <div>
                              <div className="text-white font-medium">Get Your Subscription</div>
                              <div className="text-gray-400">Choose your plan below to unlock everything!</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <button
                          onClick={() => setActiveTab('purchase')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                          💳 Start: Buy {characterCurrency.name}
                        </button>
                        <button
                          onClick={() => setActiveTab('redeem')}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                          🎟️ Already Bought? Redeem
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Voice Messages - Available for all subscription types */}
                    {userBalance.subscription && (
                      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
                        <div className="text-center mb-4">
                          <div className="text-3xl mb-2">🎤</div>
                          <h4 className="text-white font-semibold">Voice Messages</h4>
                          <p className="text-gray-300 text-sm">Hear {characterDisplayName}'s voice in messages</p>
                        </div>
                        <div className="text-center mb-4">
                          <span className="text-2xl font-bold text-purple-400">100</span>
                          <span className="text-gray-400 ml-2">{characterCurrency.name} each</span>
                        </div>
                        <div className="text-center text-sm text-gray-400">
                          Voice messages are automatically enabled when you have sufficient VerseCoins
                        </div>
                      </div>
                    )}

                    {/* Tips - Available for all subscription types (Premium & Premium+) */}
                    {userBalance.subscription && (
                      <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-6">
                        <div className="text-center mb-4">
                          <div className="text-3xl mb-2">💕</div>
                          <h4 className="text-white font-semibold">Send Tips</h4>
                          <p className="text-gray-300 text-sm">Show appreciation with tips</p>
                        </div>
                        <div className="space-y-2 mb-4">
                          {[
                            { amount: 50, label: 'Sweet Tip' },
                            { amount: 100, label: 'Lovely Tip' },
                            { amount: 500, label: 'Generous Tip' },
                            { amount: 1000, label: 'Amazing Tip' }
                          ].map((tip) => (
                            <button
                              key={tip.amount}
                              onClick={() => handleSendTip(tip.amount)}
                              disabled={userBalance.credits < tip.amount || loading === 'tip'}
                              className="w-full bg-pink-600 hover:bg-pink-700 disabled:!bg-gray-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                              {loading === 'tip' ? 'Sending...' : `${tip.label} (${tip.amount} ${characterCurrency.name})`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gifts - Only available for Premium+ users */}
                    {userBalance.subscription?.tier === 'nsfw' ? (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
                        <div className="text-center mb-4">
                          <div className="text-3xl mb-2">🎁</div>
                          <h4 className="text-white font-semibold">Send Gifts</h4>
                          <p className="text-gray-300 text-sm">Surprise {characterDisplayName} with special gifts</p>
                        </div>
                        <div className="space-y-2 mb-4">
                          {(() => {
                            const { getCuratedCharacterGifts } = require('@/lib/characterGifts');
                            const characterGifts = getCuratedCharacterGifts(characterKey);
                            return characterGifts.map((gift: CharacterGift) => (
                              <button
                                key={gift.id}
                                onClick={() => handleSendGift(gift.id, gift.cost)}
                                disabled={userBalance.credits < gift.cost || loading === 'gift'}
                                className={`w-full text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm relative overflow-hidden ${
                                  gift.rarity === 'epic' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' :
                                  gift.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700' :
                                  gift.rarity === 'rare' ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' :
                                  'bg-green-600 hover:bg-green-700'
                                } disabled:!bg-gray-500 disabled:opacity-60 disabled:cursor-not-allowed`}
                                title={gift.description}
                              >
                                {loading === 'gift' ? 'Sending...' : `${gift.emoji} ${gift.name} (${gift.cost} ${characterCurrency.name})`}
                                {gift.rarity !== 'common' && (
                                  <span className="absolute top-0 right-0 text-xs px-1 py-0.5 bg-black/30 rounded-bl-md">
                                    {gift.rarity.toUpperCase()}
                                  </span>
                                )}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    ) : userBalance.subscription?.tier === 'sfw' ? (
                      /* Premium users see locked gift section with upgrade CTA */
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 relative opacity-60">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg"></div>
                        <div className="relative">
                          <div className="text-center mb-4">
                            <div className="text-3xl mb-2">🎁</div>
                            <h4 className="text-white font-semibold">Send Gifts</h4>
                            <p className="text-gray-300 text-sm">Premium+ Exclusive Feature</p>
                          </div>
                          <div className="space-y-2 mb-4">
                            {(() => {
                              const { getCuratedCharacterGifts, getCharacterGiftTheme } = require('@/lib/characterGifts');
                              const characterGifts = getCuratedCharacterGifts(characterKey);
                              return characterGifts.map((gift: CharacterGift) => (
                                <button
                                  key={gift.id}
                                  disabled={true}
                                  className="w-full bg-gray-600 cursor-not-allowed text-gray-400 font-medium py-2 px-4 rounded-lg text-sm relative"
                                  title={gift.description}
                                >
                                  {gift.emoji} {gift.name} ({gift.cost} {characterCurrency.name})
                                  {gift.rarity !== 'common' && (
                                    <span className="absolute top-0 right-0 text-xs px-1 py-0.5 bg-black/30 rounded-bl-md text-gray-500">
                                      {gift.rarity.toUpperCase()}
                                    </span>
                                  )}
                                </button>
                              ));
                            })()}
                          </div>
                          <div className="text-center">
                            <button
                              onClick={() => setActiveTab('spend')}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                            >
                              🚀 Upgrade to Premium+ to Send Gifts
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Plan Indicator */}
                    {userBalance.subscription && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                        <div className="text-center">
                          <div className="text-2xl mb-2">✅</div>
                          <h4 className="text-white font-semibold">Current Plan</h4>
                          <p className="text-green-400 font-medium">
                            {userBalance.subscription.tier_name || (userBalance.subscription.tier === 'sfw' ? 'Premium Pass' : 'Premium+ All Access Pass')}
                          </p>
                          <p className="text-gray-300 text-sm mt-1">
                            {userBalance.subscription.tier === 'sfw'
                              ? `Unlimited messaging & memory${userBalance.subscription.tier_name?.includes('Weekly') ? ' for 7 days' : ' for 30 days'}`
                              : `Everything in Premium + exclusive content${userBalance.subscription.tier_name?.includes('Weekly') ? ' for 7 days' : ' for 30 days'}`}
                          </p>
                          {userBalance.subscription.tier === 'sfw' && (
                            <div className="mt-3 text-xs text-gray-400">
                              💡 Upgrade to Premium+ for exclusive content & features
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Weekly Premium Pass - Show only if user has no subscription or can upgrade from it */}
                    {getAvailableSubscriptions(userBalance.subscription).includes('premium_weekly') && (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 relative">
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                            💚 WEEKLY
                          </span>
                        </div>
                        <div className="text-center mb-4">
                          <div className="text-3xl mb-2">👑</div>
                          <h4 className="text-white font-semibold">Premium Pass (Weekly)</h4>
                          <p className="text-gray-300 text-sm">Unlimited messaging & memory for 7 days</p>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="text-center">
                            {founderInfo?.is_founder ? (
                              <div>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <span className="text-xl line-through text-gray-500">500</span>
                                  <span className="text-2xl font-bold text-yellow-400">450</span>
                                  <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full font-bold">👑 FOUNDER</span>
                                </div>
                                <span className="text-gray-400 text-sm">{characterCurrency.name}/week • 50 {characterCurrency.name} saved!</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-2xl font-bold text-blue-400">500</span>
                                <span className="text-gray-400 ml-2">{characterCurrency.name}/week</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleSubscriptionPurchase('premium_weekly')}
                            disabled={userBalance.credits < (founderInfo?.is_founder ? 450 : 500) || loading === 'subscription'}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:!bg-gray-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                          >
                            {loading === 'subscription' ? 'Processing...' :
                             userBalance.credits < (founderInfo?.is_founder ? 450 : 500) ?
                               `Need ${(founderInfo?.is_founder ? 450 : 500) - userBalance.credits} more ${characterCurrency.name}` :
                               'Get Weekly Premium'}
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 text-center">
                          💚 7 days access • Perfect starter option
                        </div>
                      </div>
                    )}

                    {/* Weekly Premium+ All Access Pass - Show only if user can upgrade to it */}
                    {getAvailableSubscriptions(userBalance.subscription).includes('premium_plus_weekly') && (
                      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 relative">
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-green-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                            💚 WEEKLY ALL ACCESS
                          </span>
                        </div>
                        <div className="text-center mb-4">
                          <div className="text-3xl mb-2">💎</div>
                          <h4 className="text-white font-semibold">Premium+ All Access (Weekly)</h4>
                          <p className="text-gray-300 text-sm">Everything + exclusive content for 7 days</p>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="text-center">
                            {founderInfo?.is_founder ? (
                              <div>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <span className="text-xl line-through text-gray-500">833</span>
                                  <span className="text-2xl font-bold text-yellow-400">750</span>
                                  <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full font-bold">👑 FOUNDER</span>
                                </div>
                                <span className="text-gray-400 text-sm">{characterCurrency.name}/week • 83 {characterCurrency.name} saved!</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-2xl font-bold text-purple-400">833</span>
                                <span className="text-gray-400 ml-2">{characterCurrency.name}/week</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setPendingAdultTier('premium_plus_weekly');
                              setShowAdultWarning(true);
                            }}
                            disabled={userBalance.credits < (founderInfo?.is_founder ? 750 : 833) || loading === 'subscription'}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:!bg-gray-500 disabled:!bg-none disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-gray-500 disabled:hover:to-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                          >
                            {loading === 'subscription' ? 'Processing...' :
                             userBalance.credits < (founderInfo?.is_founder ? 750 : 833) ?
                               `Need ${(founderInfo?.is_founder ? 750 : 833) - userBalance.credits} more ${characterCurrency.name}` :
                               'Get Weekly All Access'}
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 text-center space-y-1">
                          <div>💚 7 days everything • Perfect for exploring</div>
                          <div className="text-pink-400">📸 Private photo gallery • 💬 NSFW conversations • 🎁 Send gifts</div>
                        </div>
                      </div>
                    )}

                    {/* Premium Pass (Monthly) - Show only if user can upgrade to it */}
                    {getAvailableSubscriptions(userBalance.subscription).includes('premium') && (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                        <div className="text-center mb-4">
                          <div className="text-3xl mb-2">👑</div>
                          <h4 className="text-white font-semibold">Premium Pass (Monthly)</h4>
                          <p className="text-gray-300 text-sm">Unlimited messaging & memory for 30 days</p>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="text-center">
                            {founderInfo?.is_founder ? (
                              <div>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <span className="text-xl line-through text-gray-500">1500</span>
                                  <span className="text-2xl font-bold text-yellow-400">1350</span>
                                  <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full font-bold">👑 FOUNDER</span>
                                </div>
                                <span className="text-gray-400 text-sm">{characterCurrency.name}/month • 150 {characterCurrency.name} saved!</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-2xl font-bold text-blue-400">1500</span>
                                <span className="text-gray-400 ml-2">{characterCurrency.name}/month</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleSubscriptionPurchase('premium')}
                            disabled={userBalance.credits < (founderInfo?.is_founder ? 1350 : 1500) || loading === 'subscription'}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:!bg-gray-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                          >
                            {loading === 'subscription' ? 'Processing...' :
                             userBalance.credits < (founderInfo?.is_founder ? 1350 : 1500) ?
                               `Need ${(founderInfo?.is_founder ? 1350 : 1500) - userBalance.credits} more ${characterCurrency.name}` :
                               'Get Premium Pass'}
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 text-center">
                          ✨ Unlimited messages, persistent memory, priority support
                        </div>
                      </div>
                    )}

                  {/* Premium+ All Access Pass (Monthly) - Show only if user can upgrade to it */}
                  {getAvailableSubscriptions(userBalance.subscription).includes('premium_plus') && (
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 relative">
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                          {userBalance.subscription?.tier === 'sfw' ? '💎 MONTHLY ALL ACCESS' : '⭐ ALL ACCESS'}
                        </span>
                      </div>
                      <div className="text-center mb-4">
                        <div className="text-3xl mb-2">💎</div>
                        <h4 className="text-white font-semibold">Premium+ All Access Pass (Monthly)</h4>
                        <p className="text-gray-300 text-sm">
                          {userBalance.subscription?.tier === 'sfw'
                            ? 'Upgrade to unlock exclusive content for 30 days'
                            : 'Everything in Premium + exclusive content for 30 days'}
                        </p>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="text-center">
                          {founderInfo?.is_founder ? (
                            <div>
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-xl line-through text-gray-500">2500</span>
                                <span className="text-2xl font-bold text-yellow-400">2250</span>
                                <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full font-bold">👑 FOUNDER</span>
                              </div>
                              <span className="text-gray-400 text-sm">{characterCurrency.name}/month • 250 {characterCurrency.name} saved!</span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-2xl font-bold text-purple-400">2500</span>
                              <span className="text-gray-400 ml-2">{characterCurrency.name}/month</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setPendingAdultTier('premium_plus');
                            setShowAdultWarning(true);
                          }}
                          disabled={
                            loading === 'subscription' ||
                            (upgradePreview && !upgradePreview.sufficient_funds) ||
                            (!upgradePreview && userBalance.credits < (founderInfo?.is_founder ? 2250 : 2500))
                          }
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:!bg-gray-500 disabled:!bg-none disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-gray-500 disabled:hover:to-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          {loading === 'subscription' ? 'Processing...' :
                           upgradePreview ? (
                             upgradePreview.sufficient_funds ? (
                               upgradePreview.scenario === 'upgrade' ?
                                 `🚀 Upgrade for ${upgradePreview.final_cost} ${userBalance.character_display.name}` :
                                 upgradePreview.scenario === 'already_subscribed' ?
                                   'Already Subscribed' :
                                   `Get All Access - ${upgradePreview.final_cost} ${userBalance.character_display.name}`
                             ) : (
                               `Need ${upgradePreview.final_cost - upgradePreview.current_balance} more ${userBalance.character_display.name}`
                             )
                           ) : (
                             userBalance.subscription?.tier === 'sfw' ? '🚀 Upgrade to All Access' : 'Get All Access Pass'
                           )}
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 text-center space-y-1">
                        <div>🔥 Everything in Premium + exclusive content & features</div>
                        <div className="text-pink-400">📸 Private photo gallery • 💬 NSFW conversations • 🎁 Send gifts</div>
                      </div>
                    </div>
                  )}

                  {/* Founder's Circle Information for non-founders */}
                  {!founderInfo?.is_founder && founderInfo?.character_stats?.is_available && (
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-6 mt-6">
                      <div className="text-center mb-4">
                        <div className="text-3xl mb-2">⭐</div>
                        <h4 className="text-white font-semibold">Founder's Circle</h4>
                        <p className="text-gray-300 text-sm">Limited time opportunity for the first 100 subscribers</p>
                      </div>
                      <div className="space-y-3 text-sm text-gray-300">
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400">🎯</span>
                          <span>Locked pricing for life - no price increases ever</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400">💰</span>
                          <span>10% discount on all subscription plans</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400">🎁</span>
                          <span>500 {characterCurrency.name} bonus when you subscribe</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400">👑</span>
                          <span>Exclusive founder badge and recognition</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-amber-500/20 text-center">
                        <div className="text-amber-400 font-medium">
                          {founderInfo?.character_stats?.spots_remaining || 0} spots remaining
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Founder status is automatically granted when you subscribe
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Founder's Circle Information for current founders */}
                  {founderInfo?.is_founder && (
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-6 mt-6">
                      <div className="text-center mb-4">
                        <div className="text-3xl mb-2">👑</div>
                        <h4 className="text-white font-semibold">You're a Founder!</h4>
                        <p className="text-amber-400 text-sm font-medium">Exclusive member of the Founder's Circle</p>
                      </div>
                      <div className="space-y-3 text-sm text-gray-300">
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400">💰</span>
                          <span>10% discount on all subscriptions (automatically applied)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400">🔒</span>
                          <span>Locked pricing for life - protected from future price increases</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400">👑</span>
                          <span>Exclusive founder badge on all purchases</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-amber-500/20 text-center">
                        <div className="text-amber-400 text-xs">
                          Thank you for being one of our first 100 subscribers!
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Redeem Tab */}
          {activeTab === 'redeem' && (
            <div className="space-y-6">
              {/* Redeem flow explanation */}
              <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-6 text-center">
                <div className="text-3xl mb-3">🎟️</div>
                <h3 className="text-xl font-bold text-white mb-2">Step 2: Redeem Your License</h3>
                <p className="text-gray-300 mb-4">
                  Enter the license key from your Gumroad purchase to add {characterCurrency.name} to your account.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                  <span>✅ Instant Credit</span>
                  <span>•</span>
                  <span>🚀 Ready for Subscription</span>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Enter Your License Key</h3>
                <p className="text-gray-300 mb-6">
                  Paste the license key you received in your Gumroad email receipt.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      License Key
                    </label>
                    <input
                      type="text"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      placeholder="Enter your license key (e.g., ABC123-DEF456-GHI789)"
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      ✨ We'll automatically detect which product this key is for
                    </p>
                  </div>

                  <button
                    onClick={handleRedeem}
                    disabled={!!loading || !licenseKey.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    {loading === 'redeem' ? 'Redeeming...' : 'Redeem License Key'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">How to Find Your License Key</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <span>1.</span>
                    <span>Check your email receipt from Gumroad</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>2.</span>
                    <span>Look for "License Key" or "Product Key" in the email</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>3.</span>
                    <span>You can also find it in your Gumroad library</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Balance Tab */}
          {activeTab === 'balance' && (
            <div className="space-y-6">
              {userBalance ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">{characterCurrency.icon}</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {userBalance.credits.toLocaleString()}
                      </div>
                      <div className="text-gray-300">Current Balance</div>
                    </div>

                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">📈</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {userBalance.total_earned.toLocaleString()}
                      </div>
                      <div className="text-gray-300">Total Earned</div>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">💸</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {userBalance.total_spent.toLocaleString()}
                      </div>
                      <div className="text-gray-300">Total Spent</div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">What You Can Do</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎤</span>
                          <div>
                            <div className="text-white font-medium">Voice Messages</div>
                            <div className="text-gray-400">100 {characterCurrency.name} each</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">💝</span>
                          <div>
                            <div className="text-white font-medium">Send Gifts</div>
                            <div className="text-gray-400">200-1500 {characterCurrency.name}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">💰</span>
                          <div>
                            <div className="text-white font-medium">Tips</div>
                            <div className="text-gray-400">50-1000+ {characterCurrency.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">💎</span>
                          <div>
                            <div className="text-white font-medium">Premium Features</div>
                            <div className="text-gray-400">1500-2500 {characterCurrency.name}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💰</div>
                  <h3 className="text-xl font-bold text-white mb-2">Loading Balance...</h3>
                  <p className="text-gray-300">Please wait while we fetch your VerseCoins balance.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              {t('close', locale.language)}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            Payments processed securely by Gumroad.
            VerseCoins are activated immediately upon license redemption.
          </p>
        </div>
      </div>

      {/* Adult Content Warning Modal */}
      {showAdultWarning && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6 relative">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔞</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Adult Content Warning
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Premium+ All Access includes adult/NSFW content and features.
                By continuing, you confirm that you are 18+ years of age and
                consent to accessing adult content.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAdultWarning(false);
                  if (pendingAdultTier) {
                    handleSubscriptionPurchase(pendingAdultTier);
                    setPendingAdultTier(null);
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                ✅ I am 18+ and want to continue
              </button>

              <button
                onClick={() => {
                  setShowAdultWarning(false);
                  setPendingAdultTier(null);
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                ❌ Cancel
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              This upgrade cannot be refunded. Please ensure you meet age requirements.
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}