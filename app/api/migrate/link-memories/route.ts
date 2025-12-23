// app/api/migrate/link-memories/route.ts
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

    const { fromUserId, toUserId, anonUserId, authenticatedUserId, character } = await req.json();
    
    // Support both old format (fromUserId/toUserId) and new format (anonUserId/authenticatedUserId)
    const sourceUserId = fromUserId || anonUserId;
    const targetUserId = toUserId || authenticatedUserId;
    
    if (!sourceUserId || !targetUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: fromUserId/anonUserId and toUserId/authenticatedUserId required' }, 
        { status: 400 }
      );
    }

    // Default character if not provided
    const characterKey = character || 'lexi';

    // Verify the authenticated user ID matches the session user
    if (user.id !== targetUserId) {
      return NextResponse.json(
        { error: 'User ID mismatch' }, 
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    
    console.log(`🔄 Starting memory transfer from ${sourceUserId} to ${targetUserId} for character ${characterKey}`);
    
    const transferResults = {
      memories: 0,
      interactions: 0,
      dailyUsage: 0,
      enhancedMemorySkipped: false
    };

    // 1. Transfer legacy memories table
    // Check if sourceUserId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isSourceUUID = uuidRegex.test(sourceUserId);
    
    if (isSourceUUID) {
      try {
        const { data: memoriesResult, error: memoriesError } = await admin
          .from('memories')
          .update({ user_id: targetUserId })
          .eq('user_id', sourceUserId)
          .eq('character', characterKey)
          .select('id');

        if (memoriesError) {
          console.error('Failed to transfer memories:', memoriesError);
          // Don't return error for this, continue with other transfers
        } else {
          transferResults.memories = memoriesResult?.length || 0;
          console.log(`✅ Transferred ${transferResults.memories} legacy memories`);
        }
      } catch (error) {
        console.error('Legacy memories transfer error:', error);
        // Don't return error for this, continue with other transfers
      }
    } else {
      console.log(`⚠️ Skipping legacy memories table transfer - source user ID '${sourceUserId}' is not a valid UUID (likely anonymous user)`);
    }

    // 2. Transfer interaction_log (this table also requires UUID user_id)
    if (isSourceUUID) {
      try {
        const { data: interactionResult, error: interactionError } = await admin
          .from('interaction_log')
          .update({ user_id: targetUserId })
          .eq('user_id', sourceUserId)
          .eq('character_key', characterKey)
          .select('id');

        if (interactionError) {
          console.log('No interaction_log to transfer or error:', interactionError);
        } else {
          transferResults.interactions = interactionResult?.length || 0;
          console.log(`✅ Transferred ${transferResults.interactions} interaction logs`);
        }
      } catch (error) {
        console.log('Interaction log transfer error (table may not exist):', error);
      }
    } else {
      console.log(`⚠️ Skipping interaction_log transfer - source user ID '${sourceUserId}' is not a valid UUID (likely anonymous user)`);
    }

    // 3. Transfer daily chat usage (this table also requires UUID user_id)
    if (isSourceUUID) {
      try {
        const { data: usageResult, error: usageError } = await admin
          .from('daily_chat_usage')
          .update({ user_id: targetUserId })
          .eq('user_id', sourceUserId)
          .eq('character_key', characterKey)
          .select('id');

        if (usageError) {
          console.log('No daily chat usage to transfer or error:', usageError);
        } else {
          transferResults.dailyUsage = usageResult?.length || 0;
          console.log(`✅ Transferred ${transferResults.dailyUsage} daily usage records`);
        }
      } catch (error) {
        console.log('Daily usage transfer error:', error);
      }
    } else {
      console.log(`⚠️ Skipping daily_chat_usage transfer - source user ID '${sourceUserId}' is not a valid UUID (likely anonymous user)`);
    }

    // 4. Enhanced memory tables (user_facts, emotional_states, episodic_memories)
    // These have foreign key constraints to auth.users, so anonymous users can't use them
    // We'll log this limitation for now
    if (sourceUserId.startsWith('anon-')) {
      console.log('⚠️ Enhanced memory tables (user_facts, emotional_states, episodic_memories) cannot be used by anonymous users due to auth.users foreign key constraints');
      transferResults.enhancedMemorySkipped = true;
    } else {
      // If source is also an authenticated user, transfer enhanced memory tables
      const enhancedTables = ['user_facts', 'emotional_states', 'episodic_memories', 'memory_triggers'];
      
      for (const tableName of enhancedTables) {
        try {
          const { error: enhancedError } = await admin
            .from(tableName)
            .update({ user_id: targetUserId })
            .eq('user_id', sourceUserId)
            .eq('character_key', characterKey);
            
          if (enhancedError) {
            console.log(`Enhanced table ${tableName} transfer error:`, enhancedError);
          } else {
            console.log(`✅ Transferred ${tableName} records`);
          }
        } catch (error) {
          console.log(`Enhanced table ${tableName} transfer error:`, error);
        }
      }
    }

    console.log(`✅ Successfully completed memory transfer from ${sourceUserId} to ${targetUserId} for ${characterKey}`);
    console.log('Transfer summary:', transferResults);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully transferred memories for ${characterKey}`,
      transferResults,
      sourceUserId,
      targetUserId,
      character: characterKey
    });

  } catch (error) {
    console.error('Memory linking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}