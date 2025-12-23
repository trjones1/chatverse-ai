import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getFounderInfo, applyFounderDiscount } from '@/lib/foundersCircle';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log('🔍 Upgrade preview API called with:', requestBody);

    const { characterKey, tierType = 'premium_plus' } = requestBody;

    if (!characterKey) {
      console.log('❌ No character key provided');
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

    const adminSupabase = getSupabaseAdmin();

    // Define subscription costs
    const tierConfig = {
      premium: { cost: 1500, tier: 'sfw', name: 'Premium Pass', duration: 30 },
      premium_plus: { cost: 2500, tier: 'nsfw', name: 'Premium+ All Access Pass', duration: 30 },
      premium_weekly: { cost: 500, tier: 'sfw', name: 'Weekly Premium Pass', duration: 7 },
      premium_plus_weekly: { cost: 833, tier: 'nsfw', name: 'Weekly Premium+ Pass', duration: 7 }
    };

    const selectedTier = tierConfig[tierType as keyof typeof tierConfig];

    // Check founder pricing
    const founderInfo = await getFounderInfo(user.id, characterKey);
    const costType = (tierType === 'premium' || tierType === 'premium_weekly') ? 'versecoins_sfw_cost' : 'versecoins_nsfw_cost';
    const pricingResult = applyFounderDiscount(selectedTier.cost, costType, founderInfo);

    const subscriptionCost = pricingResult.cost;
    const isFounderPrice = pricingResult.is_founder_price;
    const founderSavings = pricingResult.savings;

    // Check for existing active subscription
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

    // Get user's current balance
    let { data: userCoins, error: fetchError } = await adminSupabase
      .from('user_versecoins')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const currentCredits = userCoins?.credits || 0;
    let previewData = {
      tier_type: tierType,
      tier_name: selectedTier.name,
      original_cost: selectedTier.cost,
      final_cost: subscriptionCost,
      current_balance: currentCredits,
      sufficient_funds: currentCredits >= subscriptionCost,
      is_founder_price: isFounderPrice,
      founder_savings: founderSavings,
      scenario: 'new_subscription' as const
    };

    if (!existingSubscription) {
      // New subscription - full price
      console.log('✅ No existing subscription found, returning new subscription preview:', previewData);
      return NextResponse.json({
        success: true,
        preview: previewData
      });
    }

    // Existing subscription - calculate proration
    // Determine if existing subscription is weekly by checking tier name with fallback
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

    // Calculate remaining days
    const now = new Date();
    const subscriptionEnd = new Date(existingSubscription.current_period_end);
    const remainingDays = Math.max(0, Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    if (existingTierType === tierType) {
      return NextResponse.json({
        success: false,
        error: `You already have an active ${selectedTier.name} subscription for ${characterKey}`,
        preview: {
          ...previewData,
          scenario: 'already_subscribed',
          current_tier: existingTierType,
          remaining_days: remainingDays
        }
      });
    }

    // Calculate prorated costs using correct duration for each tier
    const dailyCostExisting = existingTierConfig.cost / existingTierConfig.duration;
    const dailyCostNew = selectedTier.cost / selectedTier.duration;
    let proRatedCost = subscriptionCost;
    let refundAmount = 0;
    let scenario: 'upgrade' | 'downgrade' = 'upgrade';

    // Check if this is a duration change (weekly ↔ monthly)
    const isDurationChange = existingTierConfig.duration !== selectedTier.duration;

    if (isDurationChange) {
      // For duration changes (weekly ↔ monthly), charge full new subscription cost
      // and provide refund for remaining time on current subscription
      const remainingValueExisting = Math.floor(dailyCostExisting * remainingDays);
      refundAmount = remainingValueExisting;
      proRatedCost = subscriptionCost; // Full cost of new subscription
      scenario = 'upgrade';
    } else {
      // Same duration - use traditional upgrade/downgrade logic
      if (dailyCostNew > dailyCostExisting) {
        // Upgrade: charge difference for remaining days
        scenario = 'upgrade';
        const upgradeDifference = Math.floor((dailyCostNew - dailyCostExisting) * remainingDays);
        proRatedCost = upgradeDifference;
      } else if (dailyCostNew < dailyCostExisting) {
        // Downgrade: refund difference
        scenario = 'downgrade';
        const remainingValueExisting = Math.floor(dailyCostExisting * remainingDays);
        const newValueForDays = Math.floor(dailyCostNew * remainingDays);
        refundAmount = remainingValueExisting - newValueForDays;
        proRatedCost = 0; // No charge for downgrade
      } else {
        // Same daily cost
        scenario = 'upgrade'; // Treat as neutral change
        proRatedCost = 0;
      }
    }

    return NextResponse.json({
      success: true,
      preview: {
        ...previewData,
        final_cost: proRatedCost,
        refund_amount: refundAmount,
        sufficient_funds: currentCredits >= proRatedCost,
        scenario,
        current_tier: existingTierType,
        remaining_days: remainingDays,
        daily_cost_current: Math.floor(dailyCostExisting),
        daily_cost_new: Math.floor(dailyCostNew),
        upgrade_details: scenario === 'upgrade' ? {
          daily_difference: Math.floor(dailyCostNew - dailyCostExisting),
          days_remaining: remainingDays,
          total_upgrade_cost: proRatedCost
        } : null
      }
    });

  } catch (error) {
    logger.error('Upgrade preview error', error);
    return NextResponse.json(
      { error: 'Failed to calculate upgrade preview' },
      { status: 500 }
    );
  }
}