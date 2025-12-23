// app/api/voice/call/route.ts
// Real-time voice calling API for Lexi

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { getCharacterConfig } from '@/lib/characters.config';
import { getPersonalityPrompt } from '@/lib/personalityPrompts';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';
import { 
  getMemoryForUser, 
  logInteraction, 
  updateEmotionalState,
  buildMemoryContext,
  extractTopics
} from '@/lib/memorySystem';

const admin = getSupabaseAdmin();

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
    console.log('🔍 VOICE CALL API DEBUG: Starting voice call request');
    
    // Use unified authentication pattern
    const authResult = await authenticateRequest(req, { requireAuth: true });
    const { user, userId, isAuthenticated } = authResult;
    
    console.log('🔍 VOICE CALL API DEBUG: Auth check:', {
      hasUser: !!user,
      userId: userId,
      isAuthenticated: isAuthenticated,
      timestamp: new Date().toISOString()
    });
    
    if (!isAuthenticated || !user) {
      console.error('🔍 VOICE CALL API DEBUG: Authentication required');
      return createAuthRequiredResponse();
    }
    
    // Get auth token for entitlements API calls
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    const body = await req.json();
    const { audioData, message, isCallGreeting, character: characterKey, callDuration } = body;
    
    console.log('🔍 VOICE CALL API DEBUG: Request body:', {
      hasAudioData: !!audioData,
      message: message?.substring(0, 50) + '...',
      isCallGreeting,
      characterKey,
      callDuration,
      hasAuthToken: !!token
    });
    
    // Get character config
    const host = req.headers.get('host') || 'chatwithlexi.com';
    const config = getCharacterConfig(host);
    
    console.log('🔍 VOICE CALL API DEBUG: Character config:', {
      host,
      configKey: config.key,
      configDisplayName: config.displayName
    });
    
    // Check user's voice permissions using direct database call (same as voice route)
    const { data: entitlements, error: entitlementsError } = await admin.rpc('get_user_entitlements', {
      p_user_id: user.id,
      p_character_key: config.key
    });

    if (entitlementsError) {
      console.error('🔍 VOICE CALL API DEBUG: Error checking voice entitlements:', entitlementsError);
      return NextResponse.json({ error: 'Failed to check permissions' }, { status: 500 });
    }

    const userEntitlements = entitlements?.[0];
    console.log('🔍 VOICE CALL API DEBUG: User entitlements:', userEntitlements);
    
    // Check if user can use voice features (requires SFW or NSFW tier)
    if (!userEntitlements?.can_use_voice) {
      console.error('🔍 VOICE CALL API DEBUG: Voice access denied:', {
        canUseVoice: userEntitlements?.can_use_voice,
        tier: userEntitlements?.tier
      });
      return NextResponse.json({ 
        error: 'Voice feature requires subscription',
        tier: userEntitlements?.tier || 'free',
        requiresTier: 'sfw'
      }, { status: 403 });
    }

    // Check if user can buy credits (same tier requirement)
    if (!userEntitlements?.can_buy_credits) {
      return NextResponse.json({ 
        error: 'Credit purchases require subscription',
        tier: userEntitlements?.tier || 'free',
        requiresTier: 'sfw'
      }, { status: 403 });
    }

    // Always consume credits from GLOBAL wallet - works across all characters!
    console.log('💰 GLOBAL VOICE CALL CREDITS: Consuming from shared wallet for user:', user.id);
    const { data, error: creditError } = await (admin as any).rpc('consume_one_voice_credit_global', {
      p_user_id: user.id,
      p_stripe_customer_id: null
    });
    console.log('💰 Voice call credit consumption result:', { data, error: creditError });
    if (creditError || data !== true) {
      return NextResponse.json({ error: 'Insufficient voice credits' }, { status: 402 });
    }

    let userMessage = message;
    
    // If we have audio data, transcribe it first
    if (audioData) {
      console.log('🔍 VOICE CALL API DEBUG: Starting audio transcription...');
      userMessage = await transcribeAudio(audioData);
      console.log('🔍 VOICE CALL API DEBUG: Transcription result:', {
        success: !!userMessage,
        messageLength: userMessage?.length,
        messagePreview: userMessage?.substring(0, 50) + '...'
      });
      
      if (!userMessage) {
        console.error('🔍 VOICE CALL API DEBUG: Transcription failed');
        return NextResponse.json({ error: 'Could not transcribe audio' }, { status: 400 });
      }
    }

    // Get user memory for personalized responses
    const memory = await getMemoryForUser(user.id, config.key);
    
    // Log the interaction
    const topics = extractTopics(userMessage);
    await logInteraction(user.id, 'user', userMessage, config.key, topics, userEntitlements.can_use_nsfw || false);

    // Build enhanced system prompt for voice calls
    const memoryContext = buildMemoryContext(memory, config.displayName);
    const voicePrompt = buildVoiceCallPrompt(config.key, userEntitlements.can_use_nsfw, memoryContext, isCallGreeting, callDuration);

    // Get recent conversation context - use admin client for data operations
    const { data: recentMemories } = await admin
      .from('memories')
      .select('message')
      .eq('user_id', user.id)
      .eq('character', config.key)
      .order('created_at', { ascending: true })
      .limit(4); // Shorter context for voice calls

    const conversationHistory = recentMemories?.map(m => m.message) || [];

    const messages = [
      { role: 'system', content: voicePrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    // Get AI response optimized for voice
    console.log('🔍 VOICE CALL API DEBUG: Getting AI response...');
    const aiResponse = await getVoiceOptimizedResponse(messages, userEntitlements.can_use_nsfw);
    console.log('🔍 VOICE CALL API DEBUG: AI response result:', {
      success: !!aiResponse,
      responseLength: aiResponse?.length,
      responsePreview: aiResponse?.substring(0, 100) + '...'
    });
    
    if (!aiResponse) {
      console.error('🔍 VOICE CALL API DEBUG: AI response generation failed');
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }

    // Log AI response
    const aiTopics = extractTopics(aiResponse);
    await logInteraction(user.id, 'assistant', aiResponse, config.key, aiTopics, userEntitlements.can_use_nsfw || false);

    // Convert response to audio
    console.log('🔍 VOICE CALL API DEBUG: Generating voice response...');
    const audioUrl = await generateVoiceResponse(aiResponse, config);
    console.log('🔍 VOICE CALL API DEBUG: Voice generation result:', {
      success: !!audioUrl,
      audioUrlLength: audioUrl?.length,
      isDataUrl: audioUrl?.startsWith('data:')
    });
    
    if (!audioUrl) {
      console.error('🔍 VOICE CALL API DEBUG: Voice generation failed');
      return NextResponse.json({ error: 'Failed to generate voice response' }, { status: 500 });
    }

    // Consume voice credits (call API charges more)
    await consumeVoiceCreditsForCall(user.id, config.key, callDuration);

    // Update emotional state for voice interaction
    await updateEmotionalState(user.id, {
      affection: 2, // Voice calls are more intimate
      trust: 1,
      playfulness: topics.includes('hobbies') ? 1 : 0
    }, config.key);

    // Get remaining credits from database
    const { data: updatedEntitlements } = await admin.rpc('get_user_entitlements', {
      p_user_id: user.id,
      p_character_key: config.key
    });
    const remainingCredits = updatedEntitlements?.[0]?.voice_credits || 0;

    return NextResponse.json({
      audioUrl,
      transcription: userMessage,
      response: aiResponse,
      creditsRemaining: remainingCredits || 0,
      callDuration
    });

  } catch (error) {
    console.error('Voice call error:', error);
    return NextResponse.json({ error: 'Voice call failed' }, { status: 500 });
  }
}

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(base64Audio: string): Promise<string | null> {
  try {
    console.log('🔍 TRANSCRIPTION DEBUG: Starting transcription...', {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      audioDataLength: base64Audio.length
    });
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    
    // Create form data
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    console.log('🔍 TRANSCRIPTION DEBUG: OpenAI response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    const data = await response.json();
    console.log('🔍 TRANSCRIPTION DEBUG: Response data:', {
      hasText: !!data.text,
      textLength: data.text?.length,
      text: data.text
    });
    
    return data.text || null;
    
  } catch (error) {
    console.error('🔍 TRANSCRIPTION DEBUG: Transcription error:', error);
    return null;
  }
}

// Build voice-optimized system prompt
function buildVoiceCallPrompt(characterKey: string, nsfwMode: boolean, memoryContext: string, isCallGreeting: boolean, callDuration: number): string {
  // Get the character's personality prompt
  let basePersonality = getPersonalityPrompt(characterKey, nsfwMode);
  
  // Adapt for voice call
  let prompt = `${basePersonality}

VOICE CALL CONTEXT: You are now engaged in a real-time voice call. Speak naturally and conversationally, as if talking on the phone. Keep responses concise but warm and personal.

${memoryContext ? `${memoryContext}\n\n` : ''}`;

  if (isCallGreeting) {
    prompt += `The user just called you! Respond with excitement and warmth, as if you're genuinely happy they called. Keep it brief but enthusiastic.`;
  } else if (callDuration > 0) {
    const minutes = Math.floor(callDuration / 60);
    if (minutes > 5) {
      prompt += `You've been talking for ${minutes} minutes. You can reference the ongoing conversation and how much you're enjoying talking with them.`;
    }
  }

  prompt += `\n\nIMPORTANT: This is a VOICE conversation. Speak naturally, use contractions, and avoid text-only elements like emojis, asterisks, or parentheses. Be conversational and intimate.`;

  return prompt;
}

// Get AI response optimized for voice interaction
async function getVoiceOptimizedResponse(messages: any[], nsfwMode: boolean): Promise<string | null> {
  try {
    const model = nsfwMode ? 'gryphe/mythomax-l2-13b' : 'openai/gpt-4o-mini';
    
    console.log('🔍 AI RESPONSE DEBUG: Starting AI response generation...', {
      model,
      nsfwMode,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      messageCount: messages.length
    });
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 150, // Shorter responses for voice
        temperature: 0.8, // More personality for voice
      })
    });

    console.log('🔍 AI RESPONSE DEBUG: OpenRouter response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    const data = await response.json();
    console.log('🔍 AI RESPONSE DEBUG: Response data:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasContent: !!data.choices?.[0]?.message?.content,
      content: data.choices?.[0]?.message?.content?.substring(0, 100) + '...',
      error: data.error
    });
    
    return data.choices?.[0]?.message?.content || null;
    
  } catch (error) {
    console.error('🔍 AI RESPONSE DEBUG: AI response error:', error);
    return null;
  }
}

