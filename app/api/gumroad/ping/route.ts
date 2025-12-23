import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getVerseCoinProductByGumroadId } from '@/lib/gumroad';
import { OrdersService } from '@/lib/ordersService';

export const dynamic = 'force-dynamic';

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function asInt(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/**
 * Gumroad Ping/Webhook handler
 * Configure Gumroad Ping URL like:
 *   https://YOUR_DOMAIN.com/api/gumroad/ping?token=YOUR_SECRET
 *
 * Env:
 *   GUMROAD_PING_TOKEN=YOUR_SECRET
 */
export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();

  // --- Simple shared-secret guard via query param ---
  const token = new URL(req.url).searchParams.get('token');
  const expected = process.env.GUMROAD_PING_TOKEN;
  if (expected && token !== expected) {
    return json(401, { error: 'unauthorized' });
  }

  // Gumroad sends application/x-www-form-urlencoded
  const form = await req.formData();

  // Common Gumroad ping fields (names can vary a bit; we handle common ones)
  const saleId =
    (form.get('sale_id') as string) ||
    (form.get('saleId') as string) ||
    (form.get('id') as string) ||
    '';

  const productId =
    (form.get('product_id') as string) ||
    (form.get('productId') as string) ||
    '';

  const email =
    ((form.get('email') as string) || '').toLowerCase().trim();

  const licenseKey =
    (form.get('license_key') as string) ||
    (form.get('licenseKey') as string) ||
    '';

  const currency = ((form.get('currency') as string) || 'usd').toLowerCase();
  const priceRaw = form.get('price') as any; // Gumroad sometimes sends cents, sometimes dollars depending on context
  const priceMaybe = Number(priceRaw ?? 0);

  if (!saleId || !productId || !email) {
    return json(400, { error: 'missing_required_fields', saleId, productId, emailPresent: !!email });
  }

  // Map product -> VerseCoins credits
  const product = getVerseCoinProductByGumroadId(productId);
  if (!product) {
    return json(400, { error: 'unknown_product', productId });
  }

  const creditsToAdd = product.credits;

  // --- Idempotency: if we already credited this sale, do nothing ---
  const { data: existingTxn, error: existingErr } = await admin
    .from('versecoins_transactions')
    .select('id')
    .eq('reference_type', 'gumroad_sale')
    .eq('reference_id', saleId)
    .limit(1);

  if (!existingErr && existingTxn?.length) {
    return json(200, { ok: true, already_processed: true });
  }

  // Try to locate a user by email
  let userId: string | null = null;

  try {
    const { data, error } = await admin.auth.admin.listUsers();
    const matchingUser = data?.users?.find(u => u.email?.toLowerCase() === email);
    userId = matchingUser?.id ?? null;
  } catch {
    userId = null;
  }

  // If user doesn't exist yet, store as pending and exit OK
  if (!userId) {
    await admin
      .from('pending_gumroad_purchases')
      .upsert({
        email,
        gumroad_sale_id: saleId,
        gumroad_product_id: productId,
        credits: creditsToAdd,
        currency,
        price_raw: String(priceRaw ?? ''),
        license_key_partial: licenseKey ? `${licenseKey.slice(0, 8)}***` : null,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, { onConflict: 'gumroad_sale_id' });

    return json(200, { ok: true, pending: true });
  }

  // --- Credit VerseCoins immediately ---
  // Fetch current balance
  const { data: userCoins } = await admin
    .from('user_versecoins')
    .select('credits,total_earned')
    .eq('user_id', userId)
    .single();

  const currentCredits = userCoins?.credits ?? 0;
  const newBalance = currentCredits + creditsToAdd;

  // Upsert balance
  const { error: upsertErr } = await admin
    .from('user_versecoins')
    .upsert({
      user_id: userId,
      credits: newBalance,
      total_earned: (userCoins?.total_earned ?? 0) + creditsToAdd,
      updated_at: new Date().toISOString(),
    });

  if (upsertErr) {
    return json(500, { error: 'failed_to_upsert_balance' });
  }

  // Record transaction
  const { error: txnErr } = await admin
    .from('versecoins_transactions')
    .insert({
      user_id: userId,
      type: 'credit',
      amount: creditsToAdd,
      balance_after: newBalance,
      description: `Gumroad purchase: ${product.name}`,
      reference_type: 'gumroad_sale',
      reference_id: saleId,
      metadata: {
        gumroad_product_id: productId,
        purchase_email: email,
        license_key_partial: licenseKey ? `${licenseKey.slice(0, 8)}***` : null,
      },
      created_at: new Date().toISOString(),
    });

  if (txnErr) {
    return json(500, { error: 'failed_to_write_transaction' });
  }

  // Create an order record (admin tracking + analytics)
  // Convert price into cents as best-effort:
  // - If Gumroad sends "999" and expected is $9.99, treat as cents.
  // - If it sends "9.99", treat as dollars.
  const expectedCents = Math.round(product.price_usd * 100);
  const priceAsCents =
    Math.abs(priceMaybe - expectedCents) < Math.abs(priceMaybe * 100 - expectedCents)
      ? Math.round(priceMaybe)
      : Math.round(priceMaybe * 100);

  try {
    const ordersService = new OrdersService();
    await ordersService.createOrder({
      user_id: userId,
      email,
      character_key: (process.env.NEXT_PUBLIC_CHARACTER_KEY || 'lexi').toLowerCase(),
      order_type: 'one_time',
      status: 'completed',
      product_type: 'versecoins',
      product_name: product.name,
      amount_cents: asInt(priceAsCents, expectedCents),
      currency: 'usd',
      stripe_metadata: {
        paid_with: 'gumroad',
        gumroad_product_id: productId,
        gumroad_sale_id: saleId,
        versecoins_amount: creditsToAdd,
      },
      completed_at: new Date(),
    });
  } catch {
    // Non-fatal: credits already applied
  }

  // Mark any matching pending purchase as claimed
  await admin
    .from('pending_gumroad_purchases')
    .update({
      status: 'claimed',
      user_id: userId,
      claimed_at: new Date().toISOString(),
    })
    .eq('gumroad_sale_id', saleId);

  return json(200, { ok: true, credited: creditsToAdd, newBalance });
}
