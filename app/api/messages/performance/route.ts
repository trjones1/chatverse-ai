// app/api/messages/performance/route.ts - Performance monitoring and analytics
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest } from '@/lib/auth-headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const character = searchParams.get('character') || 'lexi';
    const action = searchParams.get('action') || 'dashboard';
    
    const authResult = await authenticateRequest(req, { character, debug: true });
    const { userId, isAuthenticated } = authResult;
    
    if (!userId || !isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    
    switch (action) {
      case 'dashboard':
        return await getPerformanceDashboard(admin, userId, character);
      case 'metrics':
        return await getDetailedMetrics(admin, userId, character, searchParams);
      case 'warnings':
        return await getWarnings(admin, userId, character);
      case 'usage_trends':
        return await getUsageTrends(admin, userId, character, searchParams);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { character, action, preferences } = await req.json();
    
    const authResult = await authenticateRequest(req, { character, debug: true });
    const { userId, isAuthenticated } = authResult;
    
    if (!userId || !isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    
    switch (action) {
      case 'update_preferences':
        return await updateUserPreferences(admin, userId, character, preferences);
      case 'force_cleanup':
        return await forceCleanup(admin, userId, character);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getPerformanceDashboard(admin: any, userId: string, character: string) {
  try {
    // Get user's subscription tier and limits
    let userTier = 'free';
    let orders = null;

    try {
      const { data } = await admin
        .from('orders')
        .select('tier')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);
      orders = data;
      userTier = orders?.[0]?.tier || 'free';
    } catch (error) {
      console.log('⚠️  Orders query failed (using free tier):', error);
    }

    const tierLimits = {
      free: { messages: 50, name: 'Free' },
      premium: { messages: 200, name: 'Premium' },
      premium_plus: { messages: 500, name: 'Premium+' }
    };

    const currentLimit = tierLimits[userTier as keyof typeof tierLimits] || tierLimits.free;

    // Get current message count
    let activeMessages = 0;
    try {
      const { count } = await admin
        .from('interaction_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('character_key', character);
      activeMessages = count || 0;
    } catch (error) {
      console.log('⚠️  Interaction log query failed:', error);
    }

    // Try to get session stats (optional)
    let activeSessions = 0;
    try {
      const { count } = await admin
        .from('conversation_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('character_key', character)
        .eq('is_active', true);
      activeSessions = count || 0;
    } catch (error) {
      console.log('⚠️  Conversation sessions table not available');
    }

    // Try to get archive stats (optional)
    let archivedMessages = 0;
    try {
      const { count } = await admin
        .from('archived_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('character_key', character);
      archivedMessages = count || 0;
    } catch (error) {
      console.log('⚠️  Archived messages table not available');
    }

    // Calculate usage percentage
    const usagePercentage = Math.round(((activeMessages || 0) / currentLimit.messages) * 100);
    
    // Determine warning level
    let warningLevel = 'none';
    let warningMessage = '';
    let suggestions: string[] = [];

    if (usagePercentage >= 100) {
      warningLevel = 'critical';
      warningMessage = 'You have reached your message limit. Older messages are being automatically archived.';
      suggestions = [
        'Upgrade your subscription for more messages',
        'Export important conversations before they are archived',
        'Manually archive older conversations'
      ];
    } else if (usagePercentage >= 90) {
      warningLevel = 'performance_warning';
      warningMessage = 'You are approaching your message limit.';
      suggestions = [
        'Consider upgrading your subscription',
        'Archive older conversations to free up space',
        'Export conversations you want to keep'
      ];
    } else if (usagePercentage >= 80) {
      warningLevel = 'approaching_limit';
      warningMessage = 'You are getting close to your message limit.';
      suggestions = [
        'Monitor your usage regularly',
        'Consider archiving older messages'
      ];
    }

    // Try to get user preferences (optional)
    let preferences = null;
    try {
      const { data } = await admin
        .from('user_message_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('character_key', character)
        .single();
      preferences = data;
    } catch (error) {
      console.log('⚠️  User preferences table not available');
    }

    return NextResponse.json({
      overview: {
        activeMessages: activeMessages || 0,
        messageLimit: currentLimit.messages,
        usagePercentage,
        archivedMessages: archivedMessages || 0,
        activeSessions: activeSessions || 0,
        userTier: currentLimit.name
      },
      warning: {
        level: warningLevel,
        message: warningMessage,
        suggestions
      },
      preferences: preferences || {
        message_limit_preference: currentLimit.messages,
        auto_archive_days: 30,
        preserve_favorites: true,
        preserve_milestones: true,
        export_format: 'json'
      },
      recommendations: generateRecommendations(
        activeMessages || 0, 
        currentLimit.messages, 
        userTier, 
        archivedMessages || 0
      )
    });
  } catch (error) {
    console.error('Error getting performance dashboard:', error);
    return NextResponse.json({ error: 'Failed to get performance dashboard' }, { status: 500 });
  }
}

async function getDetailedMetrics(admin: any, userId: string, character: string, searchParams: URLSearchParams) {
  try {
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: metrics } = await admin
      .from('message_performance_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    // Get session activity
    const { data: sessions } = await admin
      .from('conversation_sessions')
      .select('started_at, ended_at, message_count, is_active')
      .eq('user_id', userId)
      .eq('character_key', character)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: true });

    return NextResponse.json({
      metrics: metrics || [],
      sessions: sessions || [],
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error getting detailed metrics:', error);
    return NextResponse.json({ error: 'Failed to get detailed metrics' }, { status: 500 });
  }
}

async function getWarnings(admin: any, userId: string, character: string) {
  try {
    // Get current warning level
    const { data: currentMetrics } = await admin
      .from('message_performance_metrics')
      .select('warning_level, total_messages, updated_at')
      .eq('user_id', userId)
      .eq('character_key', character)
      .order('metric_date', { ascending: false })
      .limit(1);

    // Get user's message limit
    const { data: orders } = await admin
      .from('orders')
      .select('tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    const tier = orders?.[0]?.tier || 'free';
    const limits = { free: 50, premium: 200, premium_plus: 500 };
    const userLimit = limits[tier as keyof typeof limits] || 50;

    const warnings = [];
    const currentCount = currentMetrics?.[0]?.total_messages || 0;
    const warningLevel = currentMetrics?.[0]?.warning_level || 'none';

    if (warningLevel !== 'none') {
      warnings.push({
        type: 'usage',
        level: warningLevel,
        title: 'Message Limit Warning',
        message: `You have ${currentCount} messages out of ${userLimit} allowed.`,
        action: 'Consider archiving older messages or upgrading your subscription.',
        timestamp: currentMetrics?.[0]?.updated_at
      });
    }

    // Check for old sessions
    const { data: oldSessions } = await admin
      .from('conversation_sessions')
      .select('id, title, last_activity_at')
      .eq('user_id', userId)
      .eq('character_key', character)
      .eq('is_active', true)
      .lt('last_activity_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (oldSessions && oldSessions.length > 0) {
      warnings.push({
        type: 'sessions',
        level: 'info',
        title: 'Inactive Sessions',
        message: `You have ${oldSessions.length} inactive sessions that could be closed.`,
        action: 'Close inactive sessions to improve performance.',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ warnings });
  } catch (error) {
    console.error('Error getting warnings:', error);
    return NextResponse.json({ error: 'Failed to get warnings' }, { status: 500 });
  }
}

async function getUsageTrends(admin: any, userId: string, character: string, searchParams: URLSearchParams) {
  try {
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily message counts
    const { data } = await admin
      .from('interaction_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('character_key', character)
      .gte('created_at', startDate.toISOString());

    // Group by date
    const dailyCounts: { [key: string]: number } = {};
    (data || []).forEach((msg: any) => {
      const date = msg.created_at.split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // Fill in missing dates with 0
    const trends = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trends.unshift({
        date: dateStr,
        messageCount: dailyCounts[dateStr] || 0
      });
    }

    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error getting usage trends:', error);
    return NextResponse.json({ error: 'Failed to get usage trends' }, { status: 500 });
  }
}

async function updateUserPreferences(admin: any, userId: string, character: string, preferences: any) {
  try {
    const { error } = await admin
      .from('user_message_preferences')
      .upsert({
        user_id: userId,
        character_key: character,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}

async function forceCleanup(admin: any, userId: string, character: string) {
  try {
    // Run cleanup operations
    const archiveResult = await admin.rpc('archive_old_messages', {
      p_user_id: userId,
      p_character_key: character,
      p_force_archive: true
    });

    // Close old sessions
    const { error: sessionError } = await admin
      .from('conversation_sessions')
      .update({ 
        is_active: false, 
        ended_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('character_key', character)
      .lt('last_activity_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

    if (sessionError) {
      console.error('Error closing old sessions:', sessionError);
    }

    return NextResponse.json({ 
      success: true, 
      archivedMessages: archiveResult.data || 0,
      message: 'Cleanup completed successfully'
    });
  } catch (error) {
    console.error('Error during force cleanup:', error);
    return NextResponse.json({ error: 'Failed to perform cleanup' }, { status: 500 });
  }
}

function generateRecommendations(
  activeMessages: number, 
  limit: number, 
  tier: string, 
  archivedMessages: number
): Array<{ type: string; title: string; description: string; action: string }> {
  const recommendations = [];
  const usagePercentage = (activeMessages / limit) * 100;

  if (tier === 'free' && usagePercentage > 70) {
    recommendations.push({
      type: 'upgrade',
      title: 'Upgrade to Premium',
      description: 'Get 4x more messages (200 vs 50) and unlock advanced features.',
      action: 'upgrade_premium'
    });
  }

  if (tier === 'premium' && usagePercentage > 80) {
    recommendations.push({
      type: 'upgrade',
      title: 'Upgrade to Premium+',
      description: 'Get 2.5x more messages (500 vs 200) for heavy users.',
      action: 'upgrade_premium_plus'
    });
  }

  if (usagePercentage > 60) {
    recommendations.push({
      type: 'maintenance',
      title: 'Archive Old Messages',
      description: 'Free up space by archiving conversations older than 30 days.',
      action: 'archive_old'
    });
  }

  if (archivedMessages > 100) {
    recommendations.push({
      type: 'export',
      title: 'Export Your History',
      description: 'Download your complete conversation history as backup.',
      action: 'export_messages'
    });
  }

  return recommendations;
}