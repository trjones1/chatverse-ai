// app/api/migrate/transfer-all-memories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { makeServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { fromUserId } = await req.json();
    
    if (!fromUserId) {
      return NextResponse.json(
        { error: 'Missing required field: fromUserId' }, 
        { status: 400 }
      );
    }

    const targetUserId = user.id;
    
    console.log(`🔄 Starting comprehensive memory transfer from ${fromUserId} to ${targetUserId}`);

    const admin = getSupabaseAdmin();
    
    // Get all characters this anonymous user has chatted with
    const { data: charactersData, error: charactersError } = await admin
      .from('memories')
      .select('character')
      .eq('user_id', fromUserId);
    
    if (charactersError) {
      console.error('Failed to get characters:', charactersError);
      return NextResponse.json({ error: 'Failed to get user characters' }, { status: 500 });
    }

    const characters = [...new Set(charactersData?.map(m => m.character) || [])];
    console.log(`📚 Found memories for characters: ${characters.join(', ')}`);
    
    const transferResults: Record<string, any> = {};

    // Transfer memories for each character
    for (const character of characters) {
      console.log(`🔄 Transferring memories for ${character}...`);
      
      const characterResults = {
        memories: 0,
        interactions: 0,
        dailyUsage: 0,
        enhancedMemorySkipped: false
      };

      // 1. Transfer legacy memories table
      try {
        const { data: memoriesResult, error: memoriesError } = await admin
          .from('memories')
          .update({ user_id: targetUserId })
          .eq('user_id', fromUserId)
          .eq('character', character)
          .select('id');

        if (memoriesError) {
          console.error(`Failed to transfer memories for ${character}:`, memoriesError);
        } else {
          characterResults.memories = memoriesResult?.length || 0;
          console.log(`✅ Transferred ${characterResults.memories} legacy memories for ${character}`);
        }
      } catch (error) {
        console.error(`Legacy memories transfer error for ${character}:`, error);
      }

      // 2. Transfer interaction_log (this table allows any user_id string)
      try {
        const { data: interactionResult, error: interactionError } = await admin
          .from('interaction_log')
          .update({ user_id: targetUserId })
          .eq('user_id', fromUserId)
          .eq('character_key', character)
          .select('id');

        if (interactionError) {
          console.log(`No interaction_log to transfer for ${character} or error:`, interactionError);
        } else {
          characterResults.interactions = interactionResult?.length || 0;
          console.log(`✅ Transferred ${characterResults.interactions} interaction logs for ${character}`);
        }
      } catch (error) {
        console.log(`Interaction log transfer error for ${character}:`, error);
      }

      // 3. Transfer daily chat usage
      try {
        const { data: usageResult, error: usageError } = await admin
          .from('daily_chat_usage')
          .update({ user_id: targetUserId })
          .eq('user_id', fromUserId)
          .eq('character_key', character)
          .select('id');

        if (usageError) {
          console.log(`No daily chat usage to transfer for ${character} or error:`, usageError);
        } else {
          characterResults.dailyUsage = usageResult?.length || 0;
          console.log(`✅ Transferred ${characterResults.dailyUsage} daily usage records for ${character}`);
        }
      } catch (error) {
        console.log(`Daily usage transfer error for ${character}:`, error);
      }

      // 4. Enhanced memory tables note
      if (fromUserId.startsWith('anon-')) {
        characterResults.enhancedMemorySkipped = true;
      }

      transferResults[character] = characterResults;
      console.log(`✅ Completed transfer for ${character}:`, characterResults);
    }

    console.log(`✅ Successfully completed comprehensive memory transfer from ${fromUserId} to ${targetUserId}`);
    console.log('Transfer summary:', transferResults);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully transferred memories for ${characters.length} characters: ${characters.join(', ')}`,
      transferResults,
      charactersTransferred: characters,
      sourceUserId: fromUserId,
      targetUserId
    });

  } catch (error) {
    console.error('Comprehensive memory transfer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}