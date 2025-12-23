import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    console.log(`🔄 Starting user chat/relationship cleanup for user: ${userId}`);

    // Execute cleanup for this specific user only (chat & relationship data ONLY)
    // Keep subscriptions, voice credits, and payment data intact

    // 1. Clear enhanced memory tables for this user (in dependency order)
    // Memory triggers first (references episodic_memories)
    const { count: memoryTriggers } = await supabase
      .from('memory_triggers')
      .delete()
      .eq('user_id', userId);
    
    // User facts (references episodic_memories)
    const { count: userFacts } = await supabase
      .from('user_facts')
      .delete()
      .eq('user_id', userId);
    
    // Emotional states
    const { count: emotionalStates } = await supabase
      .from('emotional_states')
      .delete()
      .eq('user_id', userId);
    
    // Episodic memories
    const { count: episodicMemories } = await supabase
      .from('episodic_memories')
      .delete()
      .eq('user_id', userId);
    
    // Interaction log (chat messages) - THIS IS THE MAIN ONE
    const { count: interactionLog } = await supabase
      .from('interaction_log')
      .delete()
      .eq('user_id', userId);

    // 2. Clear legacy memory tables
    await supabase.from('lexi_mem_interactions').delete().eq('user_id', userId);
    await supabase.from('lexi_mem_episodes').delete().eq('user_id', userId);
    await supabase.from('lexi_mem_facts').delete().eq('user_id', userId);
    
    const { count: memories } = await supabase
      .from('memories')
      .delete()
      .eq('user_id', userId);

    // 3. Clear user's daily chat usage
    const { count: chatUsage } = await supabase
      .from('daily_chat_usage')
      .delete()
      .eq('user_id', userId);

    // NOTE: Keep subscriptions, voice credits, and payment data intact!

    console.log(`✅ User chat/relationship cleanup completed successfully for user: ${userId}`);

    return NextResponse.json({
      success: true,
      userId: userId,
      // Chat & relationship data wiped
      memories: memories || 0,
      chatUsage: chatUsage || 0,
      // Enhanced memory system
      interactionLog: interactionLog || 0,
      episodicMemories: episodicMemories || 0,
      emotionalStates: emotionalStates || 0,
      userFacts: userFacts || 0,
      memoryTriggers: memoryTriggers || 0,
      // Payment data kept intact
      keptSubscription: true,
      keptVoiceCredits: true,
    });

  } catch (error: any) {
    console.error('❌ User chat/relationship cleanup failed:', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}