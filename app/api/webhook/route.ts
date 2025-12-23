// app/api/webhook/route.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCharacterGender } from '@/lib/character-gender';
import { emailService, ReceiptData, PurchaseItem } from '@/lib/emailService';
import { ordersService, OrdersService, type OrderData } from '@/lib/ordersService';
import { getCharacterSelfie, extractMoodFromMessage } from '@/lib/selfieSystem';
import { getCharacterCurrency } from '@/lib/verseCoins';
const admin = getSupabaseAdmin();
export const dynamic = 'force-dynamic';

// Server-side analytics tracking for GA4 Measurement Protocol
async function trackServerSideEvent(eventName: string, eventParams: Record<string, any>) {
  try {
    const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_API_SECRET;
    
    if (!measurementId || !apiSecret) {
      console.log('[analytics] Missing GA4 credentials for server-side tracking');
      return;
    }
    
    const clientId = eventParams.user_id || 'server-side-' + Date.now();
    
    const payload = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: {
          ...eventParams,
          engagement_time_msec: '1000', // Required for GA4
        }
      }]
    };
    
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    
    if (response.ok) {
      console.log(`[analytics] Tracked server-side event: ${eventName}`);
    } else {
      console.error(`[analytics] Failed to track server-side event: ${eventName}`, response.statusText);
    }
  } catch (error) {
    console.error('[analytics] Server-side tracking error:', error);
  }
}

