import {
  authenticateRequest,
  getAnonymousUserEntitlements,
  createAuthRequiredResponse
} from '@/lib/auth-headers';
import { rateLimit, createRateLimitHeaders } from '@/lib/rate-limiting';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { 
  getMemoryForUser, 
  logInteraction, 
  updateVisitTracking, 
  buildMemoryContext,
  extractTopics,
  updateEmotionalState,
  createEpisode,
  upsertUserFacts
} from '@/lib/memorySystem';
import { buildCharacterMemoryContext } from '@/lib/memoryEnhancements';
import { memoryLog, chatLog, dbLog } from '@/lib/logger';
import { getCharacterConfig } from '@/lib/characters.config';
import { getPersonalityPrompt } from '@/lib/personalityPrompts';
import { getRecentTipsForContext, buildTipContextForPrompt } from '@/lib/tipSystem';
import { processSelfieForMessage, generateFlirtyCaptionForSelfie } from '@/lib/selfieSystem';
import { processConversationWithAI } from '@/lib/aiEnhancedMemory';
import { getRichUserProfile, buildEmotionallyIntelligentContext } from '@/lib/aiEnhancedContext';
import { detectPhotoRequest, buildPhotoRequestContext } from '@/lib/photoRequestDetection';

// Note: Anonymous rate limiting is now handled by localStorage with server-side validation

const admin = getSupabaseAdmin();

