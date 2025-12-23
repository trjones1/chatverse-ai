import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { redeemVerseCoinLicense, autoDetectProductFromLicense, getVerseCoinProductByGumroadId } from '@/lib/gumroad';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OrdersService } from '@/lib/ordersService';

export async function POST(request: NextRequest) {
  try {
    const { gumroad_product_id, license_key } = await request.json();

    if (!license_key) {
      return NextResponse.json(
        { error: 'Missing license_key' },
        { status: 400 }
      );
    }

    let finalProductId = gumroad_product_id;

    // If no product ID provided, try to auto-detect from license key
    if (!finalProductId) {
      console.log('🔍 Auto-detecting product from license key...');
      const detection = await autoDetectProductFromLicense(license_key);

      if (!detection.found) {
        return NextResponse.json(
          { error: detection.error || 'Could not identify product from license key' },
          { status: 400 }
        );
      }

      finalProductId = detection.gumroadProductId!;
      console.log('✅ Auto-detected product:', {
        productId: finalProductId,
        productName: detection.product?.name
      });
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

    console.log('🔑 Redeeming VerseCoins license:', {
      userId: user.id,
      gumroadProductId: finalProductId,
      licenseKey: license_key.substring(0, 8) + '...'
    });

    // Redeem the license with Gumroad
    const redemption = await redeemVerseCoinLicense(finalProductId, license_key);

    if (!redemption.valid) {
      return NextResponse.json(
        { error: redemption.error },
        { status: 400 }
      );
    }

    const credits = redemption.credits || 0;
    const verification = redemption.verification!;

    // Use admin client for database operations
    const adminSupabase = getSupabaseAdmin();

    // Start transaction-like operations
    try {
      // 1. Get or create user VerseCoins record
      let { data: userCoins, error: fetchError } = await adminSupabase
        .from('user_versecoins')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // Not "not found"
        throw fetchError;
      }

      const currentCredits = userCoins?.credits || 0;
      let newBalance = currentCredits + credits;

      // 2. Upsert user balance
      const { error: upsertError } = await adminSupabase
        .from('user_versecoins')
        .upsert({
          user_id: user.id,
          credits: newBalance,
          total_earned: (userCoins?.total_earned || 0) + credits,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        throw upsertError;
      }

      // 3. Record transaction
      const { error: transactionError } = await adminSupabase
        .from('versecoins_transactions')
        .insert({
          user_id: user.id,
          type: 'credit',
          amount: credits,
          balance_after: newBalance,
          description: `Redeemed ${redemption.product?.name || 'VerseCoins'} license`,
          reference_type: 'gumroad_license',
          reference_id: verification.purchase.sale_id,
          metadata: {
            gumroad_product_id: finalProductId,
            license_key: license_key.substring(0, 8) + '***', // Partial key for reference
            product_name: verification.purchase.product_name,
            purchase_email: verification.purchase.email,
            sale_timestamp: verification.purchase.sale_timestamp
          }
        });

      if (transactionError) {
        throw transactionError;
      }

      // 4. Create order record for admin tracking (single source of truth)
      const ordersService = new OrdersService();

      // Detect character from product name or use default
      const characterKey = verification.purchase.product_name?.toLowerCase()?.includes('lexi') ? 'lexi' :
                          process.env.NEXT_PUBLIC_CHARACTER_KEY || 'lexi';

      // Get the expected price from our product catalog for validation
      const expectedProduct = getVerseCoinProductByGumroadId(finalProductId);
      const expectedPriceCents = expectedProduct ? Math.round(expectedProduct.price_usd * 100) : null;

      // Handle Gumroad price conversion - some APIs return dollars, others return cents
      let actualPriceCents: number;
      const gumroadPrice = verification.purchase.price || 0;

      if (expectedPriceCents && Math.abs(gumroadPrice - expectedPriceCents) < Math.abs(gumroadPrice * 100 - expectedPriceCents)) {
        // Gumroad returned price in cents (closer to expected when not multiplied)
        actualPriceCents = Math.round(gumroadPrice);
        console.log('🔧 Gumroad price detected as cents:', { gumroadPrice, expectedPriceCents, actualPriceCents });
      } else {
        // Gumroad returned price in dollars (multiply by 100)
        actualPriceCents = Math.round(gumroadPrice * 100);
        console.log('🔧 Gumroad price detected as dollars:', { gumroadPrice, expectedPriceCents, actualPriceCents });
      }

      const orderResult = await ordersService.createOrder({
        user_id: user.id,
        email: user.email || verification.purchase.email || 'unknown@example.com',
        character_key: characterKey,
        order_type: 'one_time',
        status: 'completed',
        product_type: 'versecoins',
        product_name: verification.purchase.product_name || 'VerseCoins',
        amount_cents: actualPriceCents,
        currency: 'usd',
        stripe_metadata: {
          paid_with: 'gumroad',
          gumroad_product_id: finalProductId,
          gumroad_sale_id: verification.purchase.sale_id,
          license_key: license_key.substring(0, 8) + '***',
          versecoins_amount: credits,
          purchase_email: verification.purchase.email
        },
        completed_at: new Date(verification.purchase.sale_timestamp)
      });

      // Note: Founders Circle is only for actual subscribers, not VerseCoins purchasers

      console.log('✅ VerseCoins redeemed successfully:', {
        userId: user.id,
        credits,
        newBalance,
        saleId: verification.purchase.sale_id
      });

      return NextResponse.json({
        success: true,
        credits_added: credits,
        new_balance: newBalance,
        product_name: redemption.product?.name,
        purchase: {
          email: verification.purchase.email,
          price: verification.purchase.price,
          currency: verification.purchase.currency,
          sale_timestamp: verification.purchase.sale_timestamp
        },
        order_id: orderResult.order_id
      });

    } catch (dbError) {
      console.error('❌ Database error during redemption:', dbError);

      // TODO: We should try to "unredeeem" the license with Gumroad here
      // but their API doesn't seem to support decrementing uses_count
      // This is a limitation we'll need to handle with manual admin tools

      return NextResponse.json(
        { error: 'Failed to update account balance. Please contact support.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ VerseCoins redemption error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}