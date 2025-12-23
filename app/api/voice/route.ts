// app/api/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { authenticateRequest, createAuthRequiredResponse } from '@/lib/auth-headers';
import { rateLimit, createRateLimitHeaders } from '@/lib/rate-limiting';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const admin = getSupabaseAdmin();
const ACTIVE = new Set(['active', 'trialing']);

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

// Legacy voice credit functions removed - now using VerseCoins system

export async function POST(req: NextRequest) {
  try {
    const character = (new URL(req.url).searchParams.get('character') || (process.env.NEXT_PUBLIC_CHARACTER_KEY ?? process.env.CHARACTER_KEY) || 'lexi').toLowerCase();
    const { text, voiceId, modelId } = await req.json().catch(() => ({}));
    if (!text || typeof text !== 'string' || !text.trim()) return json(400, { error: 'text_required' });

    // Require authentication (voice requires authenticated user)
    const authResult = await authenticateRequest(req, { character, requireAuth: true });
    const { user, userId, isAuthenticated } = authResult;
    
    if (!isAuthenticated) {
      return createAuthRequiredResponse();
    }

    // Apply rate limiting for voice API
    const userTier = user?.user_metadata?.subscription_tier || 'sfw'; // Voice requires paid tier
    
    const rateLimitResult = await rateLimit(req, {
      endpoint: 'voice',
      userId,
      character,
      userTier: userTier as 'anonymous' | 'free' | 'sfw' | 'nsfw',
    });
    
    console.log('🎤 VOICE API DEBUG - Rate limit check:', {
      allowed: rateLimitResult.allowed,
      count: rateLimitResult.count,
      limit: rateLimitResult.limit,
      isBlocked: rateLimitResult.isBlocked,
      violations: rateLimitResult.violations,
      userTier,
      character,
      timestamp: new Date().toISOString()
    });
    
    if (!rateLimitResult.allowed) {
      console.warn('🚫 VOICE API DEBUG - Rate limit exceeded:', {
        userId,
        character,
        userTier,
        rateLimitResult,
        timestamp: new Date().toISOString()
      });
      
      const headers = createRateLimitHeaders(rateLimitResult);
      return json(429, {
        error: rateLimitResult.isBlocked ? 'Temporarily blocked due to abuse' : 'Voice rate limit exceeded',
        code: rateLimitResult.isBlocked ? 'TEMPORARILY_BLOCKED' : 'VOICE_RATE_LIMIT_EXCEEDED',
        limit: rateLimitResult.limit,
        count: rateLimitResult.count,
        resetTime: rateLimitResult.resetTime,
        remaining: rateLimitResult.remaining,
        violations: rateLimitResult.violations,
        headers,
      });
    }

    // 🎉 FREEMIUM MODEL: Voice available to all authenticated users with VerseCoins!
    // No subscription tier requirements - just need VerseCoins balance
    console.log('🎤 VOICE API - Freemium model: checking VerseCoins balance only (no subscription required)');

    // Consume 100 VerseCoins for voice generation
    console.log('💰 VERSECOINS: Debiting 100 VerseCoins for voice generation:', { userId, character });

    // Check VerseCoins balance first
    const { data: userCoins, error: balanceError } = await admin
      .from('user_versecoins')
      .select('credits, total_spent')
      .eq('user_id', userId)
      .single();

    if (balanceError || !userCoins || userCoins.credits < 100) {
      console.log('💰 Insufficient VerseCoins balance:', { userCoins, balanceError });
      return json(402, {
        error: 'insufficient_versecoins',
        required: 100,
        available: userCoins?.credits || 0
      });
    }

    // Debit 100 VerseCoins
    const newBalance = userCoins.credits - 100;
    const { error: debitError } = await admin
      .from('user_versecoins')
      .update({
        credits: newBalance,
        total_spent: (userCoins.total_spent || 0) + 100,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (debitError) {
      console.error('💰 Failed to debit VerseCoins:', debitError);
      return json(500, { error: 'failed_to_debit_versecoins' });
    }

    // Record transaction
    await admin
      .from('versecoins_transactions')
      .insert({
        user_id: userId,
        type: 'debit',
        amount: -100,
        balance_after: newBalance,
        description: `Voice generation for ${character}`,
        reference_type: 'voice_generation',
        reference_id: `voice_${Date.now()}`,
        metadata: { character, text_length: text.length }
      });

    console.log('💰 VerseCoins debited successfully:', { userId, newBalance });
    const consumed = true;

    // 3) Call ElevenLabs TTS
    const XI_KEY = process.env.ELEVENLABS_API_KEY;
    if (!XI_KEY) return json(500, { error: 'missing_elevenlabs_key' });

    // Get character-specific voice ID
    const getCharacterVoiceId = (character: string): string | undefined => {
      const envKey = `VOICE_ID_${character.toUpperCase()}`;
      return process.env[envKey];
    };

    const CHARACTER_VOICE = getCharacterVoiceId(character);
    const FALLBACK_VOICE = process.env.VOICE_ID_LEXI; // Fallback to Lexi's voice
    
    const vid = voiceId || CHARACTER_VOICE || FALLBACK_VOICE;
    if (!vid) return json(400, { error: 'missing_voice_id', character });

    // Convert asterisk narration to square brackets (readable and feeds into ElevenLabs)
    const convertAsterisksToSquareBrackets = (inputText: string): string => {
      return inputText
        // Convert all asterisk patterns to square brackets
        .replace(/\*([^*]+)\*/g, '[$1]');
    };

    const processedText = convertAsterisksToSquareBrackets(text);
    console.log('🎤 VOICE TTS: Converting asterisks to square brackets:', {
      originalLength: text.length,
      processedLength: processedText.length,
      hadAsterisks: text.includes('*'),
      preview: processedText.substring(0, 100) + '...'
    });

    // Split long text into optimal chunks for faster processing
    const chunkText = (text: string, maxChunkSize = 800): string[] => {
      if (text.length <= maxChunkSize) return [text];
      
      const sentences = text.split(/(?<=[.!?])\s+/);
      const chunks: string[] = [];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
      
      if (currentChunk) chunks.push(currentChunk.trim());
      return chunks;
    };

    const textChunks = chunkText(processedText);
    console.log('🎤 VOICE TTS: Text chunking:', {
      originalLength: processedText.length,
      totalChunks: textChunks.length,
      chunkLengths: textChunks.map(c => c.length)
    });

    // Helper function to process individual chunks
    const processChunk = async (chunkText: string, chunkIndex: number) => {
      const payload: any = {
        text: chunkText,
        model_id: modelId || 'eleven_turbo_v2_5', // Use fastest Turbo model by default
        optimize_streaming_latency: 1, // Maximum speed optimization
        output_format: 'mp3_22050_64', // Lower bitrate for faster processing
      };
      
      const voiceSettings = {
        stability: 0.4,          // Reduced for faster processing
        similarity_boost: 0.6,   // Balanced similarity for speed/quality
        style: 0.2,              // Lower style for faster and more stable output
        use_speaker_boost: true, // Keep for audio quality
      };
      payload.voice_settings = voiceSettings;

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream`;
      const resp = await axios.post(url, payload, {
        responseType: 'arraybuffer',
        headers: { 'xi-api-key': XI_KEY, 'content-type': 'application/json' },
        validateStatus: () => true,
        timeout: 30000, // 30 second timeout per chunk
      });

      if (resp.status >= 400) {
        const detail = typeof resp.data === 'string' ? resp.data : (resp.data?.toString?.() || 'tts_error');
        throw new Error(`TTS failed for chunk ${chunkIndex}: ${detail}`);
      }

      return resp.data;
    };

    // Process first chunk immediately for fastest response
    let audioData: Buffer;
    try {
      const firstChunkAudio = await processChunk(textChunks[0], 0);
      audioData = Buffer.from(firstChunkAudio);

      // If multiple chunks, process remaining chunks and concatenate
      if (textChunks.length > 1) {
        console.log('🎤 VOICE TTS: Processing remaining chunks in parallel:', textChunks.length - 1);
        
        // Process remaining chunks in parallel for speed
        const remainingChunkPromises = textChunks.slice(1).map((chunk, index) => 
          processChunk(chunk, index + 1)
        );
        
        const remainingChunkResults = await Promise.all(remainingChunkPromises);
        
        // Concatenate all audio chunks
        const allChunks = [audioData, ...remainingChunkResults.map(data => Buffer.from(data))];
        audioData = Buffer.concat(allChunks);
        
        console.log('🎤 VOICE TTS: Audio concatenation complete:', {
          totalChunks: textChunks.length,
          finalAudioSize: audioData.length
        });
      }
    } catch (error) {
      console.error('🎤 VOICE TTS: Chunk processing error:', error);
      
      // Refund VerseCoins if we consumed them and TTS failed
      if (consumed) {
        // Get current balance
        const { data: currentCoins } = await admin
          .from('user_versecoins')
          .select('credits, total_spent')
          .eq('user_id', userId)
          .single();

        if (currentCoins) {
          const refundedBalance = currentCoins.credits + 100;
          const refundedSpent = Math.max(0, (currentCoins.total_spent || 0) - 100);

          // Update balance
          await admin
            .from('user_versecoins')
            .update({
              credits: refundedBalance,
              total_spent: refundedSpent,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          // Record refund transaction
          await admin
            .from('versecoins_transactions')
            .insert({
              user_id: userId,
              type: 'credit',
              amount: 100,
              balance_after: refundedBalance,
              description: 'Refund for failed voice generation',
              reference_type: 'voice_refund',
              reference_id: `refund_${Date.now()}`,
              metadata: { reason: 'tts_failed', character }
            });
        }
      }
      
      return json(500, { error: 'tts_failed', details: error instanceof Error ? error.message : 'chunk_processing_error' });
    }

    // 4) Success: return audio. Include VerseCoins balance hint header for UI.
    const { data: finalCoins } = await admin
      .from('user_versecoins')
      .select('credits')
      .eq('user_id', userId)
      .single();

    const balance = finalCoins?.credits || 0;
    console.log('🎤 VERSECOINS: Returning audio with VerseCoins balance:', { balance, userId });

    // Add rate limit headers to successful response
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    return new NextResponse(audioData, {
      status: 200,
      headers: {
        'content-type': 'audio/mpeg',
        'cache-control': 'no-store',
        'x-versecoins-balance': String(balance),
        'x-chunks-processed': String(textChunks.length),
        ...rateLimitHeaders
      },
    });
  } catch (e: any) {
    console.error('[voice] error', e);
    return json(500, { error: e?.message || 'failed' });
  }
}