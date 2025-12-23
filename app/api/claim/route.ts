// app/api/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
const admin = getSupabaseAdmin();
export const dynamic = 'force-dynamic';


function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export async function POST(req: NextRequest) {
  try {
    const sb = await makeServerSupabase(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json(401, { error: 'unauthorized' });

    const scid = req.cookies.get('scid')?.value || '';

    if (scid) {
      // Link subscription rows to the user
      await admin.from('user_subscriptions')
        .update({ user_id: user.id })
        .eq('stripe_customer_id', scid)
        .is('user_id', null);

      // Link voice wallet to the user
      await admin.from('voice_wallets')
        .update({ user_id: user.id })
        .eq('stripe_customer_id', scid)
        .is('user_id', null);
    }

    return json(200, { linked: true });
  } catch (e: any) {
    console.error('[claim] error', e);
    return json(500, { error: e?.message || 'failed' });
  }
}