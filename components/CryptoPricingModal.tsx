'use client';

import React, { useState } from 'react';
import { getCryptoPricingTiersByType, getOriginalPrice } from '@/lib/cryptoPricing';

interface CryptoPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  characterKey: string;
  characterDisplayName: string;
  userEmail?: string;
  defaultTab?: 'subscription' | 'voice_pack' | 'tip';
  // User's current subscription status
  hasBasicSubscription?: boolean;
  hasPremiumSubscription?: boolean;
  subscriptionExpiring?: boolean; // Show re-sub options if expiring soon
}

export default function CryptoPricingModal({
  isOpen,
  onClose,
  userId,
  characterKey,
  characterDisplayName,
  userEmail,
  defaultTab = 'subscription',
  hasBasicSubscription = false,
  hasPremiumSubscription = false,
  subscriptionExpiring = false
}: CryptoPricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subscription' | 'voice_pack' | 'tip'>(defaultTab);

  const handlePurchase = async (tierId: string) => {
    setLoading(tierId);
    setError(null);

    try {
      console.log('🚀 Creating crypto charge for:', { userId, characterKey, tierId });

      const response = await fetch('/api/crypto/create-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          characterKey,
          tierId,
          userEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      console.log('✅ Crypto charge created:', data);

      // Mobile-friendly redirect to Coinbase Commerce
      if (data.charge?.hosted_url) {
        // Use window.location for mobile compatibility instead of popup
        // This works better on mobile devices where popups are often blocked
        window.location.href = data.charge.hosted_url;
      } else {
        throw new Error('No payment URL received');
      }

    } catch (err) {
      console.error('❌ Crypto payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  const allSubscriptionTiers = getCryptoPricingTiersByType('subscription');
  const voicePackTiers = getCryptoPricingTiersByType('voice_pack');
  const tipTiers = getCryptoPricingTiersByType('tip');

  // Filter out subscription tiers user already has (unless expiring and needs renewal)
  const subscriptionTiers = allSubscriptionTiers.filter(tier => {
    // Basic subscription (id: 'basic_crypto')
    if (tier.id === 'basic_crypto' && hasBasicSubscription && !subscriptionExpiring) {
      return false; // Hide if user has basic sub and it's not expiring
    }

    // Premium subscription (id: 'premium_crypto')
    if (tier.id === 'premium_crypto' && hasPremiumSubscription && !subscriptionExpiring) {
      return false; // Hide if user has premium sub and it's not expiring
    }

    return true; // Show tier if user doesn't have it or it's expiring
  });

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'subscription': return 'Subscriptions';
      case 'voice_pack': return 'Voice Packs';
      case 'tip': return 'Tips';
      default: return '';
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'subscription': return '💎';
      case 'voice_pack': return '🎤';
      case 'tip': return '💰';
      default: return '';
    }
  };

  const currentTiers = activeTab === 'subscription' ? subscriptionTiers :
                      activeTab === 'voice_pack' ? voicePackTiers : tipTiers;

  const getFeatureIcon = (feature: string, tab: string) => {
    if (feature.includes('30-day access')) return '⚡';
    if (feature.includes('Basic chat')) return '💬';
    if (feature.includes('Standard emotional')) return '🎭';
    if (feature.includes('Early adopter')) return '₿';
    if (feature.includes('NSFW')) return '🔞';
    if (feature.includes('Advanced emotional')) return '🧠';
    if (feature.includes('Voice messages')) return '🎤';
    if (feature.includes('Priority')) return '⭐';
    if (feature.includes('voice messages')) return '🎵';
    if (feature.includes('Instant delivery')) return '⚡';
    if (feature.includes('No expiration')) return '∞';
    if (feature.includes('Best value')) return '💫';
    if (feature.includes('Maximum value')) return '🚀';
    if (feature.includes('Show your appreciation')) return '💖';
    if (feature.includes('Boost relationship')) return '📈';
    if (feature.includes('Major relationship')) return '🔥';
    if (feature.includes('Popular choice')) return '⭐';
    if (feature.includes('VIP treatment')) return '👑';
    return '✨';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]">
      <div className="max-w-4xl w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <span className="text-orange-500">₿</span>
              Crypto Early Adopter Store
            </h2>
            <p className="text-gray-300">
              Pay with cryptocurrency and get 30% off everything for {characterDisplayName}!
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <div className="flex bg-gray-800 rounded-xl p-1">
              {(['subscription', 'voice_pack', 'tip'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-2">{getTabIcon(tab)}</span>
                  {getTabTitle(tab)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Show message if no subscription tiers available */}
            {activeTab === 'subscription' && currentTiers.length === 0 && (
              <div className="col-span-full bg-green-900/20 border border-green-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  You're All Set!
                </h3>
                <p className="text-gray-300 mb-4">
                  {hasPremiumSubscription
                    ? "You already have a Premium subscription with full access to all features."
                    : "You already have an active subscription."
                  }
                </p>
                <p className="text-sm text-gray-400">
                  {subscriptionExpiring
                    ? "Your subscription is expiring soon. Renewal options will appear here when needed."
                    : "Check out Voice Packs or Tips to enhance your experience!"}
                </p>
              </div>
            )}

            {currentTiers.map((tier, index) => {
              const originalPrice = getOriginalPrice(tier.price, tier.cryptoDiscount);
              const isPopular = activeTab === 'subscription' && index === 1; // Premium subscription
              const isVoiceBest = activeTab === 'voice_pack' && index === 1; // 25-pack
              const isTipPopular = activeTab === 'tip' && index === 1; // $10 tip

              const borderColor = activeTab === 'subscription' ? (index === 0 ? 'border-blue-500/30 bg-blue-900/10' : 'border-purple-500/30 bg-purple-900/10') :
                                  activeTab === 'voice_pack' ? 'border-green-500/30 bg-green-900/10' :
                                  'border-yellow-500/30 bg-yellow-900/10';

              return (
                <div key={tier.id} className={`border ${borderColor} rounded-xl p-6 hover:scale-105 transition-transform relative`}>
                  {(isPopular || isVoiceBest || isTipPopular) && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
                        {isPopular ? '👑 POPULAR' : isVoiceBest ? '💫 BEST VALUE' : '⭐ POPULAR'}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-white">${tier.price}</span>
                      <span className="text-gray-400 text-sm">USD</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-gray-400 line-through text-sm">${originalPrice.toFixed(2)}</span>
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">{tier.cryptoDiscount}% OFF</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {tier.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2 text-sm text-gray-200">
                        <span>{getFeatureIcon(feature, activeTab)}</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePurchase(tier.id)}
                    disabled={!!loading}
                    className={`w-full font-semibold py-3 px-4 rounded-xl transition-colors ${
                      activeTab === 'subscription'
                        ? (index === 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700')
                        : activeTab === 'voice_pack'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    } text-white`}
                  >
                    {loading === tier.id ? 'Redirecting to Payment...' : 'Pay with Crypto →'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <span>₿</span>
              Why Crypto Payments?
            </h4>
            <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <span>🛡️</span>
                <span>Private & Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span>Instant Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span>Early Adopter Pricing</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            Payment processed securely by Coinbase Commerce.
            Your subscription will activate automatically upon payment confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}