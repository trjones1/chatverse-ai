// /app/api/auth/invite/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
const supabase = getSupabaseAdmin();

export async function POST(req: Request) {
  try {
    const { email, metadata } = await req.json();

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { ...metadata }, // e.g. { character_key: 'lexi' }
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true, user: data.user?.id ?? null });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
