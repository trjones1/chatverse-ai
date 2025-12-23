import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OrdersService } from '@/lib/ordersService';
import { getFounderInfo, applyFounderDiscount } from '@/lib/foundersCircle';
import { emailService, ReceiptData, PurchaseItem } from '@/lib/emailService';
import { logger } from '@/lib/logger';
import { adminNotifications } from '@/lib/adminNotifications';

export async function POST(request: NextRequest) {
  try {
    const { characterKey, tierType = 'premium' } = await request.json();

    if (!characterKey) {
      return NextResponse.json(
        { error: 'Character key is required' },
        { status: 400 }
      );
    }

    if (!['premium', 'premium_plus', 'premium_weekly', 'premium_plus_weekly'].includes(tierType)) {
      return NextResponse.json(
        { error: 'Invalid tier type. Must be "premium", "premium_plus", "premium_weekly", or "premium_plus_weekly"' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('Processing VerseCoins subscription purchase', {
      userId: user.id,
      characterKey,
      tierType
    });

    const adminSupabase = getSupabaseAdmin();
    const ordersService = new OrdersService();

    // Define subscription costs and details
    const tierConfig = {
      premium: { cost: 1500, tier: 'sfw', name: 'Premium Pass', duration: 30 },
      premium_plus: { cost: 2500, tier: 'nsfw', name: 'Premium+ All Access Pass', duration: 30 },
      premium_weekly: { cost: 500, tier: 'sfw', name: 'Weekly Premium Pass', duration: 7 },
      premium_plus_weekly: { cost: 833, tier: 'nsfw', name: 'Weekly Premium+ Pass', duration: 7 }
    };

    const selectedTier = tierConfig[tierType as keyof typeof tierConfig];
    const subscriptionDuration = selectedTier.duration;

    // Check if user is a founder and apply locked pricing
    const founderInfo = await getFounderInfo(user.id, characterKey);
    const costType = (tierType === 'premium' || tierType === 'premium_weekly') ? 'versecoins_sfw_cost' : 'versecoins_nsfw_cost';
    const pricingResult = applyFounderDiscount(selectedTier.cost, costType, founderInfo);

    const subscriptionCost = pricingResult.cost;
    const isFounderPrice = pricingResult.is_founder_price;
    const founderSavings = pricingResult.savings;

    logger.debug('Founder pricing check', {
      userId: user.id,
      characterKey,
      tierType,
      isFounder: founderInfo?.is_founder || false,
      founderNumber: founderInfo?.founder_number || null,
      originalCost: selectedTier.cost,
      founderCost: subscriptionCost,
      savings: founderSavings,
      isFounderPrice
    });

    try {
      // 1. Check current user VerseCoins balance
      let { data: userCoins, error: fetchError } = await adminSupabase
        .from('user_versecoins')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // Not found
          return NextResponse.json(
            { error: 'No VerseCoins balance found' },
            { status: 400 }
          );
        }
        throw fetchError;
      }

      const currentCredits = userCoins?.credits || 0;

      // 2. Check for existing active subscription for this character (moved up to calculate proration first)
      const { data: existingSubscription, error: subCheckError } = await adminSupabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('character_key', characterKey)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .single();

      if (subCheckError && subCheckError.code !== 'PGRST116') {
        throw subCheckError;
      }

      let proRatedCost = subscriptionCost;
      let isUpgrade = false;
      let isDowngrade = false;
      let refundAmount = 0;

      if (existingSubscription) {
        // Determine if existing subscription is weekly by checking tier_name in features or main field
        const tierName = existingSubscription.features?.tier_name || existingSubscription.tier_name;
        const isExistingWeekly = tierName?.includes('Weekly') ||
                                (existingSubscription.created_at && existingSubscription.current_period_end &&
                                 Math.ceil((new Date(existingSubscription.current_period_end).getTime() - new Date(existingSubscription.created_at).getTime()) / (1000 * 60 * 60 * 24)) <= 7);

        let existingTierType: keyof typeof tierConfig;
        if (existingSubscription.tier === 'nsfw') {
          existingTierType = isExistingWeekly ? 'premium_plus_weekly' : 'premium_plus';
        } else {
          existingTierType = isExistingWeekly ? 'premium_weekly' : 'premium';
        }

        const existingTierConfig = tierConfig[existingTierType];

        // Calculate remaining days in existing subscription
        const now = new Date();
        const subscriptionEnd = new Date(existingSubscription.current_period_end);
        const remainingDays = Math.max(0, Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        if (existingTierType === tierType) {
          return NextResponse.json(
            { error: `You already have an active ${selectedTier.name} subscription for ${characterKey}` },
            { status: 400 }
          );
        }

        // Calculate prorated costs using founder-adjusted pricing
        const dailyCostExisting = existingTierConfig.cost / existingTierConfig.duration; // Use actual duration
        const dailyCostNew = subscriptionCost / selectedTier.duration; // Use founder-adjusted cost for new tier
        const remainingValueExisting = Math.floor(dailyCostExisting * remainingDays);

        // Determine if this is an upgrade or downgrade
        const isUpgradeScenario = (
          // SFW to NSFW upgrades (any duration)
          (tierType === 'premium_plus' && (existingTierType === 'premium' || existingTierType === 'premium_weekly' || existingTierType === 'premium_plus_weekly')) ||
          (tierType === 'premium_plus_weekly' && (existingTierType === 'premium' || existingTierType === 'premium_weekly')) ||
          // Duration upgrades (weekly to monthly within same tier)
          (tierType === 'premium' && existingTierType === 'premium_weekly')
        );

        const isDowngradeScenario = (
          // NSFW to SFW downgrades (any duration)
          (tierType === 'premium' && (existingTierType === 'premium_plus' || existingTierType === 'premium_plus_weekly')) ||
          (tierType === 'premium_weekly' && (existingTierType === 'premium_plus' || existingTierType === 'premium_plus_weekly'))
        );

        if (isUpgradeScenario) {
          // Upgrade: charge difference for remaining days
          isUpgrade = true;
          const upgradeDifference = Math.floor((dailyCostNew - dailyCostExisting) * remainingDays);
          proRatedCost = upgradeDifference;

          logger.debug('Upgrade scenario', {
            remainingDays,
            dailyCostExisting,
            dailyCostNew,
            upgradeDifference,
            proRatedCost
          });
        } else if (isDowngradeScenario) {
          // Downgrade: refund difference, end current subscription at natural expiry
          isDowngrade = true;
          refundAmount = remainingValueExisting;
          proRatedCost = 0; // No charge for downgrade, just end at natural expiry

          logger.debug('Downgrade scenario', {
            remainingDays,
            remainingValueExisting,
            refundAmount
          });
        }

        // Mark existing subscription for upgrade/downgrade - will be updated later
        logger.debug('Existing subscription will be updated', {
          existingId: existingSubscription.id,
          currentTier: existingSubscription.tier,
          targetTier: selectedTier.tier
        });
      }

      // Check if user has sufficient balance for prorated cost
      if (currentCredits < proRatedCost) {
        return NextResponse.json(
          {
            error: 'Insufficient VerseCoins balance',
            required: proRatedCost,
            available: currentCredits
          },
          { status: 400 }
        );
      }

      let newBalance = currentCredits - proRatedCost + refundAmount;

      // 4. Update user balance
      const { error: updateError } = await adminSupabase
        .from('user_versecoins')
        .update({
          credits: newBalance,
          total_spent: (userCoins?.total_spent || 0) + proRatedCost,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // 5. Record VerseCoins transactions
      const transactions = [];

      // Debit transaction for new subscription
      if (proRatedCost > 0) {
        transactions.push({
          user_id: user.id,
          type: 'debit',
          amount: -proRatedCost,
          balance_after: newBalance,
          description: `${selectedTier.name} subscription purchase for ${characterKey}${isUpgrade ? ' (upgrade)' : ''}${isFounderPrice ? ' (🏆 Founder Pricing)' : ''}`,
          reference_type: 'subscription_purchase',
          reference_id: null,
          metadata: {
            characterKey,
            tierType,
            tier_name: selectedTier.name,
            duration_days: subscriptionDuration,
            is_upgrade: isUpgrade,
            is_downgrade: isDowngrade,
            original_cost: selectedTier.cost,
            prorated_cost: proRatedCost,
            // Founder information
            is_founder: founderInfo?.is_founder || false,
            founder_number: founderInfo?.founder_number || null,
            is_founder_price: isFounderPrice,
            founder_savings: founderSavings
          }
        });
      }

      // Refund transaction for downgrade
      if (refundAmount > 0) {
        transactions.push({
          user_id: user.id,
          type: 'credit',
          amount: refundAmount,
          balance_after: newBalance,
          description: `Refund for downgrade from Premium+ to Premium for ${characterKey}`,
          reference_type: 'subscription_refund',
          reference_id: null,
          metadata: {
            characterKey,
            refund_amount: refundAmount,
            reason: 'downgrade_refund'
          }
        });
      }

      if (transactions.length > 0) {
        const { error: transactionError } = await adminSupabase
          .from('versecoins_transactions')
          .insert(transactions);

        if (transactionError) {
          throw transactionError;
        }
      }

      // 6. Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + subscriptionDuration);

      // 7. Create or update subscription record
      let subscriptionError;

      if (existingSubscription) {
        // Update existing subscription for upgrade/downgrade
        logger.debug('Updating existing subscription', {
          subscriptionId: existingSubscription.id,
          newTier: selectedTier.tier,
          newEndDate: endDate.toISOString()
        });

        const { error } = await adminSupabase
          .from('user_subscriptions')
          .update({
            tier: (tierType === 'premium_plus' || tierType === 'premium_plus_weekly') ? 'nsfw' : 'sfw',
            current_period_end: endDate.toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
            features: {
              ...existingSubscription.features,
              payment_method: 'versecoins',
              versecoins_amount: proRatedCost,
              tier_name: selectedTier.name,
              is_upgrade: isUpgrade,
              is_downgrade: isDowngrade,
              last_upgrade_date: isUpgrade ? startDate.toISOString() : existingSubscription.features?.last_upgrade_date,
              last_downgrade_date: isDowngrade ? startDate.toISOString() : existingSubscription.features?.last_downgrade_date
            }
          })
          .eq('id', existingSubscription.id);

        subscriptionError = error;
      } else {
        // Create new subscription
        logger.info('Creating new subscription', {
          userId: user.id,
          characterKey,
          tier: selectedTier.tier
        });

        const { error } = await adminSupabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            character_key: characterKey,
            stripe_subscription_id: `versecoins_${Date.now()}_${user.id.substring(0, 8)}`,
            stripe_customer_id: user.id, // Use user_id as customer_id for VerseCoins
            tier: (tierType === 'premium_plus' || tierType === 'premium_plus_weekly') ? 'nsfw' : 'sfw',
            started_at: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            status: 'active',
            price_id: null, // No Stripe price for VerseCoins
            email: user.email,
            features: {
              payment_method: 'versecoins',
              versecoins_amount: proRatedCost,
              tier_name: selectedTier.name,
              is_upgrade: false,
              is_downgrade: false
            }
          });

        subscriptionError = error;
      }

      if (subscriptionError) {
        throw subscriptionError;
      }

      // 8. Check Founders Circle eligibility (for first-time subscribers only, not upgrades)
      let founderResult = null;
      if (!existingSubscription) {
        try {
          logger.debug('Checking Founders Circle eligibility for new VerseCoins subscription:', {
            userId: user.id,
            characterKey,
            tierType
          });

        const { data: newFounderResult, error: founderError } = await adminSupabase.rpc('add_founder_if_eligible', {
          p_user_id: user.id,
          p_character_key: characterKey,
          p_subscription_data: {
            versecoins_subscription_id: `versecoins_${Date.now()}_${user.id.substring(0, 8)}`,
            tier_type: tierType,
            tier_name: selectedTier.name,
            amount: proRatedCost,
            currency: 'versecoins',
            subscription_type: 'versecoins_subscription'
          }
        });

        if (founderError) {
          logger.error('Founders Circle check failed', founderError);
        } else {
          logger.debug('Founders Circle result', newFounderResult);
          founderResult = newFounderResult;

          // Grant founder bonus if they became a new founder
          if (newFounderResult?.is_founder && newFounderResult?.reason === 'new_founder') {
            logger.info(`NEW FOUNDER #${newFounderResult.founder_number} via VerseCoins subscription! Granting 500 VerseCoins bonus`);

            // Grant additional 500 VerseCoins bonus
            const bonusBalance = newBalance + 500;

            const { error: bonusUpdateError } = await adminSupabase
              .from('user_versecoins')
              .update({
                credits: bonusBalance,
                total_earned: (userCoins?.total_earned || 0) + 500,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);

            if (bonusUpdateError) {
              logger.error('Failed to add founder bonus', bonusUpdateError);
            } else {
              // Record bonus transaction
              await adminSupabase
                .from('versecoins_transactions')
                .insert({
                  user_id: user.id,
                  type: 'credit',
                  amount: 500,
                  balance_after: bonusBalance,
                  description: `Founders' Circle bonus (#${newFounderResult.founder_number})`,
                  reference_type: 'bonus',
                  reference_id: `versecoins_${Date.now()}_${user.id.substring(0, 8)}`,
                  metadata: {
                    founder_number: newFounderResult.founder_number,
                    character_key: characterKey,
                    source: 'founders_circle_bonus',
                    triggered_by: 'versecoins_subscription',
                    tier_type: tierType
                  }
                });

              // Update newBalance for response
              newBalance = bonusBalance;
            }
          }
        }
        } catch (founderErr) {
          logger.error('Founders Circle integration error', founderErr);
          // Don't fail the subscription if Founders Circle fails
        }
      } else {
        logger.debug('Skipping Founders Circle check - this is an upgrade/downgrade');
      }

      // 9. Grant starter VerseCoins bonus (500 VC for new subscriptions only, not upgrades)
      if (!existingSubscription) {
        try {
          logger.debug('Granting starter VerseCoins bonus for new subscription', {
            userId: user.id,
            characterKey,
            tierType
          });

        const starterBonus = 500;
        const bonusBalance = newBalance + starterBonus;

        const { error: bonusUpdateError } = await adminSupabase
          .from('user_versecoins')
          .update({
            credits: bonusBalance,
            total_earned: (userCoins?.total_earned || 0) + starterBonus,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (bonusUpdateError) {
          logger.error('Failed to grant starter VerseCoins bonus', bonusUpdateError);
        } else {
          // Record bonus transaction
          await adminSupabase
            .from('versecoins_transactions')
            .insert({
              user_id: user.id,
              type: 'credit',
              amount: starterBonus,
              balance_after: bonusBalance,
              description: 'New subscription starter bonus',
              reference_type: 'bonus',
              reference_id: `versecoins_${Date.now()}_${user.id.substring(0, 8)}`,
              metadata: {
                subscription_tier: tierType,
                tier_name: selectedTier.name,
                source: 'starter_bonus',
                triggered_by: 'versecoins_subscription'
              }
            });

          // Update newBalance for response
          newBalance = bonusBalance;
          logger.info('Granted 500 VerseCoins starter bonus for new subscription');
        }
        } catch (starterBonusErr) {
          logger.error('Starter VerseCoins bonus error', starterBonusErr);
          // Don't fail the subscription if starter bonus fails
        }
      } else {
        logger.debug('Skipping starter bonus - this is an upgrade/downgrade');
      }

      // 10. Track analytics event
      try {
        logger.debug('Tracking subscription purchase analytics', {
          userId: user.id,
          characterKey,
          tierType
        });

        const analyticsParams = {
          event_category: 'subscription',
          event_label: characterKey,
          user_id: user.id,
          currency: 'versecoins',
          value: proRatedCost,
          subscription_tier: tierType,
          character: characterKey,
          payment_method: 'versecoins',
          is_founder: founderResult?.is_founder || false,
          founder_number: founderResult?.founder_number || null
        };

        // Track server-side analytics (implement if GA4 tracking is needed)
        // await trackServerSideEvent('purchase', analyticsParams);

        logger.debug('Analytics event prepared', analyticsParams);
      } catch (analyticsErr) {
        logger.error('Analytics tracking error', analyticsErr);
        // Don't fail the subscription if analytics fail
      }

      // 11. Create order record for tracking
      const orderResult = await ordersService.createOrder({
        user_id: user.id,
        email: user.email || 'unknown@example.com',
        character_key: characterKey,
        order_type: 'subscription',
        status: 'completed',
        product_type: (tierType === 'premium_plus' || tierType === 'premium_plus_weekly') ? 'nsfw_premium' : 'sfw_premium',
        product_name: selectedTier.name,
        tier: selectedTier.tier,
        amount_cents: proRatedCost * 100, // Actual amount charged
        currency: 'versecoins',
        subscription_start_date: startDate,
        subscription_end_date: endDate,
        stripe_metadata: {
          paid_with: 'versecoins',
          versecoins_amount: proRatedCost,
          character_key: characterKey,
          tier_type: tierType,
          tier_name: selectedTier.name,
          is_upgrade: isUpgrade,
          is_downgrade: isDowngrade,
          original_cost: selectedTier.cost,
          refund_amount: refundAmount,
          // Founder information
          is_founder: founderInfo?.is_founder || false,
          founder_number: founderInfo?.founder_number || null,
          is_founder_price: isFounderPrice,
          founder_savings: founderSavings
        },
        completed_at: new Date()
      });

      if (!orderResult.success) {
        logger.warn('Order creation failed, but subscription was created', orderResult.error);
      }

      // 12. Send receipt email
      try {
        logger.debug('Sending subscription purchase receipt email', {
          userId: user.id,
          email: user.email,
          tierName: selectedTier.name
        });

        const receiptItems: PurchaseItem[] = [{
          description: `${selectedTier.name} Subscription for ${characterKey}${isUpgrade ? ' (Upgrade)' : ''}${isDowngrade ? ' (Downgrade)' : ''}${isFounderPrice ? ' (🏆 Founder Pricing)' : ''} (includes 500 VerseCoins bonus)`,
          quantity: 1,
          price: proRatedCost / 100, // Convert VerseCoins to dollars equivalent
          total: proRatedCost / 100
        }];

        // Only add founder bonus to receipt if user actually became a new founder during this transaction
        // This should only happen for completely new subscriptions, not upgrades/downgrades
        if (!existingSubscription && founderResult?.reason === 'new_founder' && founderResult?.is_founder) {
          receiptItems.push({
            description: `Founders' Circle Bonus #${founderResult.founder_number} - Welcome bonus (500 VerseCoins)`,
            quantity: 1,
            price: 0.00, // FREE bonus - user didn't pay for this
            total: 0.00
          });
        }

        const totalAmount = receiptItems.reduce((sum, item) => sum + item.total, 0);

        const receiptData: ReceiptData = {
          purchaseId: orderResult.order_id || `vc_sub_${Date.now()}`,
          customerEmail: user.email || 'unknown@example.com',
          customerName: user.email?.split('@')[0] || 'User',
          purchaseDate: new Date(),
          items: receiptItems,
          subtotal: totalAmount,
          total: totalAmount,
          currency: 'USD', // Email service expects USD even for VerseCoins
          character: characterKey
        };

        const receiptResult = await emailService.sendReceiptEmail(user.id, receiptData);

        if (receiptResult.success) {
          logger.info('Subscription receipt email sent successfully');
        } else {
          logger.error('Failed to send receipt email', receiptResult.error);
        }
      } catch (receiptError) {
        logger.error('Receipt email error', receiptError);
        // Don't fail the subscription if receipt email fails
      }

      logger.info('VerseCoins subscription purchase completed', {
        userId: user.id,
        characterKey,
        tierType,
        tierName: selectedTier.name,
        originalCost: subscriptionCost,
        proRatedCost,
        refundAmount,
        isUpgrade,
        isDowngrade,
        newBalance,
        endDate: endDate.toISOString()
      });

      // Send admin notification for purchase
      adminNotifications.notifyNewPurchase({
        userId: user.id,
        userEmail: user.email || 'unknown@email.com',
        purchaseType: 'versecoins',
        amount: proRatedCost,
        productName: selectedTier.name,
        characterKey,
        timestamp: new Date().toISOString(),
        orderId: orderResult.order_id
      }).catch(err => {
        logger.error('Failed to send admin purchase notification', err);
        // Don't fail purchase for notification errors
      });

      return NextResponse.json({
        success: true,
        subscription: {
          tier_type: tierType,
          tier_name: selectedTier.name,
          characterKey,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          original_cost: selectedTier.cost,
          prorated_cost: proRatedCost,
          is_upgrade: isUpgrade,
          is_downgrade: isDowngrade,
          // Founder benefits
          is_founder_price: isFounderPrice,
          founder_savings: founderSavings
        },
        versecoins: {
          spent: proRatedCost,
          refunded: refundAmount,
          new_balance: newBalance
        },
        founder_info: founderResult ? {
          is_founder: founderResult.is_founder,
          founder_number: founderResult.founder_number,
          is_new_founder: founderResult.reason === 'new_founder',
          bonus_granted: founderResult.reason === 'new_founder' ? 500 : 0
        } : null,
        order_id: orderResult.order_id
      });

    } catch (dbError) {
      logger.error('Database error during subscription purchase', dbError);

      return NextResponse.json(
        { error: 'Failed to process subscription purchase. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('VerseCoins subscription purchase error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}