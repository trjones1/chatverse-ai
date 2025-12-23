// app/api/debug/whoami/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
const sb = getSupabaseAdmin();
const DEBUG_TOKEN = process.env.DEBUG_TOKEN || 'dev';


function assertAuth(req: NextRequest) {
  const t = req.headers.get('x-debug-token');
  if (t !== DEBUG_TOKEN) throw new Error('Unauthorized debug route');
}

export async function GET(req: NextRequest) {
  try {
    assertAuth(req);
    const auth = req.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const anonId = req.headers.get('x-user-id') || null;

    let supaUser: any = null;
    if (bearer) {
      const { data } = await sb.auth.getUser(bearer);
      supaUser = data.user ?? null;
    }

    return NextResponse.json({
      hasBearer: Boolean(bearer),
      anonId,
      supabaseUser: supaUser
        ? { id: supaUser.id, email: supaUser.email, metadata: supaUser.user_metadata }
        : null,
      note: 'Send Authorization: Bearer <jwt> and x-user-id to simulate your app calls.',
    });
  } catch (e: any) {
    const msg = e?.message || 'whoami failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
