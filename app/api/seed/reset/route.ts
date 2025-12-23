import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdmin();

export async function POST(req: Request) {
  // expects JSON: { userId?: string, mode?: 'strict'|'hybrid', index?: number }
  const { userId, mode, index } = await req.json();

  // If userId not supplied, try to use the caller's auth (only works if using Middleware to inject)
  let uid = userId;
  if (!uid) {
    // You can pull from header or session if your app exposes it server-side.
    // For now, require userId for safety:
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const updates: any = {};
  if (typeof index === 'number') updates.seed_index = index;
  if (mode === 'strict' || mode === 'hybrid') updates.seed_mode = mode;
  if (!updates.seed_index) updates.seed_index = 0; // default reset

  const { error } = await supabase.from('public.profiles').update(updates).eq('id', uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, userId: uid, updates });
}
