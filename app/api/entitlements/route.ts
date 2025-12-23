// app/api/entitlements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, getAnonymousUserEntitlements } from '@/lib/auth-headers';

export const dynamic = 'force-dynamic';

const admin = getSupabaseAdmin();

const ACTIVE_STATUSES = ['active', 'trialing'];

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  if (process.env.AUTH_DEBUG === 'true') {
    console.log(`🔐 [${requestId}] Entitlements API v4.0: Using unified authentication`);
  }
  
  try {
    const url = new URL(req.url);
    const character = (url.searchParams.get('character') || (process.env.NEXT_PUBLIC_CHARACTER_KEY ?? process.env.CHARACTER_KEY) || 'lexi').toLowerCase();
    if (process.env.AUTH_DEBUG === 'true') {
      console.log(`🔐 [${requestId}] Character: ${character}`);
    }

    // Use unified authentication utility - only debug in specific cases
    const debugAuth = process.env.AUTH_DEBUG === 'true';
    const authResult = await authenticateRequest(req, { character, debug: debugAuth });
    const { user, userId, userIdSource, isAuthenticated } = authResult;
    
    if (!isAuthenticated) {
      if (process.env.AUTH_DEBUG === 'true') {
        console.log(`🔐 [${requestId}] Anonymous user - returning free tier default`);
      }
      // Return consistent free tier response for anonymous users
      const anonymousEntitlements = getAnonymousUserEntitlements(character);
      const freeResponse = {
        unlocked: false,
        tier: anonymousEntitlements.tier,
        status: anonymousEntitlements.status,
        character,
        features: {
          chat: anonymousEntitlements.can_chat,
          nsfw: anonymousEntitlements.can_use_nsfw,
          voice: anonymousEntitlements.can_use_voice,
        },
        canBuyCredits: anonymousEntitlements.can_buy_credits,
        dailyChatCount: anonymousEntitlements.daily_chat_count,
        dailyChatLimit: anonymousEntitlements.daily_chat_limit,
        dailyLimitReached: false,
        credits: anonymousEntitlements.voice_credits,
        voiceCredits: anonymousEntitlements.voice_credits,
        voicePending: false,
      };
      return json(200, freeResponse);
    }

    if (process.env.AUTH_DEBUG === 'true') {
      console.log(`🔐 [${requestId}] ✅ USER AUTHENTICATED - Processing entitlements for:`, user?.email);
    }

    // Use the new comprehensive entitlements function
    const { data: entitlements, error: entitlementsError } = await admin.rpc('get_user_entitlements', {
      p_user_id: userId,
      p_character_key: character
    });

    if (entitlementsError) {
      console.error(`🔐 [${requestId}] Entitlements query error:`, entitlementsError);
      console.error(`🔐 [${requestId}] Full error details:`, JSON.stringify(entitlementsError, null, 2));
      
      // Check daily usage for fallback free account to enforce limits
      let dailyChatCount = 0;
      const { data: dailyUsage, error: usageError } = await admin
        .from('daily_chat_usage')
        .select('chat_count')
        .eq('user_id', userId)
        .eq('character_key', character)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();
      
      if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error(`🔐 [${requestId}] Error fetching daily usage for fallback:`, usageError);
      } else if (dailyUsage) {
        dailyChatCount = dailyUsage.chat_count || 0;
      }
      
      // Check VerseCoins balance for fallback response
      let fallbackVoiceCredits = 0;
      try {
        const { data: verseCoinsBalance, error: vcError } = await admin
          .from('user_versecoins')
          .select('credits')
          .eq('user_id', userId)
          .single();

        if (!vcError && verseCoinsBalance?.credits) {
          fallbackVoiceCredits = Math.floor(verseCoinsBalance.credits / 100);
        }
      } catch (vcErr) {
        // No VerseCoins balance found
      }

      // Return a default response instead of throwing to prevent 500 errors
      // CRITICAL: Enforce chat limits for free accounts even in fallback
      const fallbackResponse = {
        unlocked: false,
        tier: 'free',
        status: 'active',
        character,
        features: {
          chat: dailyChatCount < 5, // Enforce 5-chat daily limit
          nsfw: false,
          voice: fallbackVoiceCredits > 0, // Voice available if user has VerseCoins
        },
        canBuyCredits: false,
        dailyChatCount,
        dailyChatLimit: 5,
        dailyLimitReached: dailyChatCount >= 5,
        credits: fallbackVoiceCredits,
        voiceCredits: fallbackVoiceCredits,
        voicePending: false,
      };
      if (process.env.AUTH_DEBUG === 'true') {
        console.log(`🔐 [${requestId}] Returning fallback response with daily usage check:`, { dailyChatCount, canChat: dailyChatCount < 5 });
      }
      return json(200, fallbackResponse);
    }

    let result = entitlements?.[0];
    
    // If no entitlements found, create fallback with proper daily usage check
    if (!result) {
      let dailyChatCount = 0;
      const { data: dailyUsage, error: usageError } = await admin
        .from('daily_chat_usage')
        .select('chat_count')
        .eq('user_id', userId)
        .eq('character_key', character)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error(`🔐 [${requestId}] Error fetching daily usage for no-entitlements fallback:`, usageError);
      } else if (dailyUsage) {
        dailyChatCount = dailyUsage.chat_count || 0;
      }

      // Check VerseCoins balance for voice access
      let hasVerseCoins = false;
      try {
        const { data: verseCoinsBalance, error: vcError } = await admin
          .from('user_versecoins')
          .select('credits')
          .eq('user_id', userId)
          .single();

        if (!vcError && verseCoinsBalance?.credits && verseCoinsBalance.credits >= 100) {
          hasVerseCoins = true;
        }
      } catch (vcErr) {
        // No VerseCoins balance found
      }

      result = {
        tier: 'free',
        status: 'active',
        can_chat: dailyChatCount < 5, // Enforce 5-chat daily limit
        can_use_nsfw: false,
        can_use_voice: hasVerseCoins, // Voice available if user has sufficient VerseCoins
        can_buy_credits: false,
        daily_chat_count: dailyChatCount,
        daily_chat_limit: 5,
        voice_credits: 0 // Will be overridden by VerseCoins calculation below
      };

      if (process.env.AUTH_DEBUG === 'true') {
        console.log(`🔐 [${requestId}] No entitlements found, created fallback with daily usage check:`, { dailyChatCount, canChat: dailyChatCount < 5, hasVerseCoins });
      }
    }

    if (process.env.AUTH_DEBUG === 'true') {
      console.log(`🔐 [${requestId}] Entitlements result:`, result);
    }

    // Fetch VerseCoins balance to calculate voice credits (100 VC per voice message)
    let voiceCredits = 0;
    try {
      const { data: verseCoinsBalance, error: vcError } = await admin
        .from('user_versecoins')
        .select('credits')
        .eq('user_id', userId)
        .single();

      if (!vcError && verseCoinsBalance?.credits) {
        voiceCredits = Math.floor(verseCoinsBalance.credits / 100);
        if (process.env.AUTH_DEBUG === 'true') {
          console.log(`🔐 [${requestId}] VerseCoins balance: ${verseCoinsBalance.credits}, voice credits: ${voiceCredits}`);
        }
      }
    } catch (vcErr) {
      console.log(`🔐 [${requestId}] No VerseCoins balance found, using 0 voice credits`);
    }

    const body = {
      unlocked: result.tier !== 'free',
      tier: result.tier,
      status: result.status,
      character,
      features: {
        chat: result.can_chat,
        nsfw: result.can_use_nsfw,
        voice: result.can_use_voice,
      },
      canBuyCredits: result.can_buy_credits,
      dailyChatCount: result.daily_chat_count,
      dailyChatLimit: result.daily_chat_limit,
      dailyLimitReached: !result.can_chat && result.tier === 'free',
      credits: voiceCredits, // Now using VerseCoins-based calculation
      voiceCredits: voiceCredits, // Now using VerseCoins-based calculation
      voicePending: result.can_use_voice && voiceCredits <= 0,
    };

    if (process.env.AUTH_DEBUG === 'true') {
      console.log(`🔐 [${requestId}] ✅ NEW TIERED ENTITLEMENTS RESPONSE:`, body);
    }
    return json(200, body);
  } catch (e: any) {
    console.error(`🔐 [${requestId}] ❌ ENTITLEMENTS ERROR:`, e);
    return json(500, { error: e?.message || 'failed' });
  }
}
