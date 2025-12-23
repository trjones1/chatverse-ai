// app/api/analytics/character-performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days_back') || '30');

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    // Get message counts by character from authenticated users
    const { data: messageData, error: messageError } = await supabase
      .from('interaction_log')
      .select('character_key, user_id')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user');

    if (messageError) {
      console.error('Error fetching message data:', messageError);
      throw messageError;
    }

    // Get message counts from anonymous users
    const { data: anonMessageData, error: anonMessageError } = await supabase
      .from('anonymous_interactions')
      .select('character_key, anonymous_id')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user');

    if (anonMessageError) {
      console.error('Error fetching anonymous message data:', anonMessageError);
      throw anonMessageError;
    }

    // Get page views by character
    const { data: pageViewData, error: pageViewError } = await supabase
      .from('page_views')
      .select('character_key, visitor_id, engaged')
      .gte('created_at', startDate.toISOString());

    if (pageViewError) {
      console.error('Error fetching page view data:', pageViewError);
      throw pageViewError;
    }

    // Get purchases by character
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('orders')
      .select('character_key, amount_cents, user_id')
      .gte('created_at', startDate.toISOString())
      .in('status', ['completed', 'active']);

    if (purchaseError) {
      console.error('Error fetching purchase data:', purchaseError);
      throw purchaseError;
    }

    // Calculate metrics per character
    const characters = ['lexi', 'chase', 'nyx', 'aria', 'zara', 'knox', 'blaze'];
    const characterStats = characters.map(character => {
      // Messages from authenticated users
      const characterMessages = messageData?.filter(m => m.character_key === character) || [];
      // Messages from anonymous users
      const characterAnonMessages = anonMessageData?.filter(m => m.character_key === character) || [];

      const totalMessages = characterMessages.length + characterAnonMessages.length;
      const uniqueUsers = new Set([
        ...characterMessages.map(m => m.user_id).filter(Boolean),
        ...characterAnonMessages.map(m => m.anonymous_id).filter(Boolean)
      ]).size;

      // Page views
      const characterViews = pageViewData?.filter(v => v.character_key === character) || [];
      const totalViews = characterViews.length;
      const uniqueVisitors = new Set(characterViews.map(v => v.visitor_id)).size;
      const engagedVisitors = new Set(
        characterViews.filter(v => v.engaged).map(v => v.visitor_id)
      ).size;
      const engagementRate = uniqueVisitors > 0 ? (engagedVisitors / uniqueVisitors) * 100 : 0;

      // Purchases
      const characterPurchases = purchaseData?.filter(p => p.character_key === character) || [];
      const totalPurchases = characterPurchases.length;
      const totalRevenue = characterPurchases.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
      const uniquePurchasers = new Set(characterPurchases.map(p => p.user_id).filter(Boolean)).size;
      const conversionRate = uniqueVisitors > 0 ? (uniquePurchasers / uniqueVisitors) * 100 : 0;

      // Averages
      const avgMessagesPerUser = uniqueUsers > 0 ? totalMessages / uniqueUsers : 0;
      const avgRevenuePerPurchaser = uniquePurchasers > 0 ? totalRevenue / uniquePurchasers : 0;

      return {
        character,
        messages: {
          total: totalMessages,
          uniqueUsers,
          avgPerUser: Math.round(avgMessagesPerUser * 10) / 10,
        },
        pageViews: {
          total: totalViews,
          uniqueVisitors,
          engagedVisitors,
          engagementRate: Math.round(engagementRate * 10) / 10,
        },
        purchases: {
          total: totalPurchases,
          uniquePurchasers,
          totalRevenue,
          avgRevenuePerPurchaser: Math.round(avgRevenuePerPurchaser),
          conversionRate: Math.round(conversionRate * 100) / 100,
        },
      };
    });

    // Sort by total visitors (most popular first)
    characterStats.sort((a, b) => b.pageViews.uniqueVisitors - a.pageViews.uniqueVisitors);

    return NextResponse.json({
      success: true,
      data: {
        characters: characterStats,
        period: `Last ${daysBack} days`,
      }
    });

  } catch (error) {
    console.error('Error in character-performance API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch character performance';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
