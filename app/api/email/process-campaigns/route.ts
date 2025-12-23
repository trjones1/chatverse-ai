import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { emailService } from '@/lib/emailService';
import { EmailPersonalization, PersonalizationData } from '@/lib/emailPersonalization';
import { domainMap } from '@/lib/characterConfig';
import { characters } from '@/lib/characters.config';

export async function POST(request: NextRequest) {
  try {
    const { daysInactive = 7, limit = 50, characterKey = 'lexi' } = await request.json();

    const supabase = await createClient();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    const cutoffDateString = cutoffDate.toISOString();

    // Find inactive users
    const { data: inactiveUsers, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_seen_at')
      .not('email', 'is', null)
      .lt('last_seen_at', cutoffDateString)
      .limit(limit);

    if (error) {
      console.error('Error fetching inactive users:', error);
      return NextResponse.json({ error: 'Failed to fetch inactive users' }, { status: 500 });
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No inactive users found',
        processed: 0
      });
    }

    // Filter out unsubscribed users
    const userIds = inactiveUsers.map(u => u.id);
    const { data: unsubscribed } = await supabase
      .from('email_unsubscribes')
      .select('user_id')
      .in('user_id', userIds);

    const unsubscribedIds = new Set(unsubscribed?.map(u => u.user_id) || []);
    const eligibleUsers = inactiveUsers.filter(user => !unsubscribedIds.has(user.id));

    // Check for recent email sends to avoid spam
    const { data: recentEmails } = await supabase
      .from('email_logs')
      .select('user_id')
      .in('user_id', eligibleUsers.map(u => u.id))
      .eq('campaign_type', 'retention')
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    const recentEmailIds = new Set(recentEmails?.map(e => e.user_id) || []);
    const finalEligibleUsers = eligibleUsers.filter(user => !recentEmailIds.has(user.id));

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each user
    for (const user of finalEligibleUsers) {
      try {
        results.processed++;

        // Get user memories for personalization
        const memories = await emailService.getUserMemories(user.id);

        // Get conversation stats
        const { data: stats } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id);

        const conversationCount = stats?.length || 0;

        // Get character configuration
        const characterConfig = characters[characterKey];
        
        // Get domain for this character (find first domain in domainMap that matches)
        const characterDomain = Object.entries(domainMap).find(([domain, key]) => key === characterKey)?.[0] || 'chatwithlexi.com';

        // Prepare personalization data
        const personalizationData: PersonalizationData = {
          firstName: user.first_name,
          lastActiveDate: user.last_seen_at,
          conversationCount,
          memories,
          favoriteTopics: [],
          characterName: characterKey,
          characterDisplayName: characterConfig?.displayName || characterKey,
          fromDomain: characterDomain
        };

        // Generate personalized email template
        const template = EmailPersonalization.generateRetentionTemplate(personalizationData);

        // Send email
        const result = await emailService.sendRetentionEmail(
          user.email,
          template,
          user.id,
          'retention'
        );

        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`User ${user.id}: ${result.error}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`User ${user.id}: ${errorMsg}`);
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} users. ${results.successful} emails sent successfully, ${results.failed} failed.`
    });

  } catch (error) {
    console.error('Error processing retention campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check campaign status
export async function GET() {
  try {
    const supabase = await createClient();

    // Get campaign statistics
    const { data: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .not('email', 'is', null);

    const { data: recentEmails } = await supabase
      .from('email_logs')
      .select('*')
      .eq('campaign_type', 'retention')
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('sent_at', { ascending: false });

    const stats = {
      totalUsers: totalUsers?.length || 0,
      emailsSentLast30Days: recentEmails?.length || 0,
      lastCampaignRun: recentEmails?.[0]?.sent_at || null
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}