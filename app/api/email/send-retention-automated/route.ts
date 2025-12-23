import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Automated retention email sender - finds inactive users and sends them retention emails
 * Can be triggered via cron job (Vercel Cron) or manually
 *
 * Usage:
 * - Add to vercel.json: { "path": "/api/email/send-retention-automated", "schedule": "0 9 * * *" }
 * - Or call manually: POST /api/email/send-retention-automated
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Check for cron secret or admin authorization
    // Vercel Cron uses x-vercel-cron header for authentication
    const authHeader = request.headers.get('authorization');
    const vercelCron = request.headers.get('x-vercel-cron');
    const cronSecret = process.env.CRON_SECRET;

    // Allow if:
    // 1. Request is from Vercel Cron (has x-vercel-cron header)
    // 2. Valid cron secret provided
    // 3. No cron secret configured (development)
    const isAuthorized = vercelCron || !cronSecret || authHeader === `Bearer ${cronSecret}`;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Find users who:
    // 1. Haven't been seen in 3+ days
    // 2. Haven't unsubscribed from emails
    // 3. Have an email address
    // 4. Have had at least one conversation (engaged users)

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log('[Retention] Starting query for inactive users');
    console.log('[Retention] Threshold date:', threeDaysAgo.toISOString());

    const { data: inactiveUsers, error: usersError } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        raw_user_meta_data,
        last_sign_in_at
      `)
      .not('email', 'is', null)
      .lt('last_sign_in_at', threeDaysAgo.toISOString())
      .limit(50); // Process in batches of 50

    console.log('[Retention] Query result:', {
      foundUsers: inactiveUsers?.length || 0,
      error: usersError
    });

    if (usersError) {
      console.error('[Retention] Error fetching inactive users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch inactive users', details: usersError.message },
        { status: 500 }
      );
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log('[Retention] No inactive users found');
      return NextResponse.json({
        success: true,
        message: 'No inactive users found',
        emailsSent: 0
      });
    }

    console.log('[Retention] Found inactive users:', inactiveUsers.map(u => ({ id: u.id, email: u.email, last_sign_in: u.last_sign_in_at })));

    // Check which users have unsubscribed
    const { data: unsubscribes } = await supabase
      .from('email_unsubscribes')
      .select('user_id')
      .in('user_id', inactiveUsers.map(u => u.id));

    console.log('[Retention] Unsubscribes found:', unsubscribes?.length || 0);

    const unsubscribedUserIds = new Set(unsubscribes?.map(u => u.user_id) || []);

    // Get interaction history for each user to check engagement
    const userIds = inactiveUsers.map(u => u.id);
    const { data: interactions } = await supabase
      .from('interaction_log')
      .select('user_id, character_key, id')
      .in('user_id', userIds)
      .limit(1000); // Limit to prevent huge queries

    console.log('[Retention] Interactions found:', interactions?.length || 0);

    // Group interactions by user and get their most recent character
    const interactionsByUser = new Map<string, any[]>();
    interactions?.forEach(interaction => {
      if (!interactionsByUser.has(interaction.user_id)) {
        interactionsByUser.set(interaction.user_id, []);
      }
      interactionsByUser.get(interaction.user_id)!.push(interaction);
    });

    console.log('[Retention] Users with interactions:', interactionsByUser.size);

    // Filter out users who have unsubscribed or have no interaction history
    const eligibleUsers = inactiveUsers
      .filter(user =>
        !unsubscribedUserIds.has(user.id) &&
        interactionsByUser.has(user.id) &&
        interactionsByUser.get(user.id)!.length > 0
      )
      .map(user => ({
        ...user,
        conversations: interactionsByUser.get(user.id)!,
        first_name: user.raw_user_meta_data?.first_name || user.raw_user_meta_data?.name || 'there'
      }));

    console.log('[Retention] Eligible users after filtering:', eligibleUsers.length);
    console.log('[Retention] Eligible users:', eligibleUsers.map(u => ({ id: u.id, email: u.email, conversations: u.conversations?.length })));

    // Send retention emails
    console.log('[Retention] Starting to send emails...');
    const results = await Promise.allSettled(
      eligibleUsers.map(async (user) => {
        // Determine which character to use (most recent conversation)
        const characterKey = user.conversations?.[0]?.character_key || 'lexi';

        console.log(`[Retention] Sending email to ${user.email} (character: ${characterKey})`);

        // Call the send-retention endpoint
        const response = await fetch(`${request.nextUrl.origin}/api/email/send-retention`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            campaignType: 'retention_3day',
            characterKey
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`[Retention] Failed to send email to ${user.email}:`, errorData);
          throw new Error(`Failed to send email to ${user.email}: ${errorData.error}`);
        }

        console.log(`[Retention] Successfully sent email to ${user.email}`);
        return { success: true, email: user.email };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[Retention] Campaign complete: ${successful} sent, ${failed} failed`);

    if (failed > 0) {
      const failedResults = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      console.error('[Retention] Failed emails:', failedResults.map(r => r.reason));
    }

    return NextResponse.json({
      success: true,
      message: 'Retention email campaign completed',
      stats: {
        totalInactive: inactiveUsers.length,
        eligible: eligibleUsers.length,
        sent: successful,
        failed: failed
      }
    });

  } catch (error) {
    console.error('Error in automated retention email sender:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Allow GET for testing/status checks
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const vercelCron = request.headers.get('x-vercel-cron');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized = vercelCron || !cronSecret || authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { count } = await supabase
    .from('auth.users')
    .select('id', { count: 'exact', head: true })
    .not('email', 'is', null)
    .lt('last_sign_in_at', threeDaysAgo.toISOString());

  return NextResponse.json({
    message: 'Retention email automation status',
    inactiveUsers: count || 0,
    threshold: '3 days',
    lastCheck: new Date().toISOString()
  });
}