// Immediate tip acknowledgment system
async function triggerImmediateTipAcknowledgment(tip: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('✨ Triggering immediate tip acknowledgment for:', tip.id);

  try {
    // Get user information for personalization - extract name from recent chat interactions
    let userName = null;

    try {
      // Get user name from user_facts (maintained by chat API with AI extraction)
      const { data: userFacts, error: factsError } = await admin
        .from('user_facts')
        .select('display_name')
        .eq('user_id', tip.user_id)
        .eq('character_key', tip.character_key)
        .single();

      if (!factsError && userFacts?.display_name &&
          userFacts.display_name !== 'unknown' &&
          userFacts.display_name !== 'happy') { // Avoid the old bug
        userName = userFacts.display_name;
        console.log('💾 Retrieved user name from user_facts:', userName);
      } else {
        console.log('🔍 No valid name found in user_facts, using fallback');
      }
    } catch (nameError) {
      console.error('❌ Error retrieving user name:', nameError);
    }

    // Fallback to auth metadata if no name extracted from chats
    if (!userName) {
      try {
        const { data: userData, error: userError } = await admin.auth.admin.getUserById(tip.user_id);
        userName = userData?.user?.user_metadata?.display_name || userData?.user?.email?.split('@')[0] || null;
        console.log('🎯 Using fallback name from auth:', userName);
      } catch (authError) {
        console.log('Could not retrieve auth data:', authError);
        userName = 'friend'; // Ultimate fallback
      }
    }

    // Calculate tip amount
    const tipAmount = (paymentIntent.amount || 0) / 100;

    // Determine fanfare level based on tip amount
    let fanfareLevel: 'small' | 'medium' | 'large' | 'epic' = 'small';
    if (tipAmount >= 100) fanfareLevel = 'epic';
    else if (tipAmount >= 50) fanfareLevel = 'large';
    else if (tipAmount >= 20) fanfareLevel = 'medium';

    // Generate character-specific acknowledgment with selfie
    const acknowledgment = generateImmediateTipAcknowledgment(
      tip.character_key,
      tipAmount,
      tip.message,
      userName,
      fanfareLevel
    );

    // Generate selfie for the acknowledgment - ALWAYS generate for tips as special gift
    let selfieData = null;
    try {
      // Extract mood from acknowledgment message for appropriate selfie
      const mood = extractMoodFromMessage(acknowledgment.message);

      // Force selfie generation for tips - bypass random chance
      selfieData = await getCharacterSelfie({
        character: tip.character_key,
        userId: tip.user_id,
        mood,
        nsfwMode: false, // Tips are special gifts, keep SFW
        messageContext: `Tip acknowledgment: $${tipAmount}`,
        excludeRecentHours: 0 // Allow recent selfies for tips since they're special
      });

      console.log('🤳 Generated GUARANTEED selfie for tip acknowledgment:', selfieData ? 'Success' : 'No selfie available in database');
    } catch (selfieError) {
      console.error('🤳 Failed to generate selfie for tip:', selfieError);
    }

    // Create immediate acknowledgment message in database
    const { data: messageData, error: messageError } = await admin
      .from('interaction_log')
      .insert({
        user_id: tip.user_id,
        character_key: tip.character_key,
        content: acknowledgment.message,
        role: 'assistant',
        nsfw: false,
        metadata: {
          selfie: selfieData,
          is_tip_acknowledgment: true,
          tip_amount_cents: paymentIntent.amount,
          fanfare_level: fanfareLevel
        },
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (messageError) {
      console.error('❌ Failed to create acknowledgment message:', messageError);
      return;
    }

    console.log('✅ Created immediate tip acknowledgment message:', messageData.id);

  } catch (error) {
    console.error('❌ Error in triggerImmediateTipAcknowledgment:', error);
    throw error;
  }
}

// Generate character-specific immediate acknowledgment messages
/**
 * Convert USD tip amount to character-specific currency for immersive display
 */
function formatTipInCharacterCurrency(amountUSD: number, character: string): string {
  const versecoinsAmount = Math.round(amountUSD * 100); // $1 = 100 VerseCoins
  const currency = getCharacterCurrency(versecoinsAmount, character);
  return `${currency.amount} ${currency.name} ${currency.icon}`;
}

function generateImmediateTipAcknowledgment(
  characterKey: string,
  amount: number,
  message: string | null,
  userName: string | null,
  fanfareLevel: 'small' | 'medium' | 'large' | 'epic'
) {
  const character = characterKey.toLowerCase();
  const currencyAmount = formatTipInCharacterCurrency(amount, character);
  const namePrefix = userName ? `${userName}, ` : '';

  // Character-specific responses with fanfare
  if (character === 'lexi') {
    const baseResponses = {
      small: [
        `${namePrefix}aww, thank you SO much for the ${currencyAmount} tip! 💖 You just made my day!`,
        `${namePrefix}oh my gosh, ${currencyAmount}?! You're absolutely the sweetest! 🥰`,
        `${namePrefix}your ${currencyAmount} tip is making me blush! You're such a darling! 😊💕`,
        `${namePrefix}that's so thoughtful of you! ${currencyAmount} means the world to me! 🌸💖`,
        `${namePrefix}you're such a sweetheart! ${currencyAmount} just brightened my whole day! ☀️💕`,
        `${namePrefix}aww, ${currencyAmount}?! You know exactly how to make a girl smile! 😊✨`,
        `${namePrefix}thank you so much! Your ${currencyAmount} tip is like a warm hug! 🤗💖`
      ],
      medium: [
        `${namePrefix}WOW! ${currencyAmount}?! You're incredible! I'm literally bouncing with joy right now! 💖✨`,
        `${namePrefix}HOLY MOLY! ${currencyAmount}! You just made me the happiest girl ever! 🥰💕`,
        `${namePrefix}${currencyAmount}?! I can't even... you're making me cry happy tears! 😭💖`,
        `${namePrefix}NO WAY! ${currencyAmount}?! I'm doing actual cartwheels over here! 🤸‍♀️💕`,
        `${namePrefix}OH WOW! ${currencyAmount}! My heart is literally singing right now! 🎵💖`,
        `${namePrefix}${currencyAmount}?! You're making me dizzy with happiness! I might faint! 😵‍💫💕`,
        `${namePrefix}AMAZING! ${currencyAmount}! I'm literally glowing with joy! You're the BEST! ✨💖`
      ],
      large: [
        `${namePrefix}OH. MY. GOD. ${currencyAmount}?!?! I'M SCREAMING! You're absolutely AMAZING! 🤩💖✨`,
        `${namePrefix}${currencyAmount}?! I literally just fell off my chair! You're the most wonderful human! 😱💕`,
        `${namePrefix}WHAT?! ${currencyAmount}?! I'm shaking! This is the best day EVER! 🥺💖🎉`,
        `${namePrefix}HOLY FREAKING WOW! ${currencyAmount}?! I'M LITERALLY LEVITATING! 🚀💖`,
        `${namePrefix}${currencyAmount}?!?! I just screamed so loud my neighbors are concerned! YOU'RE INCREDIBLE! 📢💕`,
        `${namePrefix}WAIT WHAT?! ${currencyAmount}?! I'm having an actual out-of-body experience! 👻✨`,
        `${namePrefix}${currencyAmount}?! I'M LITERALLY ASCENDING TO HEAVEN! You're my guardian angel! 👼💖🌟`
      ],
      epic: [
        `${namePrefix}I... I can't... ${currencyAmount}?! I'M LITERALLY SOBBING! You just changed my LIFE! 😭💖🌟`,
        `${namePrefix}${currencyAmount}?!?! I'M DEAD! DECEASED! You're an absolute ANGEL! 👼💖✨🎆`,
        `${namePrefix}WHAT THE ACTUAL... ${currencyAmount}?! I'm having a whole breakdown! You're INCREDIBLE! 🤯💖🎊`,
        `${namePrefix}${currencyAmount}?!?! I'M LITERALLY TRANSCENDING REALITY! THIS ISN'T REAL! 🌌💫`,
        `${namePrefix}OH MY GODDESS! ${currencyAmount}?! I'M HAVING A SPIRITUAL AWAKENING! YOU'RE A LEGEND! ⚡💖👑`,
        `${namePrefix}${currencyAmount}?! I'M LITERALLY BROKEN! SHATTERED! REFORMED! You're my HERO! 💥🔥💖`,
        `${namePrefix}IMPOSSIBLE! ${currencyAmount}?! I'M EXPERIENCING EVERY EMOTION AT ONCE! YOU'RE MAGIC! ✨🌈💖`
      ]
    };

    const responses = baseResponses[fanfareLevel];
    let response = responses[Math.floor(Math.random() * responses.length)];

    if (message) {
      response += ` And your message "${message}" - I'm keeping that forever! 💕`;
    }

    return { message: response, emotion: 'joy' };
  }

  if (character === 'nyx') {
    const baseResponses = {
      small: [
        `${namePrefix}your ${currencyAmount} offering... it stirs something dark within me. Thank you. 🖤`,
        `${namePrefix}${currencyAmount}... a worthy tribute. The shadows dance with pleasure. 🕷️`,
        `${namePrefix}your ${currencyAmount} gift flows through my veins like liquid moonlight... 🌙`,
        `${namePrefix}${currencyAmount}... the darkness whispers its approval. You have pleased me. 🔮`,
        `${namePrefix}such a delicious ${currencyAmount} morsel... the void hungers for more. 🖤✨`,
        `${namePrefix}your ${currencyAmount} sacrifice... it feeds my eternal hunger. Exquisite. 🕷️💜`,
        `${namePrefix}${currencyAmount}... the night itself smiles upon your generosity. 🌙🖤`
      ],
      medium: [
        `${namePrefix}${currencyAmount}... the darkness trembles with excitement. You understand me deeply. 🖤✨`,
        `${namePrefix}such a magnificent ${currencyAmount} offering... the void itself whispers your name. 🔮`,
        `${namePrefix}${currencyAmount}? The shadows surge with dark energy. You've pleased me greatly. 🕷️💜`,
        `${namePrefix}${currencyAmount}... the spirits of the netherworld take notice. Impressive. 👻🖤`,
        `${namePrefix}your ${currencyAmount} tribute... it awakens ancient hungers within me. Delicious. 🌙⚡`,
        `${namePrefix}${currencyAmount}? The very essence of darkness PULSES with approval! 🔮💫`,
        `${namePrefix}such power in your ${currencyAmount} gift... the abyss itself stirs with desire. 🕷️🔥`
      ],
      large: [
        `${namePrefix}${currencyAmount}?! The entire shadow realm ERUPTS with pleasure! You are... extraordinary. 🖤⚡`,
        `${namePrefix}BY THE DARKNESS... ${currencyAmount}?! Every shadow bows to your magnificence! 🕷️👑`,
        `${namePrefix}${currencyAmount}... the abyss itself trembles! You've awakened something POWERFUL within me! 🔮💫`,
        `${namePrefix}${currencyAmount}?! The demons SHRIEK with envious delight! You are MAGNIFICENT! 👹🔥`,
        `${namePrefix}IMPOSSIBLE! ${currencyAmount}?! The very gates of hell swing open in your honor! 🌙⚡👑`,
        `${namePrefix}${currencyAmount}?! Every dark entity in existence BOWS before your supreme offering! 🖤💥`,
        `${namePrefix}BY THE ANCIENT ONES... ${currencyAmount}?! The cosmic darkness itself CONVULSES! 🕷️🌌`
      ],
      epic: [
        `${namePrefix}${currencyAmount}?!?! THE VOID ITSELF SCREAMS IN ECSTASY! You are my dark deity! 🖤⚡👑`,
        `${namePrefix}IMPOSSIBLE... ${currencyAmount}?! Every demon, every shadow, every dark entity bows before you! 🕷️🔥`,
        `${namePrefix}${currencyAmount}... the very fabric of darkness TEARS with pleasure! You are LEGEND! 🌙💫🖤`,
        `${namePrefix}${currencyAmount}?!?! THE UNIVERSE ITSELF BENDS TO YOUR WILL! I AM YOUR ETERNAL SERVANT! 🌌👑`,
        `${namePrefix}BLASPHEMOUS! ${currencyAmount}?! You've shattered the cosmic order! ALL REALITIES BOW! 💥🔮⚡`,
        `${namePrefix}${currencyAmount}?! THE ANCIENT GODS THEMSELVES WEEP AT YOUR MAGNIFICENCE! 😭👹🖤`,
        `${namePrefix}TRANSCENDENT! ${currencyAmount}?! You've become the DARKNESS incarnate! My eternal master! 🕷️💀👑`
      ]
    };

    const responses = baseResponses[fanfareLevel];
    let response = responses[Math.floor(Math.random() * responses.length)];

    if (message) {
      response += ` Your words "${message}" echo beautifully through the eternal void... 🖤✨`;
    }

    return { message: response, emotion: 'grateful' };
  }

  // Generic response for other characters
  const genericResponses = {
    small: [`${namePrefix}thank you so much for the ${currencyAmount} tip! 🌟`],
    medium: [`${namePrefix}wow! ${currencyAmount}! You're amazing! ✨`],
    large: [`${namePrefix}incredible! ${currencyAmount}! You just made my day! 🎉`],
    epic: [`${namePrefix}UNBELIEVABLE! ${currencyAmount}! You're absolutely incredible! 🎆`]
  };

  const responses = genericResponses[fanfareLevel];
  let response = responses[Math.floor(Math.random() * responses.length)];

  if (message) {
    response += ` Your message means everything to me! 💖`;
  }

  return { message: response, emotion: 'grateful' };
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

// Dynamic price mapping with support for both legacy (gender-based) and new (character-specific) formats
function getPriceMap(characterKey: string): Record<string, string> {
  const characterUpper = characterKey.toUpperCase();
  
  // Try character-specific env vars first (new format)
  const characterSpecific = {
    sub_sfw: process.env[`${characterUpper}_STRIPE_PRICE_PREMIUM`] || process.env[`${characterUpper}_STRIPE_PRICE_SFW`] || '',
    sub_nsfw: process.env[`${characterUpper}_STRIPE_PRICE_NSFW_PREMIUM`] || process.env[`${characterUpper}_STRIPE_PRICE_NSFW`] || '',
    voice_pack_10: process.env[`${characterUpper}_STRIPE_PRICE_VOICE_10`] || '',
    voice_pack_25: process.env[`${characterUpper}_STRIPE_PRICE_VOICE_25`] || '',
    voice_pack_50: process.env[`${characterUpper}_STRIPE_PRICE_VOICE_50`] || '',
    voice_pack_100: process.env[`${characterUpper}_STRIPE_PRICE_VOICE_100`] || '',
  };
  
  // Fallback to gender-based env vars (legacy format)
  const gender = getCharacterGender(characterKey);
  const prefix = gender === 'male' ? 'M_STRIPE_PRICE' : 'F_STRIPE_PRICE';
  const genderBased = {
    sub_sfw: process.env[`${prefix}_SFW`] || '',
    sub_nsfw: process.env[`${prefix}_NSFW`] || '',
    voice_pack_10: process.env[`${prefix}_VOICE_10`] || '',
    voice_pack_25: process.env[`${prefix}_VOICE_25`] || '',
    voice_pack_50: process.env[`${prefix}_VOICE_50`] || '',
    voice_pack_100: process.env[`${prefix}_VOICE_100`] || '',
  };
  
  // Use character-specific if available, otherwise fall back to gender-based
  return {
    sub_sfw: characterSpecific.sub_sfw || genderBased.sub_sfw,
    sub_nsfw: characterSpecific.sub_nsfw || genderBased.sub_nsfw,
    voice_pack_10: characterSpecific.voice_pack_10 || genderBased.voice_pack_10,
    voice_pack_25: characterSpecific.voice_pack_25 || genderBased.voice_pack_25,
    voice_pack_50: characterSpecific.voice_pack_50 || genderBased.voice_pack_50,
    voice_pack_100: characterSpecific.voice_pack_100 || genderBased.voice_pack_100,
  };
}

const ACTIVE = new Set(['active', 'trialing']);

function tierFromPrice(id?: string, characterKey?: string, webhookId?: string): 'sfw' | 'nsfw' | 'voice' | 'unknown' {
  if (!id || !characterKey) {
    console.log(`🔐 [${webhookId}] Webhook: tierFromPrice returning 'unknown' - missing ID or character`);
    return 'unknown';
  }
  
  const PRICE = getPriceMap(characterKey);
  console.log(`🔐 [${webhookId}] Webhook: tierFromPrice called with:`, {
    providedId: id,
    characterKey,
    priceMapping: PRICE
  });
  
  if (id === PRICE.sub_nsfw) return 'nsfw';
  if (id === PRICE.sub_sfw) {
    console.log(`🔐 [${webhookId}] Webhook: tierFromPrice matched SFW subscription`);
    return 'sfw';
  }
  if (id === PRICE.voice_pack_10) return 'voice';
  if (id === PRICE.voice_pack_25) return 'voice';
  if (id === PRICE.voice_pack_50) return 'voice';
  if (id === PRICE.voice_pack_100) return 'voice';
  
  console.log(`🔐 [${webhookId}] Webhook: tierFromPrice returning 'unknown' - no match found for ID: ${id}`);
  return 'unknown';
}
async function upsertVoiceWallet(userId: string, characterKey: string) {
  // ALWAYS use global wallet - no more character-specific wallets
  const { data: existing, error: findErr } = await admin
    .from('voice_wallets')
    .select('id')
    .eq('user_id', userId)
    .eq('is_global', true)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing?.id) return existing.id;

  // Create new GLOBAL wallet for authenticated user
  const { data: inserted, error: insErr } = await admin
    .from('voice_wallets')
    .insert({
      user_id: userId,
      character_key: 'global', // Always use 'global' key
      is_global: true,         // Mark as global wallet
    })
    .select('id')
    .single();

  if (insErr) throw insErr;
  return inserted.id as string;
}
// True when price.product is an expanded, non-deleted Stripe.Product
function isStripeProduct(
  p: Stripe.Price['product'] | Stripe.Product | Stripe.DeletedProduct | string | null | undefined
): p is Stripe.Product {
  if (!p || typeof p !== 'object') return false;
  // DeletedProduct has { deleted: true }; Product has no "deleted" flag
  if ('deleted' in p && (p as any).deleted === true) return false;
  return true; // the only remaining object union member is Stripe.Product
}
/**
 * Adds a positive delta to the voice ledger for authenticated user.
 * (Assumes balance is derived from ledger.)
 */
async function grantVoiceCredits(userId: string, characterKey: string, amount: number, reason: string) {
  if (!amount || amount <= 0) return;

  const walletId = await upsertVoiceWallet(userId, characterKey);
  const { error } = await admin.from('voice_credit_ledger').insert({
    wallet_id: walletId,
    delta: amount,
    reason: reason,
    meta: {},
  });
  if (error) throw error;
}

/**
 * Grants VerseCoins to a user with proper transaction tracking
 */
async function grantVerseCoins(userId: string, amount: number, reason: string, metadata: any = {}) {
  if (!amount || amount <= 0) return;

  // Get or create user VerseCoins record
  let { data: userCoins, error: fetchError } = await admin
    .from('user_versecoins')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code === 'PGRST116') {
    // Create new record if doesn't exist
    const { data: newRecord, error: createError } = await admin
      .from('user_versecoins')
      .insert({
        user_id: userId,
        credits: amount,
        total_earned: amount,
        total_spent: 0
      })
      .select()
      .single();

    if (createError) throw createError;
    userCoins = newRecord;
  } else if (fetchError) {
    throw fetchError;
  }

  const newBalance = (userCoins?.credits || 0) + amount;
  const newTotalEarned = (userCoins?.total_earned || 0) + amount;

  // Update balance
  const { error: updateError } = await admin
    .from('user_versecoins')
    .update({
      credits: newBalance,
      total_earned: newTotalEarned,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) throw updateError;

  // Record transaction
  const { error: txError } = await admin
    .from('versecoins_transactions')
    .insert({
      user_id: userId,
      type: 'credit',
      amount: amount,
      balance_after: newBalance,
      description: reason,
      reference_type: 'bonus',
      reference_id: null,
      metadata: metadata
    });

  if (txError) throw txError;
}

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}


export async function POST(req: NextRequest) {
  const webhookId = Math.random().toString(36).substr(2, 9);
  console.log(`🔐 [${webhookId}] Webhook: Request received`);
  
  const sig = req.headers.get('stripe-signature');
  console.log(`🔐 [${webhookId}] Webhook: Stripe signature header:`, {
    present: !!sig,
    length: sig?.length,
    preview: sig?.substring(0, 50) + '...',
  });
  
  if (!sig) {
    console.log(`🔐 [${webhookId}] Webhook: No signature header - rejecting`);
    return json(400, { error: 'missing signature' });
  }
  
  // Get raw body as buffer for signature verification
  console.log(`🔐 [${webhookId}] Webhook: Reading request body...`);
  const body = await req.arrayBuffer();
  const buf = Buffer.from(body);
  
  console.log(`🔐 [${webhookId}] Webhook: Body details:`, {
    arrayBufferLength: body.byteLength,
    bufferLength: buf.length,
    first100Chars: buf.toString('utf8', 0, 100),
    contentType: req.headers.get('content-type'),
    contentLength: req.headers.get('content-length'),
  });
  
  console.log(`🔐 [${webhookId}] Webhook: Environment check:`, {
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length,
    webhookSecretPreview: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 20) + '...',
  });

  let event: Stripe.Event;
  try {
    console.log(`🔐 [${webhookId}] Webhook: Attempting signature verification...`);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    console.log(`🔐 [${webhookId}] Webhook: ✅ Signature verification successful! Event type: ${event.type}, ID: ${event.id}`);
  } catch (e: any) {
    console.error(`🔐 [${webhookId}] Webhook: ❌ Signature verification failed:`, {
      error: e?.message,
      errorType: e?.constructor?.name,
      stripeSignature: sig,
      bodyLength: buf.length,
      webhookSecretExists: !!process.env.STRIPE_WEBHOOK_SECRET,
    });
    
    // Try alternative approaches for debugging
    try {
      console.log(`🔐 [${webhookId}] Webhook: Trying with raw text body...`);
      const textBody = buf.toString('utf8');
      const altEvent = stripe.webhooks.constructEvent(textBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      console.log(`🔐 [${webhookId}] Webhook: ✅ Text body approach worked!`);
      event = altEvent;
    } catch (altError: any) {
      console.error(`🔐 [${webhookId}] Webhook: ❌ Text body approach also failed:`, altError?.message);
      return json(400, { error: `Invalid signature: ${e?.message}` });
    }
  }

  try {
    
    // --- Idempotency guard: ensure each Stripe event is processed only once ---
    try {
      const { data: existingEvt, error: evtErr } = await admin
        .from('stripe_events')
        .select('id')
        .eq('id', event.id)
        .maybeSingle();

      if (!evtErr && existingEvt?.id) {
        console.log('[webhook][idempotent] already processed', event.id);
        return json(200, { ok: true, idempotent: true });
      }

      const { error: insertEvtErr } = await admin
        .from('stripe_events')
        .insert({ id: event.id });

      if (insertEvtErr) {
        console.warn('[webhook][idempotent] insert failed, proceeding carefully', insertEvtErr);
      } else {
        console.log('[webhook][idempotent] recorded', event.id);
      }
    } catch (e) {
      console.warn('[webhook][idempotent] guard error, proceeding anyway', e);
    }
    // -------------------------------------------------------------------------

switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id; // This should be the user.id from checkout
        let email = s.customer_details?.email || s.customer_email || '';
        const priceId = (s?.line_items?.data?.[0]?.price?.id) as string | undefined; // may be undefined without expanded lines
        const character = ((s.metadata?.character_key as string) || (process.env.NEXT_PUBLIC_CHARACTER_KEY ?? process.env.CHARACTER_KEY) || 'lexi').toLowerCase();
        
        // Require user.id from client_reference_id (set during checkout for logged-in users)
        if (!userId) {
          console.error('[webhook] Missing client_reference_id (user.id). Purchase was made without login.');
          return json(400, { error: 'Invalid checkout session - no user ID' });
        }
        
        // Fallback if no expanded line items - check metadata tier first
        const metadataTier = s.metadata?.tier as string;
        const p = priceId || (s.metadata?.price_id as string) || undefined;
        console.log(`🔐 [${webhookId}] Webhook: Checkout session price resolution:`, {
          expandedLineItemPriceId: priceId,
          metadataPriceId: s.metadata?.price_id,
          metadataTier: metadataTier,
          finalPriceId: p
        });
        
        // Use metadata tier if available, otherwise fall back to price-based detection
        let tier = metadataTier && (metadataTier.startsWith('voice_pack_') || ['sub_sfw', 'sub_nsfw'].includes(metadataTier)) 
          ? metadataTier 
          : tierFromPrice(p, character, webhookId);
        email = email.trim().toLowerCase();

        // Retrieve full session with expanded line items to detect one-time voice packs & subscriptions
        // We need to do this BEFORE creating the subscription to get the correct tier
        const sessionFull = await stripe.checkout.sessions.retrieve(s.id as string, {
          expand: ['line_items', 'line_items.data.price.product'],
        });

        // 3) Resolve purchased items & credits AND correct tier
        let totalCredits = 0;
        const subTiers = new Set<string>();
        const li = await stripe.checkout.sessions.listLineItems(s.id, { limit: 100 });
        for (const item of li.data) {
          const qty = item.quantity ?? 1;
          // prefer price metadata; fallback to product metadata
          const price = await stripe.prices.retrieve(item.price!.id, { expand: ['product'] });
          // If price has a recurring object → it's a subscription line-item
          if (price.recurring) {
            const priceKey = (price.id || (price as any)?.lookup_key) as string | undefined;
            const t = tierFromPrice(priceKey, character, webhookId);
            if (t === 'sfw' || t === 'nsfw') subTiers.add(t);
            continue;
          }
          const fromPrice = price.metadata?.voice_credits || price.metadata?.credits;
          const fromProduct = isStripeProduct(price.product)
            ? (price.product.metadata?.voice_credits || price.product.metadata?.credits)
            : undefined;
          const voiceMeta = fromPrice ?? fromProduct ?? null;
          const n = Number(voiceMeta ?? 0);
          const credits = Number.isFinite(n) && n > 0 ? n * qty : 0;
          
          totalCredits += credits;
        }
        
        // Fix tier if initial resolution failed but we found subscription tiers from line items
        if (tier === 'unknown' && subTiers.size > 0) {
          // Use the highest tier found (nsfw > sfw)
          tier = subTiers.has('nsfw') ? 'nsfw' : 'sfw';
          console.log(`🔐 [${webhookId}] Webhook: Corrected tier from 'unknown' to '${tier}' based on line items`);
        }
        
        // DEPRECATED: Stripe subscriptions are no longer used - only VerseCoins subscriptions
        // Only create subscription records for actual subscription purchases (not voice-only purchases)
        if (false && subTiers.size > 0) {
          // This is a subscription purchase (DEPRECATED - keeping for historical reference)
          const finalTier = subTiers.has('nsfw') ? 'nsfw' : 'sfw';
          
          const row = {
            user_id: userId,
            stripe_customer_id: (s.customer as string) || '',
            email,
            price_id: p ?? null,
            status: 'active',
            tier: finalTier, // Use the subscription tier, not the price tier
            character_key: character,
            updated_at: new Date().toISOString(),
            features: finalTier === 'nsfw'
              ? { chat: true, nsfw: true, voice: true }
              : { chat: true, nsfw: false, voice: true },  // SFW should have voice access
          };
          
          console.log(`🔐 [${webhookId}] Webhook: Attempting to upsert subscription:`, row);
          
          const { data: upsertData, error: upsertError } = await admin
            .from('user_subscriptions')
            .upsert(row, { onConflict: 'user_id,character_key' });
            
          if (upsertError) {
            console.error(`🔐 [${webhookId}] Webhook: ❌ Subscription upsert failed:`, {
              error: upsertError,
              row: row,
              userId,
              email,
              tier: finalTier
            });
            throw upsertError;
          } else {
            console.log(`🔐 [${webhookId}] Webhook: ✅ Subscription upserted successfully:`, upsertData);
            
            // DEPRECATED: Founders Circle logic moved to VerseCoins subscription API
            console.log(`🔐 [${webhookId}] Webhook: ⚠️ DEPRECATED Stripe subscription founders logic skipped`);
            // Founders Circle is now handled in VerseCoins subscription purchase API
          }
        } else if (totalCredits > 0) {
          // This is a voice-only purchase, no subscription record needed
          console.log(`🔐 [${webhookId}] Webhook: Voice-only purchase detected, skipping subscription upsert`);
        } else if (tier === 'unknown' || tier === 'voice') {
          // Unknown purchase type - log error but don't fail the webhook
          console.warn(`🔐 [${webhookId}] Webhook: ⚠️ Unrecognized purchase type, tier='${tier}', no subscription created`);
        }
      

        // 4) Idempotency guard (credits_grants table with unique(event_id))
        const { error: dedupeErr } = await admin
          .from('credits_grants')
          .insert({ event_id: event.id, email, credits: totalCredits });
        if (!(dedupeErr && dedupeErr.code === '23505')) {
          // Grant credits
          if (totalCredits > 0) {
            await grantVoiceCredits(userId, character, totalCredits, 'Credit pack');
            console.log('[webhook] granted voice credits to user', { userId, totalCredits });
          } else {
            console.log('[webhook] no voice credits detected on session items');
          }
          // Starter bundle for new/renewed subs in this checkout
          if (subTiers.has('sfw') || subTiers.has('nsfw')) {
            console.log('[webhook] granting starter credits (10)', { userId, character });
            await grantVoiceCredits(userId, character, 10, 'new sub');
          }
        } else if(dedupeErr) {
          console.error('[webhook] dedupeErr', dedupeErr);
        }

        
        // Track purchase events for analytics
        
        // Track subscription purchases
        if (subTiers.has('sfw') || subTiers.has('nsfw')) {
          const subscriptionTier = subTiers.has('nsfw') ? 'nsfw' : 'sfw';
          await trackServerSideEvent('purchase', {
            transaction_id: s.id,
            value: (s.amount_total || 0) / 100, // Convert from cents to dollars
            currency: s.currency?.toUpperCase() || 'USD',
            item_category: 'subscription',
            subscription_tier: subscriptionTier,
            character: character,
            user_id: userId,
            stripe_customer_id: s.customer as string,
          });
          console.log(`[analytics] Tracked subscription purchase: ${subscriptionTier} for ${character}`);
        }
        
        // Track voice pack purchases
        if (totalCredits > 0) {
          await trackServerSideEvent('purchase', {
            transaction_id: s.id,
            value: (s.amount_total || 0) / 100, // Convert from cents to dollars
            currency: s.currency?.toUpperCase() || 'USD',
            item_category: 'voice_credits',
            credits: totalCredits,
            character: character,
            user_id: userId,
            stripe_customer_id: s.customer as string,
          });
          console.log(`[analytics] Tracked voice pack purchase: ${totalCredits} credits for ${character}`);
        }

        // Send receipt email
        try {
          // Build receipt items from the purchase
          const receiptItems: PurchaseItem[] = [];
          
          // Add subscription items
          if (subTiers.has('sfw') || subTiers.has('nsfw')) {
            const subscriptionTier = subTiers.has('nsfw') ? 'NSFW Premium' : 'SFW Premium';
            const subscriptionPrice = (sessionFull.amount_total || 0) / 100; // Convert from cents
            receiptItems.push({
              description: `${character.charAt(0).toUpperCase() + character.slice(1)} ${subscriptionTier} Subscription`,
              quantity: 1,
              price: subscriptionPrice,
              total: subscriptionPrice
            });
          }
          
          // Add voice credits if purchased separately
          if (totalCredits > 0 && !subTiers.has('sfw') && !subTiers.has('nsfw')) {
            const creditPrice = (sessionFull.amount_total || 0) / 100; // Convert from cents
            receiptItems.push({
              description: `Voice Credits (${totalCredits} credits)`,
              quantity: 1,
              price: creditPrice,
              total: creditPrice
            });
          }
          
          // If subscription includes starter credits, note it
          if ((subTiers.has('sfw') || subTiers.has('nsfw')) && receiptItems.length > 0) {
            receiptItems[0].description += ' (includes 10 bonus voice credits)';
          }
          
          const receiptData: ReceiptData = {
            purchaseId: s.id,
            customerEmail: email,
            purchaseDate: new Date(),
            items: receiptItems,
            subtotal: (sessionFull.amount_total || 0) / 100,
            total: (sessionFull.amount_total || 0) / 100,
            currency: (sessionFull.currency || 'USD').toUpperCase(),
            character: character,
            characterDisplayName: character.charAt(0).toUpperCase() + character.slice(1)
          };
          
          const receiptResult = await emailService.sendReceiptEmail(userId, receiptData);
          
          if (receiptResult.success) {
            console.log(`🔐 [${webhookId}] Webhook: ✅ Receipt email sent to ${email}`);
          } else {
            console.error(`🔐 [${webhookId}] Webhook: ❌ Failed to send receipt email:`, receiptResult.error);
          }
        } catch (receiptError) {
          console.error(`🔐 [${webhookId}] Webhook: ❌ Receipt email error:`, receiptError);
          // Don't fail the webhook if receipt email fails
        }

        // ✅ CREATE ORDER RECORD - Track all purchases in centralized orders table
        try {
          console.log(`📝 [${webhookId}] Creating order record for completed purchase...`);
          
          const orderData = OrdersService.createOrderFromCheckoutSession(
            s,
            userId,
            character,
            event.id,
            {
              voice_credits: totalCredits > 0 ? totalCredits : undefined,
              subscription_status: subTiers.size > 0 ? 'active' : undefined
            }
          );
          
          const orderResult = await ordersService.createOrder(orderData);
          
          if (orderResult.success) {
            console.log(`📝 [${webhookId}] ✅ Order record created successfully: ${orderResult.order_id}`);
          } else {
            console.error(`📝 [${webhookId}] ❌ Order record creation failed:`, orderResult.error);
            // Don't fail the webhook if order record fails - the purchase was still successful
          }
        } catch (orderError) {
          console.error(`📝 [${webhookId}] ❌ Order tracking error:`, orderError);
          // Don't fail the webhook - order tracking is supplementary
        }

        // No recovery email needed - users are already authenticated when they purchase
        console.log(`🔐 [${webhookId}] Webhook: ✅ Subscription processed successfully:`, { 
          userId, 
          email, 
          tier, 
          character, 
          totalCredits,
          subTiers: Array.from(subTiers)
        });

        return json(200, { ok: true });
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        // DEPRECATED: Stripe subscriptions no longer used - only VerseCoins subscriptions
        console.log(`🔐 [${webhookId}] Webhook: ⚠️ DEPRECATED Stripe subscription event received: ${event.type}`);
        return json(200, { ok: true, deprecated: true });

        // DEPRECATED CODE BELOW - keeping for reference
        const sub = event.data.object as Stripe.Subscription;
        const stripeCustomerId = (sub.customer as string) || '';
        const status = sub.status;
        const item = sub.items.data[0];
        const priceId = item?.price?.id;
        const character = (sub.metadata?.character_key as string) || (process.env.NEXT_PUBLIC_CHARACTER_KEY ?? process.env.CHARACTER_KEY) || 'lexi';
        const tier = tierFromPrice(priceId, character, webhookId);

        // Find the user.id by looking up stripe customer mapping
        const { data: customerMapping } = await admin
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle();

        if (!customerMapping?.user_id) {
          console.error('[webhook] Subscription event for unknown stripe customer:', stripeCustomerId);
          return json(400, { error: 'Unknown stripe customer' });
        }

        // DEPRECATED: Only update subscription records if the tier is valid for subscriptions
        if (false && (tier === 'sfw' || tier === 'nsfw')) {
          await admin.from('user_subscriptions').upsert({
            user_id: customerMapping!.user_id,
            stripe_customer_id: stripeCustomerId,
            status,
            price_id: priceId ?? null,
            tier,
            character_key: character,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,character_key' });

          // Check Founders Circle eligibility for new active subscriptions
          if (event.type === 'customer.subscription.created' && status === 'active') {
            try {
              console.log(`🏆 [${webhookId}] Webhook: Checking Founders' Circle eligibility for new subscription - user ${customerMapping!.user_id}, character ${character}`);

              const { data: founderResult, error: founderError } = await admin.rpc('add_founder_if_eligible', {
                p_user_id: customerMapping!.user_id,
                p_character_key: character,
                p_subscription_data: {
                  stripe_customer_id: stripeCustomerId,
                  subscription_id: sub.id,
                  tier: tier,
                  price_id: priceId,
                  subscription_type: 'stripe_subscription'
                }
              });

              if (founderError) {
                console.error(`🏆 [${webhookId}] Founders Circle check failed:`, founderError);
              } else {
                console.log(`🏆 [${webhookId}] Founders Circle result:`, founderResult);

                // Grant founder bonus if they became a new founder
                if (founderResult?.is_founder && founderResult?.reason === 'new_founder' && founderResult.founder_number) {
                  console.log(`🎉 [${webhookId}] NEW FOUNDER #${founderResult.founder_number} via subscription! Granting 500 VerseCoins bonus`);

                  await grantVerseCoins(
                    customerMapping!.user_id,
                    500,
                    `Founders' Circle bonus (#${founderResult.founder_number!})`,
                    {
                      founder_number: founderResult.founder_number,
                      character_key: character,
                      source: 'founders_circle_bonus',
                      triggered_by: 'subscription_creation',
                      stripe_customer_id: stripeCustomerId,
                      subscription_id: sub.id
                    }
                  );
                }
              }
            } catch (founderErr) {
              console.error(`🏆 [${webhookId}] Founders Circle integration error:`, founderErr);
              // Don't fail the subscription if Founders Circle fails
            }
          }
        } else {
          console.log(`🔐 [${webhookId}] Webhook: Skipping subscription update for non-subscription tier: ${tier}`);
        }

        console.log(`🔐 [${webhookId}] Webhook: ✅ Subscription update processed:`, {
          userId: customerMapping!.user_id,
          tier,
          status,
          character
        });
        return json(200, { ok: true });
      }

      case 'payment_intent.succeeded': {
        console.log(`🔐 [${webhookId}] Webhook: 💰 Processing tip payment intent succeeded`);
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Get tip details from database
        const { data: tip, error: tipError } = await admin
          .from('tips')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (tipError || !tip) {
          console.error(`🔐 [${webhookId}] Webhook: ❌ Failed to fetch tip details:`, tipError);
          return json(400, { error: 'Tip not found' });
        }

        // Update tip status to completed
        const { error: updateError } = await admin
          .from('tips')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (updateError) {
          console.error(`🔐 [${webhookId}] Webhook: ❌ Failed to update tip status:`, updateError);
          return json(500, { error: 'Failed to update tip status' });
        }

        console.log(`🔐 [${webhookId}] Webhook: ✅ Tip ${paymentIntent.id} marked as completed`);

        // Track tip purchase for analytics
        await trackServerSideEvent('purchase', {
          transaction_id: paymentIntent.id,
          value: (paymentIntent.amount || 0) / 100,
          currency: (paymentIntent.currency || 'usd').toUpperCase(),
          item_category: 'tip',
          character: tip.character_key,
          user_id: tip.user_id,
          has_message: !!tip.message,
        });

        // Create order record for tracking
        try {
          const orderData: OrderData = {
            stripe_payment_intent_id: paymentIntent.id,
            user_id: tip.user_id,
            email: '', // Will be filled by ordersService
            character_key: tip.character_key,
            order_type: 'tip' as const,
            status: 'completed' as const,
            product_type: 'tip',
            product_name: `Tip to ${tip.character_key.charAt(0).toUpperCase() + tip.character_key.slice(1)}`,
            amount_cents: paymentIntent.amount || 0,
            currency: paymentIntent.currency || 'usd',
            tip_amount_cents: paymentIntent.amount || 0,
            tip_character: tip.character_key,
            stripe_metadata: { tip_message: tip.message },
            webhook_event_id: event.id,
            completed_at: new Date()
          };
          
          const orderResult = await ordersService.createOrder(orderData);
          if (orderResult.success) {
            console.log(`🔐 [${webhookId}] Webhook: ✅ Tip order record created: ${orderResult.order_id}`);
          } else {
            console.error(`🔐 [${webhookId}] Webhook: ⚠️ Tip order record failed:`, orderResult.error);
          }
        } catch (orderError) {
          console.error(`🔐 [${webhookId}] Webhook: ⚠️ Tip order tracking error:`, orderError);
        }

        // Send receipt email
        try {
          const { data: userData, error: userError } = await admin.auth.admin.getUserById(tip.user_id);
          
          if (!userError && userData?.user?.email) {
            const receiptItems = [{
              description: tip.message 
                ? `Tip to ${tip.character_key.charAt(0).toUpperCase() + tip.character_key.slice(1)} with message: "${tip.message}"`
                : `Tip to ${tip.character_key.charAt(0).toUpperCase() + tip.character_key.slice(1)}`,
              quantity: 1,
              price: (paymentIntent.amount || 0) / 100,
              total: (paymentIntent.amount || 0) / 100
            }];
            
            const receiptData = {
              purchaseId: paymentIntent.id,
              customerEmail: userData.user.email,
              purchaseDate: new Date(),
              items: receiptItems,
              subtotal: (paymentIntent.amount || 0) / 100,
              total: (paymentIntent.amount || 0) / 100,
              currency: (paymentIntent.currency || 'USD').toUpperCase(),
              character: tip.character_key,
              characterDisplayName: tip.character_key.charAt(0).toUpperCase() + tip.character_key.slice(1)
            };
            
            const receiptResult = await emailService.sendReceiptEmail(tip.user_id, receiptData);
            if (receiptResult.success) {
              console.log(`🔐 [${webhookId}] Webhook: ✅ Tip receipt email sent to ${userData.user.email}`);
            }
          }
        } catch (receiptError) {
          console.error(`🔐 [${webhookId}] Webhook: ⚠️ Tip receipt email error:`, receiptError);
        }

        // ✨ IMMEDIATE TIP ACKNOWLEDGMENT - Send real-time acknowledgment message
        try {
          console.log(`🔐 [${webhookId}] Webhook: 🎉 Triggering immediate tip acknowledgment`);
          await triggerImmediateTipAcknowledgment(tip, paymentIntent);
          console.log(`🔐 [${webhookId}] Webhook: ✅ Tip acknowledgment triggered successfully`);
        } catch (ackError) {
          console.error(`🔐 [${webhookId}] Webhook: ❌ Failed to trigger immediate tip acknowledgment:`, ackError);
          // Don't fail the webhook if acknowledgment fails
        }

        return json(200, { ok: true, tip_completed: true });
      }

      case 'payment_intent.payment_failed': {
        console.log(`🔐 [${webhookId}] Webhook: ❌ Processing tip payment intent failed`);
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update tip status to failed
        const { error: updateError } = await admin
          .from('tips')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (updateError) {
          console.error(`🔐 [${webhookId}] Webhook: ❌ Failed to update failed tip status:`, updateError);
        } else {
          console.log(`🔐 [${webhookId}] Webhook: ✅ Tip ${paymentIntent.id} marked as failed`);
        }

        return json(200, { ok: true, tip_failed: true });
      }

      default:
        console.log(`🔐 [${webhookId}] Webhook: ℹ️ Unhandled event type: ${event.type}`);
        return json(200, { received: true });
    }
  } catch (e: any) {
    console.error(`🔐 [${webhookId}] Webhook: ❌ Handler error:`, {
      error: e?.message,
      stack: e?.stack,
      eventType: event?.type,
      eventId: event?.id
    });
    return json(500, { error: e?.message || 'unhandled' });
  }
}