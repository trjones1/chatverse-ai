// app/api/messages/archive/route.ts - Message archiving and export functionality
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest } from '@/lib/auth-headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { character, action, messageIds, archiveReason } = await req.json();
    
    const authResult = await authenticateRequest(req, { character, debug: true });
    const { userId, isAuthenticated } = authResult;
    
    if (!userId || !isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    
    switch (action) {
      case 'archive_selected':
        return await archiveSelectedMessages(admin, userId, character, messageIds, archiveReason);
      case 'archive_old':
        return await archiveOldMessages(admin, userId, character);
      case 'restore':
        return await restoreMessages(admin, userId, character, messageIds);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Archive API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const character = searchParams.get('character') || 'lexi';
    const action = searchParams.get('action');
    
    const authResult = await authenticateRequest(req, { character, debug: true });
    const { userId, isAuthenticated } = authResult;
    
    if (!userId || !isAuthenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    
    switch (action) {
      case 'list_archived':
        return await listArchivedMessages(admin, userId, character, searchParams);
      case 'export':
        return await exportMessages(admin, userId, character, searchParams);
      case 'stats':
        return await getArchiveStats(admin, userId, character);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Archive API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function archiveSelectedMessages(
  admin: any, 
  userId: string, 
  character: string, 
  messageIds: string[], 
  reason: string = 'manual'
) {
  try {
    // Get messages to archive
    const { data: messages } = await admin
      .from('interaction_log')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character)
      .in('id', messageIds);

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages found' }, { status: 404 });
    }

    // Archive messages
    const archivedMessages = messages.map((msg: any) => ({
      original_message_id: msg.id,
      user_id: userId,
      character_key: character,
      session_id: msg.session_id,
      role: msg.role,
      content: msg.content,
      topics: msg.topics,
      emotional_tone: msg.emotional_tone,
      nsfw: msg.nsfw,
      message_size_bytes: msg.message_size_bytes || msg.content.length,
      metadata: msg.metadata || {},
      original_created_at: msg.created_at,
      archive_reason: reason,
      is_important: msg.metadata?.is_important || false,
      is_favorite: msg.metadata?.is_favorite || false
    }));

    const { error: archiveError } = await admin
      .from('archived_messages')
      .insert(archivedMessages);

    if (archiveError) {
      throw archiveError;
    }

    // Delete from interaction_log
    const { error: deleteError } = await admin
      .from('interaction_log')
      .delete()
      .in('id', messageIds);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ 
      success: true, 
      archivedCount: messages.length,
      message: `Successfully archived ${messages.length} messages`
    });
  } catch (error) {
    console.error('Error archiving selected messages:', error);
    return NextResponse.json({ error: 'Failed to archive messages' }, { status: 500 });
  }
}

async function archiveOldMessages(admin: any, userId: string, character: string) {
  try {
    const { data, error } = await admin.rpc('archive_old_messages', {
      p_user_id: userId,
      p_character_key: character,
      p_force_archive: true
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      archivedCount: data || 0,
      message: `Successfully archived ${data || 0} old messages`
    });
  } catch (error) {
    console.error('Error archiving old messages:', error);
    return NextResponse.json({ error: 'Failed to archive old messages' }, { status: 500 });
  }
}

async function restoreMessages(admin: any, userId: string, character: string, messageIds: string[]) {
  try {
    // Get archived messages
    const { data: archivedMessages } = await admin
      .from('archived_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character)
      .in('id', messageIds);

    if (!archivedMessages || archivedMessages.length === 0) {
      return NextResponse.json({ error: 'No archived messages found' }, { status: 404 });
    }

    // Restore to interaction_log
    const restoredMessages = archivedMessages.map((msg: any) => ({
      id: msg.original_message_id,
      user_id: userId,
      character_key: character,
      session_id: msg.session_id,
      role: msg.role,
      content: msg.content,
      topics: msg.topics,
      emotional_tone: msg.emotional_tone,
      nsfw: msg.nsfw,
      message_size_bytes: msg.message_size_bytes,
      metadata: { ...msg.metadata, restored_at: new Date().toISOString() },
      created_at: msg.original_created_at
    }));

    const { error: restoreError } = await admin
      .from('interaction_log')
      .insert(restoredMessages);

    if (restoreError) {
      throw restoreError;
    }

    // Delete from archived_messages
    const { error: deleteError } = await admin
      .from('archived_messages')
      .delete()
      .in('id', messageIds);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ 
      success: true, 
      restoredCount: archivedMessages.length,
      message: `Successfully restored ${archivedMessages.length} messages`
    });
  } catch (error) {
    console.error('Error restoring messages:', error);
    return NextResponse.json({ error: 'Failed to restore messages' }, { status: 500 });
  }
}

async function listArchivedMessages(admin: any, userId: string, character: string, searchParams: URLSearchParams) {
  try {
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const archiveReason = searchParams.get('archive_reason');
    const onlyImportant = searchParams.get('only_important') === 'true';

    let query = admin
      .from('archived_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character);

    if (archiveReason) {
      query = query.eq('archive_reason', archiveReason);
    }

    if (onlyImportant) {
      query = query.eq('is_important', true);
    }

    const { data, error, count } = await query
      .order('archived_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      messages: data || [],
      count: data?.length || 0,
      totalCount: count,
      hasMore: (count || 0) > offset + limit
    });
  } catch (error) {
    console.error('Error listing archived messages:', error);
    return NextResponse.json({ error: 'Failed to list archived messages' }, { status: 500 });
  }
}

