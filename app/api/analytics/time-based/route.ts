// app/api/analytics/time-based/route.ts
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

    // Get interaction data with timestamps from authenticated users
    const { data: interactionData, error: interactionError } = await supabase
      .from('interaction_log')
      .select('created_at, user_id')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user');

    if (interactionError) {
      console.error('Error fetching interaction data:', interactionError);
      throw interactionError;
    }

    // Get interaction data from anonymous users
    const { data: anonInteractionData, error: anonInteractionError } = await supabase
      .from('anonymous_interactions')
      .select('created_at, anonymous_id')
      .gte('created_at', startDate.toISOString())
      .eq('role', 'user');

    if (anonInteractionError) {
      console.error('Error fetching anonymous interaction data:', anonInteractionError);
      throw anonInteractionError;
    }

    // Get page view data with timestamps
    const { data: pageViewData, error: pageViewError } = await supabase
      .from('page_views')
      .select('created_at, visitor_id')
      .gte('created_at', startDate.toISOString());

    if (pageViewError) {
      console.error('Error fetching page view data:', pageViewError);
      throw pageViewError;
    }

    // Initialize hour and day counters
    const hourCounts = Array(24).fill(0).map((_, hour) => ({
      hour,
      visitors: new Set<string>(),
      messages: 0,
    }));

    const dayOfWeekCounts = Array(7).fill(0).map((_, day) => ({
      day,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      visitors: new Set<string>(),
      messages: 0,
    }));

    // Process page views by hour and day
    pageViewData?.forEach(view => {
      const date = new Date(view.created_at);
      const hour = date.getUTCHours(); // Use UTC or adjust for timezone as needed
      const dayOfWeek = date.getUTCDay();

      hourCounts[hour].visitors.add(view.visitor_id);
      dayOfWeekCounts[dayOfWeek].visitors.add(view.visitor_id);
    });

    // Process messages by hour and day (authenticated users)
    interactionData?.forEach(interaction => {
      const date = new Date(interaction.created_at);
      const hour = date.getUTCHours();
      const dayOfWeek = date.getUTCDay();

      hourCounts[hour].messages++;
      dayOfWeekCounts[dayOfWeek].messages++;
    });

    // Process messages by hour and day (anonymous users)
    anonInteractionData?.forEach(interaction => {
      const date = new Date(interaction.created_at);
      const hour = date.getUTCHours();
      const dayOfWeek = date.getUTCDay();

      hourCounts[hour].messages++;
      dayOfWeekCounts[dayOfWeek].messages++;
    });

    // Convert Sets to counts and find peaks
    const hourlyStats = hourCounts.map(h => ({
      hour: h.hour,
      hourLabel: `${h.hour.toString().padStart(2, '0')}:00`,
      visitors: h.visitors.size,
      messages: h.messages,
    }));

    const dailyStats = dayOfWeekCounts.map(d => ({
      day: d.day,
      dayName: d.dayName,
      visitors: d.visitors.size,
      messages: d.messages,
    }));

    // Find peak hours
    const peakHour = hourlyStats.reduce((max, curr) =>
      curr.visitors > max.visitors ? curr : max
    );

    const peakDay = dailyStats.reduce((max, curr) =>
      curr.visitors > max.visitors ? curr : max
    );

    // Calculate average activity
    const avgHourlyVisitors = hourlyStats.reduce((sum, h) => sum + h.visitors, 0) / 24;
    const avgDailyVisitors = dailyStats.reduce((sum, d) => sum + d.visitors, 0) / 7;

    return NextResponse.json({
      success: true,
      data: {
        hourly: hourlyStats,
        daily: dailyStats,
        peaks: {
          hour: {
            hour: peakHour.hour,
            label: peakHour.hourLabel,
            visitors: peakHour.visitors,
            messages: peakHour.messages,
          },
          day: {
            day: peakDay.day,
            name: peakDay.dayName,
            visitors: peakDay.visitors,
            messages: peakDay.messages,
          },
        },
        averages: {
          hourlyVisitors: Math.round(avgHourlyVisitors),
          dailyVisitors: Math.round(avgDailyVisitors),
        },
      }
    });

  } catch (error) {
    console.error('Error in time-based analytics API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch time-based analytics';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
