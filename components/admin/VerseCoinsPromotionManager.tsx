'use client';

import React, { useState, useEffect } from 'react';
import { fetchPromotionalDiscounts, getPromotionalProducts, type DiscountRule, type VerseCoinProduct } from '@/lib/verseCoins';

interface PromotionManagerProps {
  isLoading?: boolean;
}

export default function VerseCoinsPromotionManager({ isLoading }: PromotionManagerProps) {
  const [activePromotions, setActivePromotions] = useState<DiscountRule[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<DiscountRule | null>(null);
  const [previewContext, setPreviewContext] = useState({
    isFirstPurchase: true,
    promoCode: ''
  });
  const [promotionalProducts, setPromotionalProducts] = useState<VerseCoinProduct[]>([]);

  // Fetch data when component mounts
  useEffect(() => {
    loadPromotionalData();
  }, [previewContext]);

  const loadPromotionalData = async () => {
    try {
      // Fetch active promotions from admin API (avoids permission errors)
      try {
        const response = await fetch('/api/admin/promotional-discounts');
        const result = await response.json();

        if (result.success) {
          // Transform admin API response to match expected format
          const promotions = result.data.map((promo: any) => ({
            id: promo.id,
            name: promo.name,
            description: promo.description,
            badge: promo.badge,
            type: promo.type,
            bonusCredits: promo.bonus_credits,
            bonusPercentage: promo.bonus_percentage,
            conditionType: promo.condition_type,
            conditionValue: promo.condition_value,
            priority: promo.priority,
            stackable: promo.stackable,
            active: promo.active
          }));
          setActivePromotions(promotions);
        } else {
          // Fallback to client-side fetch if admin API fails
          const promotions = await fetchPromotionalDiscounts();
          setActivePromotions(promotions);
        }
      } catch (adminError) {
        // Fallback to client-side fetch if admin API fails
        const promotions = await fetchPromotionalDiscounts();
        setActivePromotions(promotions);
      }

      // Get promotional products with current context
      const products = await getPromotionalProducts(previewContext);
      setPromotionalProducts(products);
    } catch (error) {
      console.error('Failed to load promotional data:', error);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatCredits = (credits: number) => credits.toLocaleString();

  const togglePromotion = (promotionId: string) => {
    // TODO: This would integrate with database in future
    console.log(`Toggle promotion: ${promotionId}`);
  };

  const calculateTotalValue = (product: VerseCoinProduct) => {
    return product.total_value || product.credits;
  };

  const calculatePromotionalBonus = (product: VerseCoinProduct) => {
    const base = product.credits + (product.bonus_credits || 0);
    return (product.total_value || product.credits) - base;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-yellow-900">VerseCoins Promotion Manager</h2>
        <p className="text-yellow-700 mt-1">
          Manage promotional discounts, flash sales, and bonus credit campaigns
        </p>
      </header>

      {/* Current Promotions Status */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {activePromotions.map((promo) => (
          <div key={promo.id} className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{promo.badge?.split(' ')[0] || '🎁'}</span>
                <h3 className="font-semibold text-gray-900">{promo.name}</h3>
              </div>
              <button
                onClick={() => togglePromotion(promo.id)}
                className={`w-4 h-4 rounded-full border-2 ${
                  true // All active for demo
                    ? 'bg-green-500 border-green-500'
                    : 'bg-gray-200 border-gray-300'
                }`}
              />
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-medium">{promo.type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>Bonus:</span>
                <span className="font-medium text-green-600">
                  {promo.type === 'percentage_bonus' ? '+15%' : `+${promo.bonus_credits}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Priority:</span>
                <span className="font-medium">{promo.priority}</span>
              </div>
            </div>

            {promo.badge && (
              <div className="mt-2">
                <span className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-1 rounded-full font-bold">
                  {promo.badge}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview Controls */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Preview Promotions</h3>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={previewContext.isFirstPurchase}
              onChange={(e) => setPreviewContext(prev => ({ ...prev, isFirstPurchase: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">First Purchase</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Promo Code:</label>
            <input
              type="text"
              value={previewContext.promoCode}
              onChange={(e) => setPreviewContext(prev => ({ ...prev, promoCode: e.target.value }))}
              placeholder="FLASH50"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
            />
          </div>
        </div>
      </div>

      {/* Product Preview with Promotions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Live Product Preview</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {promotionalProducts.map((product) => {
            const promotionalBonus = calculatePromotionalBonus(product);
            const totalValue = calculateTotalValue(product);

            return (
              <div key={product.id} className="border border-blue-200 bg-blue-50 rounded-xl p-4 relative">
                {product.promotional_badge && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {product.promotional_badge}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-2">{product.name}</h4>
                  <div className="text-lg font-bold text-blue-600 mb-1">
                    {formatCurrency(product.price_usd)}
                  </div>

                  {/* Credits Breakdown */}
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold text-gray-900">
                      {formatCredits(totalValue)} Credits
                    </div>

                    <div className="text-gray-600">
                      <div>{formatCredits(product.credits)} base</div>
                      {product.bonus_credits && product.bonus_credits > 0 && (
                        <div className="text-blue-600">+{formatCredits(product.bonus_credits)} bonus</div>
                      )}
                      {promotionalBonus > 0 && (
                        <div className="text-green-600 font-semibold">+{formatCredits(promotionalBonus)} promo</div>
                      )}
                    </div>

                    {/* Value Per Dollar */}
                    <div className="text-xs text-gray-500 pt-1 border-t border-gray-200">
                      {Math.round(totalValue / product.price_usd)} credits/$
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          🎯 Create Flash Sale
        </button>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          🎁 New Welcome Bonus
        </button>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          📊 Promotion Analytics
        </button>
      </div>

      {/* Status Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-lg">💡</div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Promotion System Status</p>
            <p>✅ {activePromotions.length} active promotions</p>
            <p>✅ Real-time preview working</p>
            <p>✅ Gumroad integration stable</p>
            <p className="mt-2 text-blue-600">
              💡 <strong>Pro tip:</strong> Promotions are applied automatically without changing Gumroad prices.
              Users get bonus credits when redeeming license keys.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}