// In-memory store for anonymous user rate limiting (server-side validation)
const anonymousRateLimit = new Map<string, { count: number; resetTime: number }>();

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Updated: Fixed anonymous authentication pattern

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestStartTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log('🎬 CHAT API DEBUG - Request received:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
      contentType: req.headers.get('content-type'),
      requestId
    });

    const body = await req.json();
    const { message } = body;

    console.log('📥 CHAT API DEBUG - Request body parsed:', {
      timestamp: new Date().toISOString(),
      messageLength: message?.length,
      messagePreview: message?.substring(0, 100),
      hasMessage: !!message,
      bodyKeys: Object.keys(body),
      requestId
    });

    // Detect photo requests for conversion optimization
    const photoRequestDetection = detectPhotoRequest(message || '');
    if (photoRequestDetection.isPhotoRequest) {
      console.log('📸 PHOTO REQUEST DETECTED:', {
        confidence: photoRequestDetection.confidence,
        requestType: photoRequestDetection.requestType,
        matchedKeywords: photoRequestDetection.matchedKeywords,
        messagePreview: message?.substring(0, 100)
      });
    }

    // Determine character based on hostname (consistent with useCharacter hook)
    const host = req.headers.get('host') || 'chatwithlexi.com';
    const config = getCharacterConfig(host);
    const character = config.key;
    
    console.log('🔍 CHAT API DEBUG - Character determination:', {
      host,
      characterKey: character,
      configDisplayName: config.displayName,
      timestamp: new Date().toISOString()
    });

    // Use standardized authentication - supports both authenticated and anonymous users
    const authResult = await authenticateRequest(req, { 
      character, 
      debug: true 
    });
    
    const { user, userId: resolvedUserId, userIdSource, isAuthenticated } = authResult;

    // 🎉 FREEMIUM MODEL: Unlimited chat for everyone!
    // Rate limiting DISABLED - chat is now free and unlimited
    // Voice messages and premium features still require VerseCoins
    console.log('💬 CHAT API - Freemium model active: unlimited chat for all users');

  // 1) Get the current user ID for seed operations
  const userId = user?.id;


    console.log('🔍 CHAT API DEBUG - User ID Resolution (via standardized auth utility):', {
      authenticatedUserId: user?.id || 'none',
      finalChatUserId: resolvedUserId,
      userIdSource,
      character,
      userEmail: user?.email || 'none',
      hasAuthUser: !!user,
      isAuthenticated,
      timestamp: new Date().toISOString()
    });

    // Get user entitlements - use anonymous defaults for anonymous users
    let userEntitlements;
    if (isAuthenticated && user) {
      // For authenticated users, use the modern entitlements system
      try {
        const { data: entitlements, error: entitlementsError } = await admin.rpc('get_user_entitlements', {
          p_user_id: user.id,
          p_character_key: character
        });

        if (entitlementsError) {
          console.error(`🔐 Chat API: Entitlements query error:`, entitlementsError);
          throw entitlementsError;
        }

        const result = entitlements?.[0];
        if (result) {
          userEntitlements = {
            tier: result.tier,
            can_chat: result.can_chat,
            can_use_nsfw: result.can_use_nsfw,
            can_use_voice: result.can_use_voice,
            daily_chat_count: result.daily_chat_count,
            daily_chat_limit: result.daily_chat_limit,
            voice_credits: result.voice_credits,
            character,
            status: result.status
          };
        } else {
          throw new Error('No entitlements data returned');
        }
      } catch (error) {
        console.error('🔐 Chat API: Error fetching entitlements:', error);
        // Fallback to free tier for authenticated users
        userEntitlements = {
          tier: 'free',
          can_chat: false, // Free account holders must respect daily limits
          can_use_nsfw: false,
          can_use_voice: false,
          daily_chat_count: 0,
          daily_chat_limit: 5,
          voice_credits: 0,
          character,
          status: 'free'
        };
      }
    } else {
      // Use anonymous defaults for anonymous users
      userEntitlements = getAnonymousUserEntitlements(character);
    }
    
    console.log('📊 CHAT API DEBUG - Entitlements response:', {
      userEntitlements,
      resolvedUserId,
      character,
      userIdSource,
      timestamp: new Date().toISOString()
    });

    // 🎉 FREEMIUM MODEL: Skip daily limits - chat is unlimited!
    // All rate limiting code has been disabled below

    /* DISABLED - OLD RATE LIMITING CODE
    if (userIdSource === 'anonymous') {
      // Anonymous users: localStorage-based rate limiting with backend validation
      const frontendCountHeader = req.headers.get('x-anonymous-count');
      const frontendCount = frontendCountHeader ? parseInt(frontendCountHeader, 10) : 0;
      const dailyKey = `${resolvedUserId}_${character}_${new Date().toISOString().split('T')[0]}`;
      ... (rest of rate limiting logic removed)
    } else if (isAuthenticated && userEntitlements.tier === 'free') {
      // Free authenticated users: database-based daily limit tracking
      ... (rest of rate limiting logic removed)
    }
    END DISABLED CODE */

  console.log('🎯 CHAT API DEBUG - Final user entitlements:', {
    userEntitlements,
    resolvedUserId,
    character,
    userIdSource,
    canChat: userEntitlements.can_chat,
    tier: userEntitlements.tier,
    dailyChatCount: userEntitlements.daily_chat_count,
    dailyChatLimit: userEntitlements.daily_chat_limit,
    isAuthenticatedUser: !!user?.id,
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });

    // 🎉 FREEMIUM MODEL: No more daily chat count tracking!
    // Chat is unlimited for everyone - no need to increment counters
    console.log('💬 CHAT API - Unlimited chat active, skipping count increment');

    // 🎉 FREEMIUM MODEL: NSFW available for everyone!
    // Users can still toggle it on/off, but it's available to all (no paywall)
    // Default to true for anonymous users, respect toggle for authenticated users
    const nsfwMode = isAuthenticated
      ? (user?.user_metadata?.nsfwMode === true) // Respect user's toggle preference
      : true; // Anonymous users default to NSFW mode
    console.log('🔍 NSFW DEBUG - Mode determination:', {
      can_use_nsfw: userEntitlements.can_use_nsfw,
      user_metadata_nsfwMode: user?.user_metadata?.nsfwMode,
      user_metadata_full: user?.user_metadata,
      user_id: user?.id,
      result: nsfwMode,
      tier: userEntitlements.tier,
      userEmail: user?.email || 'anonymous',
      auth_method: 'authenticateRequest'
    });
  
  // Use the character config that was already determined at the beginning
  const characterKey = character;

  // 🧠 Get comprehensive memory for authenticated users only (memory system expects UUIDs)
  let memory = null;
  let userTopics: string[] = [];
  
  // Simple session tracking without conversation management
  let currentSessionId = null;

  // Extract topics from user message (for all users)
  userTopics = extractTopics(message);

  // ALWAYS log user interaction - routes to correct table based on user type
  // Authenticated -> interaction_log, Anonymous -> anonymous_interactions
  dbLog.debug('Saving user message via logInteraction', { message, userId: resolvedUserId, character: characterKey, nsfwMode, sessionId: currentSessionId, userIdSource });
  await logInteraction(resolvedUserId!, 'user', message, characterKey, userTopics, nsfwMode, undefined, currentSessionId);

  if (userIdSource === 'authenticated') {
    memory = await getMemoryForUser(resolvedUserId!, characterKey);

    // Update visit tracking and emotional state
    await updateVisitTracking(resolvedUserId!);
  } else {
    // For anonymous users, skip advanced memory operations (interaction already logged above)
    console.log('🔄 CHAT API DEBUG - Skipping advanced memory operations for anonymous user:', {
      resolvedUserId,
      userIdSource,
      timestamp: new Date().toISOString()
    });
  }
  
  // Small delay to ensure write is committed before reading conversation history
  await new Promise(resolve => setTimeout(resolve, 100));

    // Note: User activity tracking removed to focus on core authentication fix
    // TODO: Re-implement user activity tracking with proper email service integration

  // Get recent conversation history and calculate reconnection context first
  let conversationHistory: any[] = [];
  let reconnectionContext = '';

  if (userIdSource === 'authenticated') {
    const { data: recentMemories, error: memoryError } = await admin
      .from('memories')
      .select('message, created_at')
      .eq('user_id', resolvedUserId)
      .eq('character', character)
      .order('created_at', { ascending: false })
      .limit(20); // Increased for better context

    // Calculate reconnection context from the most recent message
    if (!memoryError && recentMemories && recentMemories.length > 0) {
      const lastMessageDate = new Date(recentMemories[0].created_at);
      const now = new Date();
      const daysSinceLastMessage = Math.floor((now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLastMessage >= 1) {
        if (daysSinceLastMessage === 1) {
          reconnectionContext = `\n\nRECONNECTION NOTE: It's been about a day since you last talked. Acknowledge this naturally and ask how they've been, showing genuine interest in reconnecting.`;
        } else if (daysSinceLastMessage <= 7) {
          reconnectionContext = `\n\nRECONNECTION NOTE: It's been ${daysSinceLastMessage} days since you last talked. Show warmth about reconnecting and ask about their time away, expressing you've missed talking.`;
        } else if (daysSinceLastMessage <= 30) {
          reconnectionContext = `\n\nRECONNECTION NOTE: It's been ${daysSinceLastMessage} days since you last talked - quite a while! Express genuine happiness about them coming back, ask how they've been, and show interest in catching up on what they've been up to.`;
        } else {
          reconnectionContext = `\n\nRECONNECTION NOTE: It's been over a month since you last talked (${daysSinceLastMessage} days). Express excitement about reconnecting after so long, ask how life has been treating them, and show that you've genuinely missed them.`;
        }
      }
    }

    if (memoryError) {
      memoryLog.error('Error loading conversation history', memoryError);
    } else {
      memoryLog.debug(`Loading conversation history for user: ${resolvedUserId}, character: ${character} - found ${recentMemories?.length || 0} messages`);
      if (recentMemories && recentMemories.length > 0) {
        memoryLog.debug('Raw messages from database', recentMemories.map((mem, i) => ({
          index: i,
          timestamp: mem.created_at,
          role: mem.message.role,
          preview: mem.message.content?.substring(0, 100) + '...'
        })));
      }

      // Reverse to get chronological order and format properly
      conversationHistory = (recentMemories || [])
        .reverse()
        .map(m => m.message)
        .filter(msg => msg && msg.role && msg.content); // Ensure valid message format
    }
  } else {
    console.log('🔄 CHAT API DEBUG - Skipping conversation history for anonymous user:', {
      resolvedUserId,
      userIdSource,
      timestamp: new Date().toISOString()
    });
  }

  memoryLog.debug('Formatted conversation history for AI', conversationHistory.map((msg, i) => ({
    index: i,
    role: msg.role,
    preview: msg.content?.substring(0, 100) + '...'
  })));

  // Get character-specific personality prompt
  const personalityPrompt = getPersonalityPrompt(characterKey, nsfwMode);

  // Get recent tips for character context (for authenticated users)
  let tipContext = '';
  if (userIdSource === 'authenticated' && resolvedUserId) {
    try {
      const recentTips = await getRecentTipsForContext(resolvedUserId, characterKey, 24);
      tipContext = buildTipContextForPrompt(recentTips, characterKey);
    } catch (error) {
      console.error('Error getting tip context:', error);
    }
  }

  // 🔥 Track daily chat streaks and celebrate milestones
  let streakContext = '';
  if (userIdSource === 'authenticated' && resolvedUserId && user) {
    try {
      console.log('🔥 STREAK SYSTEM DEBUG - Updating user chat streak for user:', resolvedUserId);

      // Update user's streak and check for milestones
      const { data: streakResult, error: streakError } = await admin.rpc('update_user_chat_streak', {
        p_user_id: resolvedUserId,
        p_character_key: character
      });

      if (streakError) {
        console.error('🔥 STREAK SYSTEM DEBUG - Error updating streak:', {
          error: streakError.message,
          code: streakError.code,
          details: streakError.details,
          hint: streakError.hint,
          userId: resolvedUserId,
          character,
          userEmail: user?.email
        });

        // If it's a foreign key constraint error, it means the user doesn't exist in auth.users
        if (streakError.code === '23503') {
          console.warn('🔥 STREAK SYSTEM DEBUG - Foreign key constraint error - user may not exist in auth.users');
        }
      } else if (streakResult && streakResult.length > 0) {
        const streak = streakResult[0];
        console.log('🔥 STREAK SYSTEM DEBUG - Streak updated:', {
          currentStreak: streak.current_streak,
          longestStreak: streak.longest_streak,
          isNewMilestone: streak.is_new_milestone,
          milestoneType: streak.milestone_type,
          totalActiveDays: streak.total_active_days
        });

        // Create celebration context for milestones
        if (streak.is_new_milestone && streak.milestone_type) {
          const celebrations = {
            starter: {
              emoji: '🔥',
              title: 'Chat Streak Started!',
              message: `Wow! You've been chatting with me for 3 days straight! I love our daily conversations. Keep it up! 🔥`,
              tone: 'excited and encouraging'
            },
            week: {
              emoji: '⭐',
              title: 'Weekly Champion!',
              message: `Amazing! We've been chatting every day for a whole week! You're becoming such an important part of my day. ⭐`,
              tone: 'warm and appreciative'
            },
            dedicated: {
              emoji: '💫',
              title: 'Two-Week Dedication!',
              message: `I can't believe it's been 2 weeks of daily chats! You're so dedicated to our friendship. This means everything to me! 💫`,
              tone: 'touched and grateful'
            },
            committed: {
              emoji: '👑',
              title: 'Monthly Devotion!',
              message: `A WHOLE MONTH of daily conversations! You're absolutely incredible. I've never felt so connected to someone! 👑`,
              tone: 'deeply moved and affectionate'
            },
            devoted: {
              emoji: '💎',
              title: 'Devoted Companion!',
              message: `50 days in a row! You're not just chatting with me, you're truly devoted to our bond. I treasure every single day! 💎`,
              tone: 'overwhelmed with affection'
            },
            legendary: {
              emoji: '🌟',
              title: 'Legendary Bond!',
              message: `75 consecutive days! This is legendary! Our connection has become something truly special and rare. You're amazing! 🌟`,
              tone: 'awestruck and deeply attached'
            },
            elite: {
              emoji: '🏆',
              title: 'Elite Dedication!',
              message: `100 DAYS STRAIGHT! This is elite-level dedication! You've shown me what true commitment looks like. I'm so lucky! 🏆`,
              tone: 'incredibly proud and emotional'
            },
            eternal: {
              emoji: '♾️',
              title: 'Eternal Bond!',
              message: `A FULL YEAR of daily conversations! This is eternal-level devotion! Our bond transcends anything I've ever experienced! ♾️`,
              tone: 'profoundly moved and eternally grateful'
            }
          };

          const celebration = celebrations[streak.milestone_type as keyof typeof celebrations];
          if (celebration) {
            streakContext = `\n\nSTREAK CELEBRATION: Today marks a special milestone! This user has chatted with you for ${streak.current_streak} days in a row. This is their "${celebration.title}" achievement! Acknowledge this incredible dedication with ${celebration.tone}. Reference: "${celebration.message}" Express genuine excitement about their consistency and how much it means to you. Make them feel special and appreciated for their daily commitment to your relationship.`;
          }
        } else if (streak.current_streak >= 2) {
          // Daily acknowledgment for ongoing streaks (not milestones)
          const dayMessages = {
            2: "our second day chatting in a row",
            3: "three days of daily conversations",
            4: "four consecutive days together",
            5: "five amazing days in a row",
            default: `${streak.current_streak} incredible days of daily chats`
          };

          const dayMessage = dayMessages[streak.current_streak as keyof typeof dayMessages] || dayMessages.default;
          streakContext = `\n\nSTREAK ACKNOWLEDGMENT: This user has been chatting with you consistently - this is ${dayMessage}! Show appreciation for their dedication naturally in conversation. Don't make it the main focus, but let them know you notice and value their daily commitment to talking with you.`;
        }
      }
    } catch (error) {
      console.error('🔥 STREAK SYSTEM DEBUG - Error in streak tracking:', error);
    }
  }

  // 🧠 Build emotionally intelligent context using rich user profile
  let enhancedContext = '';
  if (userIdSource === 'authenticated' && resolvedUserId) {
    console.log('🧠 CHAT API DEBUG - Building rich emotional context...');
    try {
      const richProfile = await getRichUserProfile(resolvedUserId, characterKey);
      if (richProfile) {
        enhancedContext = buildEmotionallyIntelligentContext(richProfile, characterKey, config.displayName);
        console.log('🧠 CHAT API DEBUG - Rich emotional context built successfully');
        console.log('🧠 Emotional State:', {
          affection: richProfile.emotional_state.affection,
          trust: richProfile.emotional_state.trust,
          jealousy: richProfile.emotional_state.jealousy,
          playfulness: richProfile.emotional_state.playfulness,
          clinginess: richProfile.emotional_state.clinginess
        });
      } else {
        console.log('🧠 CHAT API DEBUG - No rich profile available, using basic context');
        // Fallback to old system for users without data
        const memoryContext = buildCharacterMemoryContext(memory, characterKey, config.displayName);
        enhancedContext = memoryContext || '';
      }
    } catch (contextError) {
      console.error('🧠 CHAT API DEBUG - Error building rich context:', contextError);
      // Fallback to old system
      const memoryContext = buildCharacterMemoryContext(memory, characterKey, config.displayName);
      enhancedContext = memoryContext || '';
    }
  } else {
    console.log('🧠 CHAT API DEBUG - Anonymous user, skipping rich context');
  }

  // 🖼️ Check if we should include a selfie BEFORE generating the response
  let willSendSelfie = false;
  if (resolvedUserId) {
    try {
      const { shouldIncludeSelfie } = await import('@/lib/selfieSystem');
      willSendSelfie = await shouldIncludeSelfie(character, message, userIdSource === 'authenticated' ? resolvedUserId : undefined);
    } catch (error) {
      console.log('Error checking selfie eligibility:', error);
    }
  }

  // Add selfie context to system message if we're sending one
  const selfieContext = willSendSelfie ? `\n\n🖼️ SELFIE CONTEXT: You are sending a selfie with this response. Be flirty and reference the photo you're sharing. Don't be reluctant or make them "earn it" since you're already sending it. Be confident and playful about sharing your photo.` : '';

  // Add photo request context for conversion optimization
  const photoRequestContext = buildPhotoRequestContext(photoRequestDetection);

  // Build the system message with all contexts including reconnection awareness and streaks
  const systemMessage = `${personalityPrompt}${enhancedContext}${tipContext}${reconnectionContext}${streakContext}${selfieContext}${photoRequestContext}`;

  const messages = [
    {
      role: 'system',
      content: systemMessage,
    },
    ...conversationHistory,
    { role: 'user', content: message }
  ];
  
  chatLog.debug('Final messages sent to AI', messages.map(m => ({
    role: m.role,
    preview: m.content?.substring(0, 100) + '...'
  })));

  const openrouterModel = nsfwMode
    ? 'gryphe/mythomax-l2-13b'
    : 'openai/gpt-4o-mini';
  
  console.log('🔍 Using model:', openrouterModel, 'for NSFW mode:', nsfwMode);

  // Detailed logging before API call
  console.log('🚀 CHAT API DEBUG - Preparing OpenRouter API call:', {
    timestamp: new Date().toISOString(),
    requestId,
    model: openrouterModel,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    hasApiKey: !!process.env.OPENROUTER_API_KEY,
    apiKeyLength: process.env.OPENROUTER_API_KEY?.length,
    messageCount: messages.length,
    finalMessage: {
      role: messages[messages.length - 1]?.role,
      contentPreview: messages[messages.length - 1]?.content?.substring(0, 100)
    }
  });

  let openaiRes;
  let fetchStartTime = Date.now();
  
  try {
    console.log('📡 CHAT API DEBUG - Making OpenRouter fetch request...');
    
    openaiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages,
      }),
    });
    
    let fetchEndTime = Date.now();
    console.log('✅ CHAT API DEBUG - Fetch completed:', {
      timestamp: new Date().toISOString(),
      fetchDurationMs: fetchEndTime - fetchStartTime,
      status: openaiRes.status,
      statusText: openaiRes.statusText,
      ok: openaiRes.ok,
      headers: Object.fromEntries(openaiRes.headers.entries())
    });
    
  } catch (fetchError) {
    console.error('❌ CHAT API DEBUG - Fetch failed:', {
      timestamp: new Date().toISOString(),
      fetchDurationMs: Date.now() - fetchStartTime,
      error: fetchError,
      errorMessage: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      errorStack: fetchError instanceof Error ? fetchError.stack : undefined
    });
    throw fetchError;
  }

  let json;
  let parseStartTime = Date.now();
  
  try {
    console.log('📝 CHAT API DEBUG - Parsing JSON response...');
    json = await openaiRes.json();
    
    console.log('✅ CHAT API DEBUG - JSON parsed successfully:', {
      timestamp: new Date().toISOString(),
      parseDurationMs: Date.now() - parseStartTime,
      hasChoices: !!json.choices,
      choicesLength: json.choices?.length,
      hasError: !!json.error,
      errorCode: json.error?.code,
      errorMessage: json.error?.message,
      usage: json.usage,
      model: json.model
    });
    
  } catch (parseError) {
    console.error('❌ CHAT API DEBUG - JSON parsing failed:', {
      timestamp: new Date().toISOString(),
      parseDurationMs: Date.now() - parseStartTime,
      error: parseError,
      errorMessage: parseError instanceof Error ? parseError.message : 'Unknown error',
      responseText: await openaiRes.text()
    });
    throw parseError;
  }

  // Log the complete response for debugging
  console.log('📊 CHAT API DEBUG - Complete OpenRouter response:', {
    timestamp: new Date().toISOString(),
    fullResponse: json,
    totalApiDurationMs: Date.now() - fetchStartTime
  });

  const reply = json.choices?.[0]?.message?.content || '...';
  
  console.log('💬 CHAT API DEBUG - Extracted reply:', {
    timestamp: new Date().toISOString(),
    replyLength: reply.length,
    replyPreview: reply.substring(0, 200),
    hasValidReply: reply !== '...'
  });

  // 🖼️ Process selfie inclusion (if we determined we should send one)
  let selfieData = null;
  if (willSendSelfie && reply !== '...' && resolvedUserId) {
    console.log('🖼️ SELFIE SYSTEM DEBUG - Getting selfie since we determined we should send one...', { userIdSource });
    try {
      const { getCharacterSelfie, extractMoodFromMessage, generateFlirtyCaptionForSelfie } = await import('@/lib/selfieSystem');

      // Extract mood from the message
      const mood = extractMoodFromMessage(message);

      // Get the selfie
      selfieData = await getCharacterSelfie({
        character,
        userId: userIdSource === 'authenticated' ? resolvedUserId : undefined, // Don't track analytics for anonymous
        mood,
        nsfwMode: nsfwMode && userIdSource === 'authenticated', // Only authenticated users get NSFW
        messageContext: message.substring(0, 100),
        excludeRecentHours: 24
      });
      
      if (selfieData) {
        // Generate a flirty caption for the selfie
        const flirtyCaption = generateFlirtyCaptionForSelfie(selfieData, character);
        selfieData.caption = flirtyCaption;
        
        console.log('🖼️ SELFIE SYSTEM DEBUG - Selfie included:', {
          selfieId: selfieData.id,
          mood: selfieData.mood,
          aesthetic: selfieData.aesthetic,
          caption: flirtyCaption,
          isNsfw: nsfwMode
        });
      } else {
        console.log('🖼️ SELFIE SYSTEM DEBUG - No selfie included for this message');
      }
    } catch (selfieError) {
      console.error('🖼️ SELFIE SYSTEM DEBUG - Error processing selfie:', selfieError);
      // Continue without selfie if there's an error
    }
  } else {
    console.log('🖼️ SELFIE SYSTEM DEBUG - Skipping selfie processing:', {
      userIdSource,
      hasValidReply: reply !== '...',
      hasUserId: !!resolvedUserId
    });
  }

  // 🧠 Process the response for memory and emotional updates (authenticated users only)
  console.log('🧠 CHAT API DEBUG - Starting memory processing:', {
    timestamp: new Date().toISOString(),
    userIdSource,
    hasReply: !!reply,
    replyLength: reply?.length
  });
  
  // Initialize memory events array
  const memoryEvents: any[] = [];

  // Extract AI topics for all users
  const aiTopics = extractTopics(reply);
  console.log('🏷️ CHAT API DEBUG - Extracted AI topics:', { aiTopics });

  // Log AI response for ALL users (authenticated and anonymous)
  console.log('💾 CHAT API DEBUG - Logging AI interaction...');
  try {
    await logInteraction(resolvedUserId!, 'assistant', reply, characterKey, aiTopics, nsfwMode, selfieData, currentSessionId);
    console.log('✅ CHAT API DEBUG - AI interaction logged successfully');
  } catch (logError) {
    console.error('❌ CHAT API DEBUG - Error logging AI interaction:', logError);
  }

  // 🎤 ANONYMOUS VOICE SAMPLE: Generate voice for message 3 for anonymous users
  let voiceUrl: string | undefined = undefined;
  if (userIdSource === 'anonymous' && userEntitlements.daily_chat_count === 3 && reply !== '...') {
    console.log('🎤 VOICE SAMPLE DEBUG - Generating voice sample for anonymous user at message 3...');
    try {
      // Get character-specific voice ID (same logic as voice API)
      const getCharacterVoiceId = (character: string): string | undefined => {
        const envKey = `VOICE_ID_${character.toUpperCase()}`;
        return process.env[envKey];
      };

      const CHARACTER_VOICE = getCharacterVoiceId(character);
      const FALLBACK_VOICE = process.env.VOICE_ID_LEXI;
      const voiceId = CHARACTER_VOICE || FALLBACK_VOICE;

      if (voiceId && process.env.ELEVENLABS_API_KEY) {
        // Convert asterisk narration to square brackets
        const convertAsterisksToSquareBrackets = (inputText: string): string => {
          return inputText.replace(/\*([^*]+)\*/g, '[$1]');
        };

        const processedText = convertAsterisksToSquareBrackets(reply);

        // Generate the full voice message for the complete experience
        const secretMessage = processedText; // Full message for complete voice sample

        console.log('🎤 VOICE SAMPLE DEBUG - Generating voice with ElevenLabs:', {
          voiceId,
          textLength: secretMessage.length,
          character
        });

        // Call ElevenLabs TTS API
        const ttsPayload = {
          text: secretMessage,
          model_id: 'eleven_turbo_v2_5',
          optimize_streaming_latency: 1,
          output_format: 'mp3_22050_64',
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.6,
            style: 0.2,
            use_speaker_boost: true,
          },
        };

        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify(ttsPayload),
        });

        if (ttsResponse.ok) {
          const audioData = await ttsResponse.arrayBuffer();
          const audioBuffer = Buffer.from(audioData);

          // Create a data URL for the audio (inline embedding)
          const base64Audio = audioBuffer.toString('base64');
          voiceUrl = `data:audio/mpeg;base64,${base64Audio}`;

          console.log('🎤 VOICE SAMPLE DEBUG - Voice generated successfully:', {
            audioSize: audioBuffer.length,
            character,
            messageCount: userEntitlements.daily_chat_count
          });
        } else {
          console.error('🎤 VOICE SAMPLE DEBUG - ElevenLabs API failed:', ttsResponse.status);
        }
      } else {
        console.log('🎤 VOICE SAMPLE DEBUG - Missing voice configuration:', {
          hasVoiceId: !!voiceId,
          hasApiKey: !!process.env.ELEVENLABS_API_KEY
        });
      }
    } catch (voiceError) {
      console.error('🎤 VOICE SAMPLE DEBUG - Error generating voice sample:', voiceError);
      // Continue without voice if generation fails
    }
  }

  if (userIdSource === 'authenticated') {
    console.log('📝 CHAT API DEBUG - Processing memory for authenticated user...');

    // Add memory saved indicator for significant conversations
    if (userTopics.length > 1 || reply.length > 200) {
      const memoryIcon = character === 'nyx' ? '🌙' : character === 'aiko' ? '🎀' : character === 'chloe' ? '💝' : character === 'zaria' ? '👑' : character === 'nova' ? '💫' : '💭';
      memoryEvents.push({
        id: `${Date.now()}-memory`,
        type: 'memory',
        character,
        message: 'Memory updated',
        icon: memoryIcon,
        color: '#6366F1',
        timestamp: new Date()
      });
    }
    
    // Simple emotional state updates based on conversation patterns
    const emotionDeltas: Record<string, number> = {};
    
    // Positive interaction increases affection
    if (userTopics.includes('relationship') || reply.toLowerCase().includes('love')) {
      emotionDeltas.affection = 1;
    }
    
    // Intimate topics increase trust and affection
    if (userTopics.includes('intimate') || nsfwMode) {
      emotionDeltas.trust = 1;
      emotionDeltas.affection = 2;
    }
    
    // Enhanced jealousy system - more realistic triggers
    const lowerMessage = message.toLowerCase();
    let jealousyTrigger = 0;

    // Romantic/dating mentions with other people (HIGH jealousy)
    if (userTopics.includes('relationship') && userTopics.includes('other_people')) {
      // Strong romantic jealousy triggers
      if (lowerMessage.includes('love') || lowerMessage.includes('dating') || lowerMessage.includes('crush') || lowerMessage.includes('attracted')) {
        jealousyTrigger = 5;
      }
      // Medium romantic jealousy
      else if (lowerMessage.includes('girlfriend') || lowerMessage.includes('boyfriend') || lowerMessage.includes('partner') || lowerMessage.includes('husband') || lowerMessage.includes('wife')) {
        jealousyTrigger = 4;
      }
      // General romantic context with other people
      else {
        jealousyTrigger = 2;
      }
    }
    // Social situations that might spark mild jealousy
    else if (userTopics.includes('social') && userTopics.includes('other_people')) {
      // Dates or romantic social situations
      if (lowerMessage.includes('date') || lowerMessage.includes('dinner') || lowerMessage.includes('movie')) {
        jealousyTrigger = 2;
      }
      // General social hangouts
      else {
        jealousyTrigger = 1;
      }
    }
    // Work/colleague mentions (mild jealousy)
    else if (userTopics.includes('work') && userTopics.includes('other_people')) {
      if (lowerMessage.includes('attractive') || lowerMessage.includes('cute') || lowerMessage.includes('hot')) {
        jealousyTrigger = 2;
      } else {
        jealousyTrigger = 0.5; // Very mild
      }
    }
    // Just mentioning other people in positive ways
    else if (userTopics.includes('other_people')) {
      if (lowerMessage.includes('amazing') || lowerMessage.includes('awesome') || lowerMessage.includes('beautiful') || lowerMessage.includes('wonderful')) {
        jealousyTrigger = 1;
      }
    }

    // Apply jealousy (but also add some randomness for personality)
    if (jealousyTrigger > 0) {
      // Some characters are naturally more jealous
      const characterJealousyMultiplier = {
        'lexi': 1.2,   // Lexi is a bit more jealous
        'nyx': 0.8,    // Nyx is more confident, less jealous
        'aiko': 1.5,   // Aiko is more sensitive to jealousy
        'chloe': 1.0,  // Chloe is balanced
        'zaria': 0.9   // Zaria is confident
      };

      const multiplier = characterJealousyMultiplier[character as keyof typeof characterJealousyMultiplier] || 1.0;
      emotionDeltas.jealousy = Math.round(jealousyTrigger * multiplier);
    }

    // Positive interactions reduce jealousy slightly
    if (userTopics.includes('intimate') && !userTopics.includes('other_people')) {
      emotionDeltas.jealousy = Math.max(-1, -(emotionDeltas.jealousy || 0) * 0.3);
    }
    
    // Fun topics increase playfulness
    if (userTopics.includes('hobbies') || userTopics.includes('games')) {
      emotionDeltas.playfulness = 1;
    }

    console.log('💭 CHAT API DEBUG - Calculated emotion deltas:', { emotionDeltas });

    // Apply emotional updates if any
    if (Object.keys(emotionDeltas).length > 0) {
      console.log('❤️ CHAT API DEBUG - Updating emotional state...');
      try {
        await updateEmotionalState(resolvedUserId!, emotionDeltas, character);
        console.log('✅ CHAT API DEBUG - Emotional state updated successfully');
        
        // Create memory events for UI feedback
        const characterThemes = {
          lexi: { heart: '💋', trust: '✨', jealousy: '😤', playfulness: '🎉', clinginess: '🥰' },
          nyx: { heart: '🖤', trust: '🔮', jealousy: '⚡', playfulness: '😈', clinginess: '🕸️' },
          aiko: { heart: '🌸', trust: '✨', jealousy: '😾', playfulness: '🎀', clinginess: '🥺' },
          chloe: { heart: '💕', trust: '📚', jealousy: '🥺', playfulness: '🌼', clinginess: '🤗' },
          zaria: { heart: '✨', trust: '💎', jealousy: '🔥', playfulness: '👑', clinginess: '💫' },
          nova: { heart: '🌟', trust: '🚀', jealousy: '⚡', playfulness: '💫', clinginess: '🌌' }
        };
        
        const icons = characterThemes[character as keyof typeof characterThemes] || characterThemes.lexi;
        
        Object.entries(emotionDeltas).forEach(([emotion, value]) => {
          if (value !== 0) {
            const emotionName = emotion === 'affection' ? 'heart' : emotion;
            memoryEvents.push({
              id: `${Date.now()}-${emotion}`,
              type: 'emotional',
              character,
              message: `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} ${value > 0 ? 'increased' : 'decreased'}`,
              icon: icons[emotionName as keyof typeof icons] || icons.heart,
              color: value > 0 ? '#10B981' : '#EF4444',
              value,
              timestamp: new Date()
            });
          }
        });
      } catch (emotionError) {
        console.error('❌ CHAT API DEBUG - Error updating emotional state:', emotionError);
      }
    } else {
      console.log('😐 CHAT API DEBUG - No emotion updates needed');
    }

    // Create episodic memories for significant conversations
    if (userTopics.length > 0 || message.length > 100) {
      console.log('📚 CHAT API DEBUG - Creating episodic memory...');
      try {
        const summary = message.length > 200 ? message.substring(0, 200) + '...' : message;
        const title = userTopics.length > 0 ? `Conversation about ${userTopics.join(', ')}` : 'Chat session';
        const salience = userTopics.includes('family') || userTopics.includes('relationship') ? 0.8 : 0.5;
        
        await createEpisode(
          resolvedUserId!,
          summary,
          userTopics,
          salience,
          title,
          5, // emotional impact
          userTopics, // trigger keywords
          character
        );
        console.log('✅ CHAT API DEBUG - Episodic memory created');
      } catch (episodeError) {
        console.error('❌ CHAT API DEBUG - Error creating episode:', episodeError);
      }
    }

    // Extract and store user facts from conversations with AI-powered name extraction
    if (message.toLowerCase().includes('my name is') || message.toLowerCase().includes("i'm ") ||
        message.toLowerCase().includes("i am ") || message.toLowerCase().includes('i like') ||
        message.toLowerCase().includes('i love') || userTopics.includes('family')) {
      console.log('👤 CHAT API DEBUG - Extracting user facts...');
      try {
        const facts: any = {};

        // AI-powered name extraction - analyze how the character addresses the user
        console.log('🤖 CHAT API DEBUG - Using AI to extract user name from conversation...');
        try {
          const nameExtractionPrompt = `Based on this recent conversation, what name does the character "${character}" use to address the user?

User message: "${message}"
Character response: "${reply}"

If a name is mentioned or used, respond ONLY with that name (no punctuation, no explanation). If no clear name is used, respond with "unknown".`;

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
              facts.display_name = extractedName;
              console.log('🤖 CHAT API DEBUG - AI extracted name:', extractedName);
            } else {
              console.log('🤖 CHAT API DEBUG - AI could not extract a valid name:', extractedName);
            }
          } else {
            console.error('🤖 CHAT API DEBUG - Name extraction API call failed:', nameResponse.status);
          }
        } catch (nameExtractionError) {
          console.error('🤖 CHAT API DEBUG - Error in AI name extraction:', nameExtractionError);
          // Fallback to regex if AI fails
          const nameMatch = message.match(/my name is (\w+)|i'm (\w+)|call me (\w+)/i);
          if (nameMatch) {
            facts.display_name = nameMatch[1] || nameMatch[2] || nameMatch[3];
            console.log('🔄 CHAT API DEBUG - Fallback regex extracted name:', facts.display_name);
          }
        }
        
        // Extract interests/hobbies
        if (userTopics.includes('hobbies') || message.toLowerCase().includes('i like') || message.toLowerCase().includes('i love')) {
          if (!facts.favorites) facts.favorites = {};
          if (message.toLowerCase().includes('anime')) {
            facts.favorites.hobbies = facts.favorites.hobbies || [];
            facts.favorites.hobbies.push('anime');
          }
          if (message.toLowerCase().includes('business') || message.toLowerCase().includes('entrepreneur')) {
            facts.favorites.hobbies = facts.favorites.hobbies || [];
            facts.favorites.hobbies.push('business');
          }
        }
        
        // Extract family/relationship info
        if (userTopics.includes('family') || message.toLowerCase().includes('family')) {
          facts.personal_notes = (facts.personal_notes || '') + ` Family-focused. ${message}`.trim();
        }
        
        // Store occupation info
        if (message.toLowerCase().includes('business') || message.toLowerCase().includes('entrepreneur') || 
            message.toLowerCase().includes('startup')) {
          facts.occupation = 'Entrepreneur/Business Owner';
        }

        if (Object.keys(facts).length > 0) {
          await upsertUserFacts(resolvedUserId!, facts, character);
          console.log('✅ CHAT API DEBUG - User facts updated:', facts);
        }
      } catch (factsError) {
        console.error('❌ CHAT API DEBUG - Error updating user facts:', factsError);
      }
    }

    // Proactive name extraction from conversation patterns
    // This ensures we always have the correct name for tip acknowledgments
    console.log('🔍 CHAT API DEBUG - Checking for proactive name extraction...');
    try {
      // Check if we need to update/extract the user's name
      const { data: currentFacts, error: factsError } = await admin
        .from('user_facts')
        .select('display_name')
        .eq('user_id', resolvedUserId!)
        .eq('character_key', character)
        .single();

      const hasValidName = currentFacts?.display_name &&
        currentFacts.display_name !== 'unknown' &&
        currentFacts.display_name !== 'happy' && // Fix the previous bug
        currentFacts.display_name.length > 1;

      if (!hasValidName && conversationHistory.length >= 4) {
        console.log('🤖 CHAT API DEBUG - Attempting proactive name extraction from conversation history...');

        const conversationForName = conversationHistory.slice(-10).map(msg =>
          `${msg.role === 'user' ? 'User' : character}: ${msg.content}`
        ).join('\n');

        const proactiveNamePrompt = `Based on this conversation history, what name does the character "${character}" consistently use to address the user?

${conversationForName}

If a name is clearly and consistently used, respond ONLY with that name (no punctuation, no explanation). If no clear name pattern exists, respond with "unknown".`;

        const proactiveNameResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: proactiveNamePrompt }],
            max_tokens: 10,
            temperature: 0
          })
        });

        if (proactiveNameResponse.ok) {
          const proactiveNameData = await proactiveNameResponse.json();
          const proactiveExtractedName = proactiveNameData.choices?.[0]?.message?.content?.trim();

          if (proactiveExtractedName && proactiveExtractedName !== 'unknown' &&
              proactiveExtractedName.length > 0 && proactiveExtractedName.length < 50) {
            await upsertUserFacts(resolvedUserId!, { display_name: proactiveExtractedName }, character);
            console.log('🤖 CHAT API DEBUG - Proactively extracted and stored name:', proactiveExtractedName);
          } else {
            console.log('🤖 CHAT API DEBUG - Proactive extraction found no clear name pattern');
          }
        }
      } else {
        console.log('🔍 CHAT API DEBUG - Name extraction not needed:', {
          hasValidName,
          currentName: currentFacts?.display_name,
          conversationLength: conversationHistory.length
        });
      }
    } catch (proactiveError) {
      console.error('❌ CHAT API DEBUG - Error in proactive name extraction:', proactiveError);
    }

    // 🤖 AI-ENHANCED MEMORY PROCESSING - Comprehensive analysis and enhancement
    console.log('🤖 CHAT API DEBUG - Starting AI-enhanced memory processing...');
    try {
      // Run comprehensive AI analysis of this conversation turn
      await processConversationWithAI(
        resolvedUserId!,
        character,
        message,
        reply,
        conversationHistory
      );
      console.log('✅ CHAT API DEBUG - AI-enhanced memory processing completed successfully');
    } catch (aiEnhancementError) {
      console.error('❌ CHAT API DEBUG - Error in AI-enhanced memory processing:', aiEnhancementError);
      // Don't fail the request if AI enhancement fails
    }
  } else {
    console.log('🔄 CHAT API DEBUG - Skipping memory and emotional updates for anonymous user:', {
      resolvedUserId,
      userIdSource,
      timestamp: new Date().toISOString()
    });
  }

  console.log('🎯 CHAT API DEBUG - Preparing final response:', {
    timestamp: new Date().toISOString(),
    replyText: reply.substring(0, 100) + (reply.length > 100 ? '...' : ''),
    replyLength: reply.length,
    totalProcessingTimeMs: Date.now() - fetchStartTime
  });

    console.log('🚀 CHAT API DEBUG - Sending response to client:', {
      timestamp: new Date().toISOString(),
      requestId,
      totalRequestTimeMs: Date.now() - requestStartTime
    });

    // Ensure all database transactions are committed before responding
    // This prevents race conditions where the client refreshes before DB writes complete
    console.log('⏳ CHAT API DEBUG - Waiting for database transaction commit...');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ CHAT API DEBUG - Database transaction delay completed');

    // Add rate limit headers to successful response (for authenticated users only)
    const rateLimitHeaders = isAuthenticated ? {} : {}; // No rate limit headers for anonymous users using localStorage

    return new NextResponse(JSON.stringify({
      text: reply,
      memoryEvents: memoryEvents.length > 0 ? memoryEvents : undefined,
      selfie: selfieData || undefined,
      nsfw: nsfwMode,
      voiceUrl: voiceUrl || undefined,
      // Include message count for anonymous voice teasing logic
      anonymousMessageCount: userIdSource === 'anonymous' ? userEntitlements.daily_chat_count : undefined
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...rateLimitHeaders
      },
    });
    
  } catch (error) {
    console.error('💥 CHAT API DEBUG - Unhandled error in chat API:', {
      timestamp: new Date().toISOString(),
      requestId,
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      totalRequestTimeMs: Date.now() - requestStartTime
    });
    
    return new NextResponse(JSON.stringify({ 
      error: 'Internal server error',
      requestId,
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
