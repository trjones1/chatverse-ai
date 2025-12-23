import {
  authenticateRequest,
  getAnonymousUserEntitlements,
} from '@/lib/auth-headers';
import { rateLimit, createRateLimitHeaders } from '@/lib/rate-limiting';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  getMemoryForUser,
  logInteraction,
  updateVisitTracking,
  extractTopics,
} from '@/lib/memorySystem';
import { buildCharacterMemoryContext } from '@/lib/memoryEnhancements';
import { chatLog, dbLog } from '@/lib/logger';
import { getCharacterConfig } from '@/lib/characters.config';
import { getPersonalityPrompt } from '@/lib/personalityPrompts';
import { getRecentTipsForContext, buildTipContextForPrompt } from '@/lib/tipSystem';
import { getRichUserProfile, buildEmotionallyIntelligentContext } from '@/lib/aiEnhancedContext';
import { NextRequest } from 'next/server';

const admin = getSupabaseAdmin();

export const dynamic = 'force-dynamic';

// Background processing function - runs after response is sent
async function processInBackground(
  userId: string,
  userIdSource: string,
  character: string,
  userMessage: string,
  aiResponse: string,
  conversationHistory: any[],
  nsfwMode: boolean,
  currentSessionId: string | null
) {
  try {
    console.log('🔄 BACKGROUND: Starting async processing for user:', userId);

    // Import heavy functions only when needed
    const { processConversationWithAI } = await import('@/lib/aiEnhancedMemory');
    const {
      updateEmotionalState,
      createEpisode,
      upsertUserFacts
    } = await import('@/lib/memorySystem');

    // Only run heavy processing for authenticated users
    if (userIdSource === 'authenticated') {
      // AI-enhanced name extraction (async)
      try {
        console.log('🤖 BACKGROUND: Starting AI name extraction...');
        const nameExtractionPrompt = `Based on this conversation, what name does the character "${character}" use to address the user?

User message: "${userMessage}"
Character response: "${aiResponse}"

If a name is mentioned, respond ONLY with that name. If no clear name is used, respond with "unknown".`;

        const nameResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: nameExtractionPrompt }],
            max_tokens: 10,
            temperature: 0
          })
        });

        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          const extractedName = nameData.choices?.[0]?.message?.content?.trim();

          if (extractedName && extractedName !== 'unknown' && extractedName.length > 0 && extractedName.length < 50) {
            await upsertUserFacts(userId, { display_name: extractedName }, character);
            console.log('🤖 BACKGROUND: Name extracted and stored:', extractedName);
          }
        }
      } catch (nameError) {
        console.error('🤖 BACKGROUND: Error in name extraction:', nameError);
      }

      // Enhanced emotional state processing (async)
      try {
        console.log('💭 BACKGROUND: Processing emotional state...');
        const userTopics = extractTopics(userMessage);
        const emotionDeltas: Record<string, number> = {};

        // Positive interaction increases affection
        if (userTopics.includes('relationship') || aiResponse.toLowerCase().includes('love')) {
          emotionDeltas.affection = 1;
        }

        // Intimate topics increase trust and affection
        if (userTopics.includes('intimate') || nsfwMode) {
          emotionDeltas.trust = 1;
          emotionDeltas.affection = 2;
        }

        // Apply emotional updates if any
        if (Object.keys(emotionDeltas).length > 0) {
          await updateEmotionalState(userId, emotionDeltas, character);
          console.log('💭 BACKGROUND: Emotional state updated');
        }
      } catch (emotionError) {
        console.error('💭 BACKGROUND: Error updating emotional state:', emotionError);
      }

      // Create episodic memories (async)
      try {
        console.log('📚 BACKGROUND: Creating episodic memory...');
        const userTopics = extractTopics(userMessage);
        if (userTopics.length > 0 || userMessage.length > 100) {
          const summary = userMessage.length > 200 ? userMessage.substring(0, 200) + '...' : userMessage;
          const title = userTopics.length > 0 ? `Conversation about ${userTopics.join(', ')}` : 'Chat session';
          const salience = userTopics.includes('family') || userTopics.includes('relationship') ? 0.8 : 0.5;

          await createEpisode(
            userId,
            summary,
            userTopics,
            salience,
            title,
            5, // emotional impact
            userTopics, // trigger keywords
            character
          );
          console.log('📚 BACKGROUND: Episodic memory created');
        }
      } catch (episodeError) {
        console.error('📚 BACKGROUND: Error creating episode:', episodeError);
      }

      // AI-enhanced comprehensive analysis (async) - This is the BIG one
      try {
        console.log('🧠 BACKGROUND: Starting comprehensive AI analysis...');
        await processConversationWithAI(
          userId,
          character,
          userMessage,
          aiResponse,
          conversationHistory
        );
        console.log('🧠 BACKGROUND: Comprehensive AI analysis completed');
      } catch (aiError) {
        console.error('🧠 BACKGROUND: Error in comprehensive AI analysis:', aiError);
      }
    }

    console.log('✅ BACKGROUND: All async processing completed');
  } catch (error) {
    console.error('❌ BACKGROUND: Error in background processing:', error);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestStartTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    console.log('🎬 STREAMING API: Request received:', { requestId, timestamp: new Date().toISOString() });

    const body = await req.json();
    const { message } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine character based on hostname
    const host = req.headers.get('host') || 'chatwithlexi.com';
    const config = getCharacterConfig(host);
    const character = config.key;

    console.log('🔍 STREAMING API: Character determined:', { host, character });

    // Authenticate and apply rate limiting
    const authResult = await authenticateRequest(req, { character, debug: true });
    const { user, userId: resolvedUserId, userIdSource, isAuthenticated } = authResult;

    // CRITICAL: Check actual subscription tier from database, not user metadata
    let userTier: 'anonymous' | 'free' | 'sfw' | 'nsfw' = 'anonymous';

    if (isAuthenticated) {
      try {
        const { data: subscription } = await admin
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', resolvedUserId)
          .eq('character_key', character)
          .eq('status', 'active')
          .single();

        if (subscription?.tier) {
          userTier = subscription.tier as 'free' | 'sfw' | 'nsfw';
        } else {
          userTier = 'free';
        }
      } catch (error) {
        console.warn(`⚠️ Error checking subscription tier:`, error);
        userTier = 'free';
      }
    }

    const rateLimitResult = await rateLimit(req, {
      endpoint: 'chat',
      userId: resolvedUserId,
      character,
      userTier,
    });

    if (!rateLimitResult.allowed) {
      const headers = createRateLimitHeaders(rateLimitResult);
      return new Response(JSON.stringify({
        error: rateLimitResult.isBlocked ? 'Temporarily blocked due to abuse' : 'Rate limit exceeded',
        code: rateLimitResult.isBlocked ? 'TEMPORARILY_BLOCKED' : 'RATE_LIMIT_EXCEEDED',
        limit: rateLimitResult.limit,
        count: rateLimitResult.count,
      }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Get user entitlements quickly
    let userEntitlements;
    if (isAuthenticated && user) {
      try {
        const { data: entitlements } = await admin.rpc('get_user_entitlements', {
          p_user_id: user.id,
          p_character_key: character
        });
        const result = entitlements?.[0];
        userEntitlements = result ? {
          tier: result.tier,
          can_chat: result.can_chat,
          can_use_nsfw: result.can_use_nsfw,
          voice_credits: result.voice_credits,
        } : { tier: 'free', can_chat: false, can_use_nsfw: false, voice_credits: 0 };
      } catch (error) {
        userEntitlements = { tier: 'free', can_chat: false, can_use_nsfw: false, voice_credits: 0 };
      }
    } else {
      userEntitlements = getAnonymousUserEntitlements(character);
    }

    if (!userEntitlements.can_chat) {
      return new Response(JSON.stringify({
        error: 'Daily chat limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
      }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }

    // Determine NSFW mode
    const nsfwMode = userEntitlements.can_use_nsfw && (user?.user_metadata?.nsfwMode === true);

    // Log user interaction immediately (don't wait)
    const userTopics = extractTopics(message);
    const currentSessionId = null; // Simplified for streaming
    logInteraction(resolvedUserId!, 'user', message, character, userTopics, nsfwMode, undefined, currentSessionId)
      .catch(error => console.error('Error logging user interaction:', error));

    // Get conversation history quickly (limit to recent messages for speed)
    let conversationHistory: any[] = [];
    let reconnectionContext = '';

    if (userIdSource === 'authenticated') {
      try {
        const { data: recentMemories } = await admin
          .from('memories')
          .select('message, created_at')
          .eq('user_id', resolvedUserId)
          .eq('character', character)
          .order('created_at', { ascending: false })
          .limit(10); // Reduced for speed

        if (recentMemories && recentMemories.length > 0) {
          // Quick reconnection context
          const lastMessageDate = new Date(recentMemories[0].created_at);
          const daysSinceLastMessage = Math.floor((Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceLastMessage >= 1) {
            reconnectionContext = daysSinceLastMessage === 1
              ? `\n\nRECONNECTION NOTE: It's been about a day since you last talked. Show warmth about reconnecting.`
              : `\n\nRECONNECTION NOTE: It's been ${daysSinceLastMessage} days since you last talked. Express happiness about them coming back.`;
          }

          conversationHistory = recentMemories.reverse()
            .map(m => m.message)
            .filter(msg => msg && msg.role && msg.content);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
      }
    }

    // Build context quickly (simplified for speed)
    let enhancedContext = '';
    if (userIdSource === 'authenticated' && resolvedUserId) {
      try {
        // Try rich profile first, fallback to basic memory
        const richProfile = await getRichUserProfile(resolvedUserId, character);
        if (richProfile) {
          enhancedContext = buildEmotionallyIntelligentContext(richProfile, character, config.displayName);
        } else {
          const memory = await getMemoryForUser(resolvedUserId, character);
          enhancedContext = buildCharacterMemoryContext(memory, character, config.displayName) || '';
        }
      } catch (error) {
        console.error('Error building context:', error);
      }
    }

    // Get personality prompt and tip context
    const personalityPrompt = getPersonalityPrompt(character, nsfwMode);
    let tipContext = '';
    if (userIdSource === 'authenticated' && resolvedUserId) {
      try {
        const recentTips = await getRecentTipsForContext(resolvedUserId, character, 24);
        tipContext = buildTipContextForPrompt(recentTips, character);
      } catch (error) {
        console.error('Error getting tip context:', error);
      }
    }

    // Check for selfie (simplified)
    let willSendSelfie = false;
    let selfieContext = '';
    if (resolvedUserId) {
      try {
        const { shouldIncludeSelfie } = await import('@/lib/selfieSystem');
        willSendSelfie = await shouldIncludeSelfie(character, message, userIdSource === 'authenticated' ? resolvedUserId : undefined);
        if (willSendSelfie) {
          selfieContext = `\n\n🖼️ SELFIE CONTEXT: You are sending a selfie with this response. Be flirty and reference the photo you're sharing.`;
        }
      } catch (error) {
        console.log('Error checking selfie eligibility:', error);
      }
    }

    // Build system message
    const systemMessage = `${personalityPrompt}${enhancedContext}${tipContext}${reconnectionContext}${selfieContext}`;

    const messages = [
      { role: 'system', content: systemMessage },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const openrouterModel = nsfwMode ? 'gryphe/mythomax-l2-13b' : 'openai/gpt-4o-mini';

    console.log('🚀 STREAMING API: Starting OpenRouter stream...', { model: openrouterModel, messageCount: messages.length });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: openrouterModel,
              messages,
              stream: true,
            }),
          });

          if (!response.ok) {
            console.error('OpenRouter API error:', response.status);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'AI service unavailable' })}\n\n`));
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Stream unavailable' })}\n\n`));
            controller.close();
            return;
          }

          let fullResponse = '';
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              buffer += chunk;

              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    // Stream completed - start background processing
                    console.log('🔄 STREAMING API: Stream completed, starting background processing...');

                    // Process selfie if needed
                    let selfieData = null;
                    if (willSendSelfie && fullResponse && resolvedUserId) {
                      try {
                        const { getCharacterSelfie, extractMoodFromMessage, generateFlirtyCaptionForSelfie } = await import('@/lib/selfieSystem');
                        const mood = extractMoodFromMessage(message);
                        selfieData = await getCharacterSelfie({
                          character,
                          userId: userIdSource === 'authenticated' ? resolvedUserId : undefined,
                          mood,
                          nsfwMode: nsfwMode && userIdSource === 'authenticated',
                          messageContext: message.substring(0, 100),
                          excludeRecentHours: 24
                        });

                        if (selfieData) {
                          const flirtyCaption = generateFlirtyCaptionForSelfie(selfieData, character);
                          selfieData.caption = flirtyCaption;
                        }
                      } catch (selfieError) {
                        console.error('Error processing selfie:', selfieError);
                      }
                    }

                    // Send final data with selfie and nsfw flag
                    const finalData = {
                      done: true,
                      selfie: selfieData || undefined,
                      nsfw: nsfwMode
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finalData)}\n\n`));

                    // Log AI response immediately (don't wait)
                    const aiTopics = extractTopics(fullResponse);
                    logInteraction(resolvedUserId!, 'assistant', fullResponse, character, aiTopics, nsfwMode, selfieData, currentSessionId)
                      .catch(error => console.error('Error logging AI interaction:', error));

                    // Start heavy background processing asynchronously (don't await)
                    processInBackground(
                      resolvedUserId!,
                      userIdSource,
                      character,
                      message,
                      fullResponse,
                      conversationHistory,
                      nsfwMode,
                      currentSessionId
                    );

                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullResponse += content;
                      // Send the streaming chunk to client
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                  } catch (parseError) {
                    // Skip invalid JSON chunks
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
          controller.close();
        }
      }
    });

    console.log('✅ STREAMING API: Returning stream response', {
      requestId,
      setupTime: Date.now() - requestStartTime
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...createRateLimitHeaders(rateLimitResult)
      },
    });

  } catch (error) {
    console.error('💥 STREAMING API: Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      requestId,
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}