async function exportMessages(admin: any, userId: string, character: string, searchParams: URLSearchParams) {
  try {
    const format = searchParams.get('format') || 'json';
    const includeArchived = searchParams.get('include_archived') === 'true';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Get active messages
    let activeQuery = admin
      .from('interaction_log')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character);

    if (dateFrom) {
      activeQuery = activeQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      activeQuery = activeQuery.lte('created_at', dateTo);
    }

    const { data: activeMessages } = await activeQuery.order('created_at', { ascending: true });

    let archivedMessages = [];
    if (includeArchived) {
      let archivedQuery = admin
        .from('archived_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('character_key', character);

      if (dateFrom) {
        archivedQuery = archivedQuery.gte('original_created_at', dateFrom);
      }
      if (dateTo) {
        archivedQuery = archivedQuery.lte('original_created_at', dateTo);
      }

      const { data } = await archivedQuery.order('original_created_at', { ascending: true });
      archivedMessages = data || [];
    }

    const allMessages = [
      ...(activeMessages || []).map((msg: any) => ({ ...msg, source: 'active' })),
      ...archivedMessages.map((msg: any) => ({ 
        ...msg, 
        created_at: msg.original_created_at, 
        source: 'archived' 
      }))
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let exportData: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'txt':
        exportData = formatAsTxt(allMessages, character);
        contentType = 'text/plain';
        filename = `${character}_messages_${new Date().toISOString().split('T')[0]}.txt`;
        break;
      case 'csv':
        exportData = formatAsCsv(allMessages);
        contentType = 'text/csv';
        filename = `${character}_messages_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'json':
      default:
        exportData = formatAsJson(allMessages, character);
        contentType = 'application/json';
        filename = `${character}_messages_${new Date().toISOString().split('T')[0]}.json`;
        break;
    }

    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': exportData.length.toString()
      }
    });
  } catch (error) {
    console.error('Error exporting messages:', error);
    return NextResponse.json({ error: 'Failed to export messages' }, { status: 500 });
  }
}

async function getArchiveStats(admin: any, userId: string, character: string) {
  try {
    const { count: activeCount } = await admin
      .from('interaction_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('character_key', character);

    const { count: archivedCount } = await admin
      .from('archived_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('character_key', character);

    const { count: importantCount } = await admin
      .from('archived_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('character_key', character)
      .eq('is_important', true);

    return NextResponse.json({
      activeMessages: activeCount || 0,
      archivedMessages: archivedCount || 0,
      importantMessages: importantCount || 0,
      totalMessages: (activeCount || 0) + (archivedCount || 0)
    });
  } catch (error) {
    console.error('Error getting archive stats:', error);
    return NextResponse.json({ error: 'Failed to get archive stats' }, { status: 500 });
  }
}

function formatAsTxt(messages: any[], character: string): string {
  const header = `Chat History with ${character.charAt(0).toUpperCase() + character.slice(1)}\n`;
  const separator = '='.repeat(50) + '\n';
  
  let content = header + separator;
  
  for (const message of messages) {
    const timestamp = new Date(message.created_at).toLocaleString();
    const sender = message.role === 'user' ? 'You' : character.charAt(0).toUpperCase() + character.slice(1);
    const sourceTag = message.source === 'archived' ? ' [ARCHIVED]' : '';
    
    content += `[${timestamp}] ${sender}${sourceTag}:\n${message.content}\n\n`;
  }
  
  return content;
}

function formatAsCsv(messages: any[]): string {
  const headers = 'Timestamp,Sender,Content,Topics,NSFW,Source,Session ID\n';
  
  let content = headers;
  
  for (const message of messages) {
    const timestamp = new Date(message.created_at).toISOString();
    const sender = message.role;
    const content_escaped = `"${message.content.replace(/"/g, '""')}"`;
    const topics = `"${(message.topics || []).join(', ')}"`;
    const nsfw = message.nsfw ? 'true' : 'false';
    const source = message.source || 'active';
    const sessionId = message.session_id || '';
    
    content += `${timestamp},${sender},${content_escaped},${topics},${nsfw},${source},${sessionId}\n`;
  }
  
  return content;
}

function formatAsJson(messages: any[], character: string): string {
  // Create a safe, clean JSON export with only conversation content
  const cleanMessages = messages.map(message => ({
    timestamp: new Date(message.created_at).toISOString(),
    sender: message.role === 'user' ? 'You' : character.charAt(0).toUpperCase() + character.slice(1),
    content: message.content,
    isNsfw: message.nsfw || false
  }));

  const exportData = {
    exportedAt: new Date().toISOString(),
    character: character.charAt(0).toUpperCase() + character.slice(1),
    totalMessages: messages.length,
    conversations: cleanMessages
  };

  return JSON.stringify(exportData, null, 2);
}