// app/api/memory/summarizer/route.ts
// Nightly job to process interactions into episodic memories
// Can be triggered by Vercel Cron or external CRON service

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createEpisode } from '@/lib/memorySystem';

const supabase = getSupabaseAdmin();

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authorization (could use API key or basic auth)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.MEMORY_CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧠 Starting memory summarization job');

    // Get users who had interactions in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Get distinct users who had interactions in the last 24 hours
    const { data: activeUsers } = await supabase
      .rpc('get_active_users_for_summarizer', { 
        since_date: oneDayAgo.toISOString() 
      });

    if (!activeUsers || activeUsers.length === 0) {
      console.log('No active users found');
      return NextResponse.json({ message: 'No users to process' });
    }

    console.log(`Processing ${activeUsers.length} active users`);

    let processedUsers = 0;
    let createdEpisodes = 0;

    for (const { user_id, character_key } of activeUsers) {
      try {
        await processUserMemories(user_id, character_key);
        processedUsers++;
        
        // Apply memory decay
        await applyMemoryDecay(user_id);
        
      } catch (error) {
        console.error(`Error processing user ${user_id}:`, error);
      }
    }

    console.log(`✅ Processed ${processedUsers} users, created ${createdEpisodes} episodes`);

    return NextResponse.json({
      message: 'Memory summarization completed',
      processedUsers,
      createdEpisodes
    });

  } catch (error) {
    console.error('Memory summarization job failed:', error);
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 });
  }
}

async function processUserMemories(userId: string, characterKey: string): Promise<void> {
  // Get yesterday's interactions
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const { data: interactions } = await supabase
    .from('interaction_log')
    .select('*')
    .eq('user_id', userId)
    .eq('character_key', characterKey)
    .gte('created_at', oneDayAgo.toISOString())
    .order('created_at', { ascending: true });

  if (!interactions || interactions.length < 2) {
    return; // Need at least a back-and-forth to create episode
  }

  // Group interactions into conversation segments
  const conversationText = interactions
    .map(i => `${i.role}: ${i.content}`)
    .join('\n');

  // Extract topics from all interactions
  const allTopics = interactions.reduce((topics, interaction) => {
    const interactionTopics = Array.isArray(interaction.topics) ? interaction.topics : [];
    return [...topics, ...interactionTopics];
  }, [] as string[]);

  const uniqueTopics = [...new Set(allTopics)] as string[];

  // Use AI to create episode summary (simple approach for now)
  const episodeSummary = await createEpisodeSummary(conversationText, uniqueTopics);
  
  if (episodeSummary) {
    // Calculate salience based on conversation length, topics, and emotional content
    const salience = calculateSalience(interactions, uniqueTopics);
    
    await createEpisode(userId, episodeSummary, uniqueTopics, salience, undefined, 5, [], characterKey);
    
    console.log(`Created episode for user ${userId}: ${episodeSummary.substring(0, 50)}...`);
  }
}

async function createEpisodeSummary(conversationText: string, topics: string[]): Promise<string | null> {
  try {
    // Simple approach: extract key moments from conversation
    // In production, this could use AI to generate better summaries
    
    const lines = conversationText.split('\n');
    const userMessages = lines.filter(line => line.startsWith('user:')).length;
    const assistantMessages = lines.filter(line => line.startsWith('assistant:')).length;
    
    if (userMessages === 0) return null;
    
    // Create a simple summary
    let summary = '';
    
    if (topics.includes('work')) {
      summary = 'Discussed work and career topics';
    } else if (topics.includes('relationship')) {
      summary = 'Had intimate relationship conversation';
    } else if (topics.includes('emotions')) {
      summary = 'Shared feelings and emotional support';
    } else if (topics.includes('hobbies')) {
      summary = 'Talked about hobbies and interests';
    } else {
      summary = 'Had a meaningful conversation';
    }
    
    // Add context about conversation length
    if (userMessages > 5) {
      summary += ' (long conversation)';
    }
    
    return summary;
    
  } catch (error) {
    console.error('Error creating episode summary:', error);
    return null;
  }
}

function calculateSalience(interactions: any[], topics: string[]): number {
  let salience = 0.3; // Base salience
  
  // Longer conversations are more salient
  salience += Math.min(0.3, interactions.length * 0.02);
  
  // Certain topics increase salience
  if (topics.includes('relationship')) salience += 0.2;
  if (topics.includes('intimate')) salience += 0.2;
  if (topics.includes('emotions')) salience += 0.15;
  if (topics.includes('family')) salience += 0.1;
  
  // Cap at 1.0
  return Math.min(1.0, salience);
}

async function applyMemoryDecay(userId: string): Promise<void> {
  try {
    // Apply decay to all episodes for this user
    const { data: episodes } = await supabase
      .from('episodic_memories')
      .select('id, salience, last_referenced_at, reference_count, created_at')
      .eq('user_id', userId);

    if (!episodes) return;

    for (const episode of episodes) {
      const lastRef = new Date(episode.last_referenced_at || episode.created_at);
      const now = new Date();
      const daysSince = Math.max(1, Math.floor((now.getTime() - lastRef.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Apply exponential decay: ~1.5% fade per day
      let newSalience = episode.salience * Math.pow(0.985, daysSince);
      
      // Reinforcement bonus slows decay
      const reinforceBonus = 0.05 * Math.log(1 + (episode.reference_count || 0));
      newSalience += reinforceBonus;
      
      // Update if salience changed significantly
      if (Math.abs(newSalience - episode.salience) > 0.01) {
        await supabase
          .from('episodic_memories')
          .update({ salience: Math.max(0, Math.min(1, newSalience)) })
          .eq('id', episode.id);
      }
    }

    // Clean up very low salience episodes (< 0.05) that are old
    await supabase
      .from('episodic_memories')
      .delete()
      .eq('user_id', userId)
      .lt('salience', 0.05)
      .lt('last_referenced_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 days old

  } catch (error) {
    console.error('Error applying memory decay:', error);
  }
}