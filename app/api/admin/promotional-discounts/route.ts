import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminUser } from '@/lib/admin';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create server-side client for auth verification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdminUser(user)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const adminSupabase = getSupabaseAdmin();

    // Get promotional discounts with admin permissions
    const { data: promotions, error: promotionsError } = await adminSupabase
      .from('promotional_discounts')
      .select('*')
      .eq('active', true)
      .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order('priority', { ascending: false });

    if (promotionsError) {
      console.error('Error fetching promotional discounts:', promotionsError);
      return NextResponse.json(
        { error: 'Failed to fetch promotional discounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: promotions || [],
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Promotional discounts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotional discounts' },
      { status: 500 }
    );
  }
}