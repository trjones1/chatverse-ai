import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCharacterConfig } from '@/lib/characters.config';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { visitorId, engaged = false, timeOnPage } = await req.json();

    if (!visitorId) {
      return NextResponse.json({ error: 'Visitor ID required' }, { status: 400 });
    }

    // Get character from hostname
    const host = req.headers.get('host') || 'chatwithlexi.com';
    const config = getCharacterConfig(host);
    const characterKey = config.key;

    // Get page info
    const referer = req.headers.get('referer') || '';
    const referrer = req.headers.get('referrer') || '';
    const userAgent = req.headers.get('user-agent') || '';

    // Determine device type from user agent
    const deviceType = getDeviceType(userAgent);

    // Extract user ID if authenticated (from visitor ID format)
    const userId = visitorId.startsWith('anon') ? null : visitorId;

    const admin = getSupabaseAdmin();

    // Insert page view (simple insert, no upsert needed for initial tracking)
    const { data, error } = await admin
      .from('page_views')
      .insert({
        visitor_id: visitorId,
        user_id: userId,
        character_key: characterKey,
        page_path: referer || '/',
        referrer: referrer || referer || null,
        user_agent: userAgent,
        device_type: deviceType,
        engaged,
        time_on_page_seconds: timeOnPage || null,
        last_activity_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Page view tracking error:', error);
      return NextResponse.json({ error: 'Failed to track page view' }, { status: 500 });
    }

    return NextResponse.json({ success: true, pageViewId: data?.id });

  } catch (error) {
    console.error('Page view tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update existing page view (for engagement tracking)
export async function PATCH(req: NextRequest) {
  try {
    const { visitorId, engaged = true, timeOnPage } = await req.json();

    if (!visitorId) {
      return NextResponse.json({ error: 'Visitor ID required' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'chatwithlexi.com';
    const config = getCharacterConfig(host);
    const characterKey = config.key;

    const admin = getSupabaseAdmin();

    // Update most recent page view for this visitor
    const { data, error } = await admin
      .from('page_views')
      .update({
        engaged,
        time_on_page_seconds: timeOnPage,
        last_activity_at: new Date().toISOString(),
      })
      .eq('visitor_id', visitorId)
      .eq('character_key', characterKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .select();

    if (error) {
      console.error('Page view update error:', error);
      return NextResponse.json({ error: 'Failed to update page view' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data?.length || 0 });

  } catch (error) {
    console.error('Page view update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}
