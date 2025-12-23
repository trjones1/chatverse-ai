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

    // Define excluded user IDs and email domains
    const excludedUserIds = [
      '9196d16b-4ae3-484b-8d50-60cfff303edc', // Tramel Jones
      '1bf178a0-8371-4988-a6a5-7c3e0da7120b', // token.blakk@gmail.com (corrected ID)
      'ffaa6b87-0193-480d-8fff-03c13ef8c137', // Nyx
      'a551995b-48a8-4a56-8fa1-1c617775b8d7', // Tramel Jones
      '75bf3083-546f-48de-b3b4-95e57dd8afeb'  // Lexi Lexicon
    ];

    // Calculate date ranges
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all users excluding test accounts and @chatverse.ai emails
    // Note: We need to use the admin client to access user metadata
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    if (!allUsers?.users) {
      return NextResponse.json(
        { error: 'No user data available' },
        { status: 500 }
      );
    }

    // Filter out excluded users and @chatverse.ai emails
    const filteredUsers = allUsers.users.filter(user =>
      !excludedUserIds.includes(user.id) &&
      !user.email?.includes('@chatverse.ai')
    );

    // Calculate stats
    const totalUsers = filteredUsers.length;

    const last24Hours = filteredUsers.filter(user =>
      new Date(user.created_at) >= yesterday
    ).length;

    const last7Days = filteredUsers.filter(user =>
      new Date(user.created_at) >= lastWeek
    ).length;

    const last30DaysCount = filteredUsers.filter(user =>
      new Date(user.created_at) >= last30Days
    ).length;

    // Calculate growth rates
    const previousDay = filteredUsers.filter(user => {
      const createdAt = new Date(user.created_at);
      return createdAt >= twoDaysAgo && createdAt < yesterday;
    }).length;

    const previousWeek = filteredUsers.filter(user => {
      const createdAt = new Date(user.created_at);
      return createdAt >= twoWeeksAgo && createdAt < lastWeek;
    }).length;

    // Calculate growth rates (avoid division by zero)
    const growthRate24h = previousDay > 0
      ? ((last24Hours - previousDay) / previousDay) * 100
      : last24Hours > 0 ? 100 : 0;

    const growthRate7d = previousWeek > 0
      ? ((last7Days - previousWeek) / previousWeek) * 100
      : last7Days > 0 ? 100 : 0;

    const stats = {
      totalUsers,
      last24Hours,
      last7Days,
      last30Days: last30DaysCount,
      growthRate24h,
      growthRate7d
    };

    return NextResponse.json({
      success: true,
      data: stats,
      generatedAt: now.toISOString()
    });

  } catch (error: any) {
    console.error('❌ User stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    );
  }
}