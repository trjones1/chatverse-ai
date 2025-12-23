/**
 * Admin endpoint to check rate limiting database entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 Checking rate limiting database entries...');

    const supabase = await makeServerSupabase(req);

    // Get all rate limiting entries
    const { data: rateLimits, error } = await supabase
      .from('rate_limits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Failed to query rate_limits:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to query rate_limits table',
        details: error
      }, { status: 500 });
    }

    // Get counts by user
    const { data: userCounts, error: countError } = await supabase
      .from('rate_limits')
      .select('user_id, count(*)')
      .gte('reset_time', new Date().toISOString())
      .order('count', { ascending: false });

    if (countError) {
      console.warn('⚠️ Failed to get user counts:', countError);
    }

    console.log('✅ Retrieved rate limiting data');

    return NextResponse.json({
      success: true,
      data: {
        rateLimits: rateLimits || [],
        userCounts: userCounts || [],
        totalEntries: rateLimits?.length || 0,
        currentTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Admin rate limits check failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Unexpected error checking rate limits',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}