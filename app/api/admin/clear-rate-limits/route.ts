/**
 * Admin endpoint to clear all rate limiting entries for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧹 Clearing all rate limiting entries...');

    const supabase = await makeServerSupabase(req);

    // Clear all rate limiting entries
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .neq('id', 'impossible_id_that_never_exists'); // Delete all rows

    if (error) {
      console.error('❌ Failed to clear rate_limits:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to clear rate_limits table',
        details: error
      }, { status: 500 });
    }

    console.log('✅ All rate limiting entries cleared successfully');

    return NextResponse.json({
      success: true,
      message: 'All rate limiting entries have been cleared',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Clear rate limits failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Unexpected error clearing rate limits',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}