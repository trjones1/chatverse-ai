import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest } from '@/lib/auth-headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const character = searchParams.get('character') || 'lexi';

    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (authResult.userIdSource !== 'authenticated' || !authResult.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();

    // Get streak status for the user and character
    const { data: streakData, error: streakError } = await admin.rpc('get_user_streak_status', {
      p_user_id: authResult.userId,
      p_character_key: character
    });

    if (streakError) {
      console.error('Error getting streak status:', streakError);
      return NextResponse.json(
        {
          current_streak: 0,
          longest_streak: 0,
          total_active_days: 0,
          is_streak_broken: false,
          next_milestone: 3,
          progress_to_next_milestone: 0,
          milestones: []
        }
      );
    }

    const streak = streakData?.[0] || {
      current_streak: 0,
      longest_streak: 0,
      total_active_days: 0,
      is_streak_broken: false,
      next_milestone: 3,
      progress_to_next_milestone: 0
    };

    // Define milestone achievements
    const milestones = [
      {
        level: 3,
        title: 'Chat Streak Started!',
        emoji: '🔥',
        description: 'You\'ve been chatting for 3 days straight!',
        achieved: streak.current_streak >= 3,
        type: 'starter'
      },
      {
        level: 7,
        title: 'Weekly Champion!',
        emoji: '⭐',
        description: 'A whole week of daily conversations!',
        achieved: streak.current_streak >= 7,
        type: 'week'
      },
      {
        level: 14,
        title: 'Two-Week Dedication!',
        emoji: '💫',
        description: 'Two weeks of dedicated daily chats!',
        achieved: streak.current_streak >= 14,
        type: 'dedicated'
      },
      {
        level: 30,
        title: 'Monthly Devotion!',
        emoji: '👑',
        description: 'A whole month of daily conversations!',
        achieved: streak.current_streak >= 30,
        type: 'committed'
      },
      {
        level: 50,
        title: 'Devoted Companion!',
        emoji: '💎',
        description: '50 days of unwavering dedication!',
        achieved: streak.current_streak >= 50,
        type: 'devoted'
      },
      {
        level: 75,
        title: 'Legendary Bond!',
        emoji: '🌟',
        description: '75 consecutive days - truly legendary!',
        achieved: streak.current_streak >= 75,
        type: 'legendary'
      },
      {
        level: 100,
        title: 'Elite Dedication!',
        emoji: '🏆',
        description: '100 days straight - elite level commitment!',
        achieved: streak.current_streak >= 100,
        type: 'elite'
      },
      {
        level: 365,
        title: 'Eternal Bond!',
        emoji: '♾️',
        description: 'A full year of daily conversations!',
        achieved: streak.current_streak >= 365,
        type: 'eternal'
      }
    ];

    // Calculate next milestone
    let nextMilestone = milestones.find(m => !m.achieved);
    if (!nextMilestone) {
      // User has achieved all milestones, set next to 500 or something high
      nextMilestone = {
        level: 500,
        title: 'Beyond Legendary',
        emoji: '🌌',
        description: 'You\'ve transcended all milestones!',
        achieved: false,
        type: 'transcendent'
      };
    }

    const progressToNext = nextMilestone ? (streak.current_streak / nextMilestone.level) * 100 : 100;

    return NextResponse.json({
      current_streak: streak.current_streak || 0,
      longest_streak: streak.longest_streak || 0,
      total_active_days: streak.total_active_days || 0,
      last_chat_date: streak.last_chat_date,
      streak_start_date: streak.streak_start_date,
      days_since_last_chat: streak.days_since_last_chat || 0,
      is_streak_broken: streak.is_streak_broken || false,
      next_milestone: nextMilestone.level,
      progress_to_next_milestone: Math.min(progressToNext, 100),
      milestones,
      next_milestone_info: nextMilestone
    });

  } catch (error) {
    console.error('Error fetching streak data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streak data' },
      { status: 500 }
    );
  }
}