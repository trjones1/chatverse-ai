import { NextRequest, NextResponse } from 'next/server';
import { getCharacterGallerySelfies } from '@/lib/selfieSystem';

/**
 * API endpoint to get gallery preview selfies
 * Returns 6 selfies for preview/tease in the gallery component
 *
 * Query params:
 * - character: Character key (e.g., 'lexi', 'nyx')
 * - limit: Number of selfies to return (default: 6)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const character = searchParams.get('character');
    const limit = parseInt(searchParams.get('limit') || '6', 10);

    if (!character) {
      return NextResponse.json(
        { error: 'Character parameter is required' },
        { status: 400 }
      );
    }

    // Get selfies from selfie bank
    // For preview, always show SFW selfies (NSFW only for Premium+ in actual gallery)
    const selfies = await getCharacterGallerySelfies(
      character,
      false, // Always show SFW for preview tease
      limit
    );

    // Get total count for display
    const totalCount = selfies.length;

    return NextResponse.json({
      success: true,
      selfies: selfies.map(selfie => ({
        id: selfie.id,
        url: selfie.url,
        thumbnail: selfie.thumbnail
      })),
      totalCount
    });

  } catch (error) {
    console.error('Error in gallery preview API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery preview' },
      { status: 500 }
    );
  }
}
