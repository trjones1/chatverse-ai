// app/api/debug/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId') || '7eb8ef71-8605-4ecb-9a92-17a14ac7431a';
    
    // Get recent messages for all users with Lexi to find the right user ID
    const { data: allMessages, error: allError } = await admin
      .from('memories')
      .select('user_id, character, message, created_at')
      .eq('character', 'lexi')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Group by user ID and get message info
    const userGroups = allMessages?.reduce((acc, row) => {
      const userId = row.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          count: 0,
          lastMessage: null,
          lastMessageDate: null,
          isTarget: userId === targetUserId
        };
      }
      acc[userId].count++;
      
      // Keep track of the most recent message
      if (!acc[userId].lastMessage || new Date(row.created_at) > new Date(acc[userId].lastMessageDate || 0)) {
        acc[userId].lastMessage = row.message?.content?.substring(0, 100) || 'No content';
        acc[userId].lastMessageDate = row.created_at;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Check specifically for target user messages
    const { data: targetMessages, error: targetError } = await admin
      .from('memories')
      .select('*')
      .eq('character', 'lexi')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      message: 'Chat history debug for Lexi',
      targetUserId,
      targetUserMessages: {
        count: targetMessages?.length || 0,
        messages: targetMessages?.map(m => ({
          role: m.message?.role,
          content: m.message?.content?.substring(0, 50) + '...',
          created_at: m.created_at,
          nsfw: m.nsfw,
          nsfwType: typeof m.nsfw
        })) || []
      },
      allUserGroups: userGroups,
      totalUsersWithMessages: Object.keys(userGroups || {}).length,
      totalMessages: allMessages?.length || 0,
      possibleMismatch: Object.keys(userGroups || {}).length > 0 && (targetMessages?.length || 0) === 0
    });
    
  } catch (error) {
    console.error('Debug messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}