// Admin API endpoint to run AI data migration
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const admin = getSupabaseAdmin();

/**
 * Quick migration for a specific user/character combination
 */
async function migrateUserData(userId: string, character: string) {
  try {
    console.log(`🔄 Migrating data for user ${userId}, character ${character}...`);

    // Get recent conversation history
    const { data: conversations, error: convError } = await admin
      .from('interaction_log')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .eq('character_key', character)
      .order('created_at', { ascending: false })
      .limit(30);

    if (convError || !conversations || conversations.length === 0) {
      return { success: false, error: 'No conversation history found' };
    }

    // Format conversation for AI analysis
    const conversationText = conversations
      .reverse()
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Quick AI analysis for user facts
    const analysisPrompt = `Analyze this conversation and extract user facts in JSON format:

${conversationText}

Return JSON with this structure:
{
  "display_name": "name or null",
  "occupation": "job or null",
  "favorites": {"hobbies": [], "interests": []},
  "communication_style": "style description",
  "tags": ["descriptive", "tags"]
}

Return ONLY the JSON, no other text.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      return { success: false, error: 'AI analysis failed' };
    }

    const aiResult = await response.json();
    const analysisText = aiResult.choices?.[0]?.message?.content?.trim();

    if (!analysisText) {
      return { success: false, error: 'Empty AI response' };
    }

    let enhancedFacts;
    try {
      enhancedFacts = JSON.parse(analysisText);
    } catch (parseError) {
      return { success: false, error: 'Failed to parse AI response' };
    }

    // Update user_facts
    const { error: updateError } = await admin
      .from('user_facts')
      .upsert({
        user_id: userId,
        character_key: character,
        display_name: enhancedFacts.display_name,
        occupation: enhancedFacts.occupation,
        favorites: JSON.stringify(enhancedFacts.favorites || {}),
        tags: enhancedFacts.tags || [],
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      return { success: false, error: 'Database update failed' };
    }

    // Add metadata to emotional state
    const { data: emotionalState } = await admin
      .from('emotional_states')
      .select('*')
      .eq('user_id', userId)
      .eq('character_key', character)
      .single();

    if (emotionalState) {
      const avgPositive = (emotionalState.affection + emotionalState.trust + emotionalState.playfulness) / 3;
      const relationshipStatus = avgPositive > 70 ? 'thriving' : avgPositive > 50 ? 'stable' : 'developing';

      await admin
        .from('emotional_states')
        .update({
          metadata: {
            relationship_status: relationshipStatus,
            last_ai_reasoning: `Migration enhancement: ${relationshipStatus} relationship`,
            enhanced_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('character_key', character);
    }

    return {
      success: true,
      data: {
        enhanced_facts: enhancedFacts,
        relationship_status: emotionalState ? 'updated' : 'not_found'
      }
    };

  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, character, action } = body;

    if (!userId || !character) {
      return NextResponse.json({
        error: 'Missing userId or character'
      }, { status: 400 });
    }

    if (action === 'migrate_user') {
      const result = await migrateUserData(userId, character);
      return NextResponse.json(result);
    }

    if (action === 'migrate_all') {
      // Get all unique user/character combinations
      const { data: combinations, error } = await admin
        .from('user_facts')
        .select('user_id, character_key')
        .order('updated_at', { ascending: true });

      if (error) {
        return NextResponse.json({ error: 'Failed to get user combinations' }, { status: 500 });
      }

      const results = [];
      for (const combo of combinations.slice(0, 10)) { // Limit to 10 for safety
        const result = await migrateUserData(combo.user_id, combo.character_key);
        results.push({
          user_id: combo.user_id,
          character: combo.character_key,
          ...result
        });

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return NextResponse.json({
        success: true,
        processed: results.length,
        results
      });
    }

    return NextResponse.json({
      error: 'Invalid action. Use "migrate_user" or "migrate_all"'
    }, { status: 400 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}