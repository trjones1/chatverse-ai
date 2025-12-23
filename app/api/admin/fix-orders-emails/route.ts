// app/api/admin/fix-orders-emails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    // Use admin client to fix emails
    const adminSupabase = getSupabaseAdmin();

    // Execute the fix using raw SQL
    const { data, error } = await adminSupabase.rpc('fix_orders_emails');

    if (error) {
      console.error('Error fixing orders emails:', error);
      return NextResponse.json({ 
        error: 'Failed to fix orders emails',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Orders emails fixed successfully',
      updated_count: data?.length || 0,
      updated_orders: data
    });

  } catch (error) {
    console.error('Fix orders emails error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}