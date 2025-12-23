import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/admin';

export async function POST() {
  // Only allow when admin tools are enabled AND not in production
  if (!process.env.ENABLE_ADMIN_TOOLS || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Admin tools not enabled or production mode' }, { status: 403 });
  }

  try {
    const supabase = await createClient();

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Execute NUCLEAR cleanup in order to avoid foreign key constraints
    console.log('🧨 Starting NUCLEAR admin cleanup...');

    // 1. Clear voice credit ledger first (references voice_wallets)
    const { count: voiceCredits } = await supabase
      .from('voice_credit_ledger')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // 2. Clear voice wallets
    const { count: voiceWallets } = await supabase
      .from('voice_wallets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // 3. Clear tip ledger
    const { count: tipLedger } = await supabase
      .from('tip_ledger')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // 4. Clear enhanced memory tables (in dependency order)
    // Memory triggers first (references episodic_memories)
    const { count: memoryTriggers } = await supabase
      .from('memory_triggers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // User facts (references episodic_memories)
    const { count: userFacts } = await supabase
      .from('user_facts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Emotional states
    const { count: emotionalStates } = await supabase
      .from('emotional_states')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Episodic memories
    const { count: episodicMemories } = await supabase
      .from('episodic_memories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Interaction log (chat messages)
    const { count: interactionLog } = await supabase
      .from('interaction_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // 5. Clear legacy memory tables
    await supabase.from('lexi_mem_interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('lexi_mem_episodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('lexi_mem_facts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { count: memories } = await supabase
      .from('memories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // 6. Clear daily chat usage
    const { count: chatUsage } = await supabase
      .from('daily_chat_usage')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // 7. Clear user display names
    const { count: displayNames } = await supabase
      .from('user_display_names')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // 8. Clear user subscriptions last
    const { count: userSubscriptions } = await supabase
      .from('user_subscriptions')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    console.log('✅ NUCLEAR admin cleanup completed successfully');

    return NextResponse.json({
      success: true,
      userSubscriptions: userSubscriptions || 0,
      voiceWallets: voiceWallets || 0,
      voiceCredits: voiceCredits || 0,
      tipLedger: tipLedger || 0,
      memories: memories || 0,
      chatUsage: chatUsage || 0,
      displayNames: displayNames || 0,
      // Enhanced memory system
      interactionLog: interactionLog || 0,
      episodicMemories: episodicMemories || 0,
      emotionalStates: emotionalStates || 0,
      userFacts: userFacts || 0,
      memoryTriggers: memoryTriggers || 0,
    });

  } catch (error: any) {
    console.error('❌ NUCLEAR admin cleanup failed:', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}