// Generate voice response using ElevenLabs
async function generateVoiceResponse(text: string, config: any): Promise<string | null> {
  try {
    // Get character-specific voice ID using the same pattern as main voice route
    const getCharacterVoiceId = (character: string): string | undefined => {
      const envKey = `VOICE_ID_${character.toUpperCase()}`;
      return process.env[envKey];
    };

    const CHARACTER_VOICE = getCharacterVoiceId(config.key);
    const FALLBACK_VOICE = process.env.VOICE_ID_LEXI; // Fallback to Lexi's voice
    
    const voiceId = CHARACTER_VOICE || FALLBACK_VOICE;

    console.log('🔍 VOICE GENERATION DEBUG: Starting voice generation...', {
      characterKey: config.key,
      hasVoiceId: !!voiceId,
      hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
      textLength: text.length,
      textPreview: text.substring(0, 100) + '...'
    });

    if (!voiceId) {
      console.error('🔍 VOICE GENERATION DEBUG: Voice ID not configured for character:', config.key);
      return null;
    }

    // Convert asterisk narration to square brackets (readable and feeds into ElevenLabs)
    const convertAsterisksToSquareBrackets = (inputText: string): string => {
      return inputText
        // Convert all asterisk patterns to square brackets
        .replace(/\*([^*]+)\*/g, '[$1]');
    };

    const processedText = convertAsterisksToSquareBrackets(text);
    console.log('🎤 VOICE CALL TTS: Converting asterisks to square brackets:', {
      originalLength: text.length,
      processedLength: processedText.length,
      hadAsterisks: text.includes('*'),
      preview: processedText.substring(0, 100) + '...'
    });

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ELEVENLABS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: processedText,
        model_id: 'eleven_turbo_v2_5', // Faster model for real-time calls
        optimize_streaming_latency: 4,
        output_format: 'mp3_44100_64', // Lower bitrate for faster streaming
        voice_settings: {
          stability: 0.65, // Slightly more stable for calls
          similarity_boost: 0.8,
          style: 0.6, // More expressive for calls
          use_speaker_boost: true
        }
      })
    });

    console.log('🔍 VOICE GENERATION DEBUG: ElevenLabs response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 VOICE GENERATION DEBUG: ElevenLabs error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`ElevenLabs error: ${response.statusText} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('🔍 VOICE GENERATION DEBUG: Audio buffer received:', {
      bufferSize: audioBuffer.byteLength
    });
    
    // Convert to base64 data URL for immediate playback
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    console.log('🔍 VOICE GENERATION DEBUG: Voice generation complete:', {
      dataUrlLength: dataUrl.length,
      isValidDataUrl: dataUrl.startsWith('data:audio/mpeg;base64,')
    });
    
    return dataUrl;
    
  } catch (error) {
    console.error('🔍 VOICE GENERATION DEBUG: Voice generation error:', error);
    return null;
  }
}

