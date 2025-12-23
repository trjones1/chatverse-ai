import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function GET() {
  try {
    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey,
          url: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing'
        }
      }, { status: 500 });
    }

    // Test Supabase client creation
    const supabase = createClient();

    // Test a simple query that doesn't require authentication
    const { data, error } = await supabase
      .from('user_facts')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Supabase query failed',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection working',
      details: {
        environmentVariables: 'present',
        clientCreated: 'success',
        queryTest: 'success',
        recordCount: data ? data.length : 0
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: 'Exception thrown',
      details: errorMessage
    }, { status: 500 });
  }
}