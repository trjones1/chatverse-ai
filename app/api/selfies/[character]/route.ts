import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest } from '@/lib/auth-headers';
import { isAdminUser } from '@/lib/admin';

const admin = getSupabaseAdmin();

export const dynamic = 'force-dynamic';

/**
 * GET /api/selfies/[character]
 * 
 * Returns a random selfie for the specified character based on context.
 * Supports mood-based filtering and NSFW preferences.
 * 
 * Query parameters:
 * - mood: string (optional) - Filter by mood (playful, flirty, intimate, etc.)
 * - nsfw: boolean (optional) - Include NSFW selfies (requires user entitlements)
 * - context: string (optional) - Message context for analytics
 * 
 * Returns:
 * {
 *   selfie: {
 *     id: string,
 *     url: string,
 *     thumbnail: string,
 *     mood: string,
 *     aesthetic: string,
 *     metadata: object
 *   }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ character: string }> }
): Promise<NextResponse> {
  try {
    const { character } = await params;
    
    if (!character) {
      return NextResponse.json(
        { error: 'Character parameter is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const mood = searchParams.get('mood') || undefined;
    const nsfwParam = searchParams.get('nsfw');
    const context = searchParams.get('context') || undefined;
    const excludeHours = parseInt(searchParams.get('excludeHours') || '24');
    
    // Authenticate request to determine user entitlements
    const authResult = await authenticateRequest(req, { character });
    const { user, userId, isAuthenticated } = authResult;
    
    // Determine NSFW access
    let isNsfwRequested = false;
    if (nsfwParam && isAuthenticated && user) {
      // Check user entitlements for NSFW access
      try {
        const { data: entitlements, error: entitlementsError } = await admin.rpc('get_user_entitlements', {
          p_user_id: user.id,
          p_character_key: character
        });

        if (!entitlementsError && entitlements?.[0]?.can_use_nsfw) {
          // Also check user metadata preference
          isNsfwRequested = !!user.user_metadata?.nsfwMode && nsfwParam === 'true';
        }
      } catch (error) {
        console.error('Error checking NSFW entitlements:', error);
        // Default to SFW on error
      }
    }
    
    // Check if selfies are enabled for this character
    const { data: config, error: configError } = await admin
      .from('character_selfie_config')
      .select('enabled, mood_matching, nsfw_enabled')
      .eq('character_key', character)
      .single();
      
    if (configError) {
      console.error('Error fetching selfie config:', configError);
      return NextResponse.json(
        { error: 'Selfie system not configured for this character' },
        { status: 404 }
      );
    }
    
    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Selfies are disabled for this character' },
        { status: 404 }
      );
    }
    
    // Respect NSFW settings
    if (isNsfwRequested && !config.nsfw_enabled) {
      isNsfwRequested = false;
    }
    
    // Get random selfie using the database function
    const { data: selfies, error: selfieError } = await admin.rpc(
      'get_random_character_selfie',
      {
        p_character_key: character,
        p_mood: config.mood_matching ? mood : null,
        p_is_nsfw: isNsfwRequested,
        p_exclude_recent_hours: excludeHours
      }
    );
    
    if (selfieError) {
      console.error('Error fetching random selfie:', selfieError);
      return NextResponse.json(
        { error: 'Failed to fetch selfie' },
        { status: 500 }
      );
    }
    
    if (!selfies || selfies.length === 0) {
      return NextResponse.json(
        { error: 'No selfies available' },
        { status: 404 }
      );
    }
    
    const selfie = selfies[0];
    
    // Log analytics (only if user is authenticated for privacy)
    if (isAuthenticated && user) {
      try {
        await admin.rpc('log_selfie_sent', {
          p_character_key: character,
          p_content_id: selfie.id,
          p_user_id: user.id,
          p_message_context: context,
          p_mood: mood,
          p_nsfw_mode: isNsfwRequested
        });
      } catch (error) {
        console.error('Error logging selfie analytics:', error);
        // Don't fail the request if analytics fail
      }
    }
    
    // Return selfie data
    return NextResponse.json({
      selfie: {
        id: selfie.id,
        url: selfie.file_url,
        thumbnail: selfie.thumbnail_url,
        mood: selfie.mood,
        aesthetic: selfie.aesthetic,
        metadata: selfie.metadata
      }
    });
    
  } catch (error) {
    console.error('Error in selfies API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/selfies/[character]
 * 
 * Admin endpoint to add a new selfie to the character's bank.
 * Requires admin privileges.
 * 
 * Body:
 * {
 *   file_url: string,
 *   thumbnail_url?: string,
 *   mood?: string,
 *   aesthetic?: string,
 *   is_nsfw?: boolean,
 *   tags?: string[],
 *   metadata?: object
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ character: string }> }
): Promise<NextResponse> {
  try {
    const { character } = await params;
    
    if (!character) {
      return NextResponse.json(
        { error: 'Character parameter is required' },
        { status: 400 }
      );
    }

    // Authenticate request - admin only
    const authResult = await authenticateRequest(req, { character });
    const { user, isAuthenticated } = authResult;
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    if (!isAdminUser(user)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const {
      file_url,
      thumbnail_url,
      mood,
      aesthetic,
      is_nsfw = false,
      tags = [],
      metadata = {},
      title
    } = body;
    
    if (!file_url) {
      return NextResponse.json(
        { error: 'file_url is required' },
        { status: 400 }
      );
    }
    
    // Insert selfie into content_library
    const { data: selfie, error: insertError } = await admin
      .from('content_library')
      .insert({
        character_key: character,
        content_type: 'selfie',
        title: title || `${character} selfie`,
        file_url,
        thumbnail_url,
        mood,
        aesthetic,
        is_nsfw,
        tags,
        metadata,
        status: 'active'
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting selfie:', insertError);
      return NextResponse.json(
        { error: 'Failed to add selfie' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      selfie: {
        id: selfie.id,
        url: selfie.file_url,
        thumbnail: selfie.thumbnail_url,
        mood: selfie.mood,
        aesthetic: selfie.aesthetic,
        metadata: selfie.metadata
      }
    });
    
  } catch (error) {
    console.error('Error in selfies POST API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}