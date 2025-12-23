import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getVerseCoinProductByGumroadId } from '@/lib/gumroad';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
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

    console.log('🔧 Fixing Gumroad price conversion errors...');

    // Get all Gumroad VerseCoins orders
    const { data: gumroadOrders } = await adminSupabase
      .from('orders')
      .select('id, amount_cents, stripe_metadata, product_name, created_at')
      .eq('product_type', 'versecoins')
      .not('stripe_metadata', 'is', null);

    const fixedOrders = [];
    const skippedOrders = [];

    for (const order of gumroadOrders || []) {
      try {
        const metadata = typeof order.stripe_metadata === 'string'
          ? JSON.parse(order.stripe_metadata)
          : order.stripe_metadata;

        if (metadata?.paid_with !== 'gumroad') {
          skippedOrders.push({ id: order.id, reason: 'Not a Gumroad order' });
          continue;
        }

        const gumroadProductId = metadata.gumroad_product_id;
        if (!gumroadProductId) {
          skippedOrders.push({ id: order.id, reason: 'No Gumroad product ID' });
          continue;
        }

        // Get expected price from our catalog
        const product = getVerseCoinProductByGumroadId(gumroadProductId);
        if (!product) {
          skippedOrders.push({ id: order.id, reason: 'Product not found in catalog' });
          continue;
        }

        const expectedPriceCents = Math.round(product.price_usd * 100);
        const currentPriceCents = order.amount_cents;

        // Check if price needs fixing (10x too high)
        if (Math.abs(currentPriceCents - expectedPriceCents * 10) < Math.abs(currentPriceCents - expectedPriceCents)) {
          console.log(`🔧 Fixing order ${order.id}: ${currentPriceCents} cents → ${expectedPriceCents} cents`);

          // Update the order with correct price
          const { error: updateError } = await adminSupabase
            .from('orders')
            .update({
              amount_cents: expectedPriceCents,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) {
            throw updateError;
          }

          fixedOrders.push({
            id: order.id,
            product_name: order.product_name,
            old_price_cents: currentPriceCents,
            new_price_cents: expectedPriceCents,
            old_price_usd: (currentPriceCents / 100).toFixed(2),
            new_price_usd: (expectedPriceCents / 100).toFixed(2)
          });
        } else {
          skippedOrders.push({
            id: order.id,
            reason: 'Price already correct',
            current_price: `$${(currentPriceCents / 100).toFixed(2)}`,
            expected_price: `$${(expectedPriceCents / 100).toFixed(2)}`
          });
        }

      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        const errorMessage = orderError instanceof Error ? orderError.message : String(orderError);
        skippedOrders.push({ id: order.id, reason: `Error: ${errorMessage}` });
      }
    }

    console.log('✅ Gumroad price fix completed:', {
      fixed: fixedOrders.length,
      skipped: skippedOrders.length
    });

    return NextResponse.json({
      success: true,
      fixed_orders: fixedOrders,
      skipped_orders: skippedOrders,
      summary: {
        total_processed: (gumroadOrders?.length || 0),
        fixed_count: fixedOrders.length,
        skipped_count: skippedOrders.length
      }
    });

  } catch (error) {
    console.error('❌ Error fixing Gumroad prices:', error);
    return NextResponse.json(
      { error: 'Failed to fix Gumroad prices' },
      { status: 500 }
    );
  }
}