import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest } from '@/lib/auth-headers';

const admin = getSupabaseAdmin();

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/selfies
 *
 * Returns selfies that have been sent to the authenticated user
 *
 * Query parameters:
 * - character: string (required) - Filter by character
 * - limit: number (optional) - Max number of selfies to return (default: 50)
 *
 * Returns:
 * {
 *   selfies: Array<{
 *     id: string,
 *     url: string,
 *     thumbnail: string,
 *     mood: string,
 *     aesthetic: string,
 *     timestamp: string
 *   }>
 * }
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(req, {});
    const { user, isAuthenticated } = authResult;

    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const character = searchParams.get('character');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!character) {
      return NextResponse.json(
        { error: 'Character parameter is required' },
        { status: 400 }
      );
    }

    // Fetch selfies sent to this user from the specified character
    // We'll look in the character_selfie_analytics table to find selfies sent to this user
    const { data: selfieHistory, error: historyError } = await admin
      .from('character_selfie_analytics')
      .select(`
        content_id,
        sent_at,
        mood,
        content_library!inner(
          id,
          file_url,
          thumbnail_url,
          mood,
          aesthetic,
          metadata
        )
      `)
      .eq('character_key', character)
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (historyError) {
      console.error('Error fetching selfie history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch selfie history' },
        { status: 500 }
      );
    }

    // Transform the data
    const selfies = selfieHistory?.map((item: any) => ({
      id: item.content_library.id,
      url: item.content_library.file_url,
      thumbnail: item.content_library.thumbnail_url,
      mood: item.content_library.mood || item.mood,
      aesthetic: item.content_library.aesthetic,
      metadata: item.content_library.metadata,
      timestamp: item.sent_at
    })) || [];

    return NextResponse.json({
      selfies,
      total: selfies.length
    });

  } catch (error) {
    console.error('Error in user selfies API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}