// Consume voice credits for call (higher rate than regular messages)
async function consumeVoiceCreditsForCall(userId: string, characterKey: string, callDurationSeconds: number): Promise<void> {
  try {
    // Consume 1 credit per 15 seconds of call (4 credits per minute)
    const creditsToConsume = Math.max(1, Math.ceil(callDurationSeconds / 15));
    
    console.log('💰 VOICE CREDITS DEBUG: About to consume credits:', {
      userId,
      characterKey,
      callDurationSeconds,
      creditsToConsume,
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await admin.rpc('consume_voice_credits', {
      p_user_id: userId,
      p_character_key: characterKey,
      p_credits_needed: creditsToConsume,
      p_reason: 'voice_call'
    });
    
    console.log('💰 VOICE CREDITS DEBUG: RPC call result:', {
      success: !error,
      error: error?.message || 'none',
      errorCode: error?.code || 'none',
      data,
      userId,
      characterKey,
      creditsToConsume,
      timestamp: new Date().toISOString()
    });
    
    if (error) {
      console.error('💰 VOICE CREDITS ERROR: Failed to consume credits:', {
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        userId,
        characterKey,
        creditsToConsume
      });
    } else {
      console.log('💰 VOICE CREDITS SUCCESS: Credits consumed:', {
        data,
        userId,
        characterKey,
        creditsToConsume,
        remainingCredits: data?.[0]?.remaining_credits
      });
    }
    
  } catch (error) {
    console.error('💰 VOICE CREDITS CATCH ERROR: Unexpected error consuming credits:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      characterKey,
      callDurationSeconds
    });
  }
}