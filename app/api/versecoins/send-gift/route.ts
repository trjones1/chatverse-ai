import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OrdersService } from '@/lib/ordersService';
import { applyGiftRelationshipBonus, formatRelationshipBonusMessage } from '@/lib/giftRelationshipBonuses';

export async function POST(request: NextRequest) {
  try {
    const { characterKey, giftType, amount, message } = await request.json();

    if (!characterKey || !giftType || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Character key, gift type, and valid amount are required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🎁 Processing VerseCoins gift:', {
      userId: user.id,
      characterKey,
      giftType,
      amount,
      hasMessage: !!message
    });

    const adminSupabase = getSupabaseAdmin();
    const ordersService = new OrdersService();

    try {
      // 1. Check current user VerseCoins balance
      let { data: userCoins, error: fetchError } = await adminSupabase
        .from('user_versecoins')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // Not found
          return NextResponse.json(
            { error: 'No VerseCoins balance found' },
            { status: 400 }
          );
        }
        throw fetchError;
      }

      const currentCredits = userCoins?.credits || 0;

      // 2. Check if user has sufficient balance
      if (currentCredits < amount) {
        return NextResponse.json(
          {
            error: 'Insufficient VerseCoins balance',
            required: amount,
            available: currentCredits
          },
          { status: 400 }
        );
      }

      const newBalance = currentCredits - amount;

      // 3. Update user balance
      const { error: updateError } = await adminSupabase
        .from('user_versecoins')
        .update({
          credits: newBalance,
          total_spent: (userCoins?.total_spent || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // 4. Record VerseCoins transaction
      const { error: transactionError } = await adminSupabase
        .from('versecoins_transactions')
        .insert({
          user_id: user.id,
          type: 'debit',
          amount: -amount,
          balance_after: newBalance,
          description: `Gift sent to ${characterKey}: ${giftType}`,
          reference_type: 'gift',
          reference_id: null,
          metadata: {
            characterKey,
            gift_type: giftType,
            gift_amount: amount,
            message: message || '',
            timestamp: new Date().toISOString()
          }
        });

      if (transactionError) {
        throw transactionError;
      }

      // 5. Create order record for tracking
      const orderResult = await ordersService.createOrder({
        user_id: user.id,
        email: user.email || 'unknown@example.com',
        character_key: characterKey,
        order_type: 'tip', // Using 'tip' as closest category
        status: 'completed',
        product_type: 'gift',
        product_name: `Gift for ${characterKey}: ${giftType}`,
        amount_cents: amount * 100, // Convert for consistency
        currency: 'versecoins',
        tip_amount_cents: amount * 100, // Reuse tip field for gifts
        tip_character: characterKey,
        stripe_metadata: {
          paid_with: 'versecoins',
          versecoins_amount: amount,
          character_key: characterKey,
          gift_type: giftType,
          gift_message: message || ''
        },
        completed_at: new Date()
      });

      if (!orderResult.success) {
        console.warn('⚠️ Order creation failed, but gift was sent:', orderResult.error);
      }

      // 6. Apply relationship score bonuses (pay-to-win feature)
      let relationshipBonus = null;
      try {
        relationshipBonus = await applyGiftRelationshipBonus(user.id, characterKey, amount, giftType);
        console.log('🎁💕 Applied gift relationship bonuses:', relationshipBonus);
      } catch (bonusError) {
        console.error('❌ Failed to apply gift relationship bonuses:', bonusError);
        // Don't fail the entire gift if bonus fails
      }

      // 7. Create gift acknowledgment message for character response
      let acknowledgmentMessage = null;
      try {
        const fanfareLevel = amount >= 5000 ? 'epic' : amount >= 2000 ? 'large' : amount >= 800 ? 'medium' : 'small';

        // Generate character-specific gift acknowledgment
        const { generateGiftAcknowledgment, getCharacterGift } = await import('@/lib/characterGifts');

        // Check if user has NSFW mode enabled
        const isNsfwMode = user?.user_metadata?.nsfwMode === true;

        // Extract gift ID from giftType (assuming format "emoji Name" or just giftType)
        const giftId = giftType.toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

        // Get the specific gift for better acknowledgment
        const gift = getCharacterGift(characterKey, giftId);
        const acknowledgment = gift
          ? generateGiftAcknowledgment(characterKey, giftId, amount, undefined, isNsfwMode)
          : `Thank you for the ${giftType}! This is such a thoughtful gift! 💕`;

        // Generate selfie for the gift acknowledgment - ALWAYS generate for gifts as special thank you
        let selfieData = null;
        try {
          // Import selfie generation functions
          const { getCharacterSelfie, extractMoodFromMessage } = await import('@/lib/selfieSystem');

          // Extract mood from acknowledgment message for appropriate selfie
          const mood = extractMoodFromMessage(acknowledgment);

          // Force selfie generation for gifts - bypass random chance
          selfieData = await getCharacterSelfie({
            character: characterKey,
            userId: user.id,
            mood,
            nsfwMode: isNsfwMode,
            messageContext: `Gift acknowledgment: ${giftType} (${amount} VC)`,
            excludeRecentHours: 0 // Allow recent selfies for gifts since they're special
          });

          console.log('🤳 Generated GUARANTEED selfie for gift acknowledgment:', selfieData ? 'Success' : 'No selfie available in database');
        } catch (selfieError) {
          console.error('🤳 Failed to generate selfie for gift:', selfieError);
        }

        // Create the acknowledgment message in the interaction_log (which is the actual messages table)
        const { data: messageData, error: messageError } = await adminSupabase
          .from('interaction_log')
          .insert({
            user_id: user.id,
            character_key: characterKey,
            content: acknowledgment,
            role: 'assistant',
            nsfw: isNsfwMode, // Use NSFW mode to enable spicy styling
            metadata: {
              selfie: selfieData,
              is_gift_acknowledgment: true,
              gift_type: giftType,
              gift_amount: amount,
              fanfare_level: fanfareLevel,
              gift_id: giftId,
              relationship_bonus: relationshipBonus
            }
          })
          .select()
          .single();

        if (messageError) {
          console.error('❌ Failed to create gift acknowledgment message:', messageError);
        } else {
          console.log('✅ Created gift acknowledgment message with fanfare level:', fanfareLevel);
          acknowledgmentMessage = {
            id: messageData.id,
            text: acknowledgment,
            isUser: false,
            character: characterKey,
            created_at: messageData.created_at,
            is_gift_acknowledgment: true,
            gift_type: giftType,
            gift_amount: amount,
            fanfare_level: fanfareLevel,
            selfie: selfieData,
            metadata: {
              selfie: selfieData,
              is_gift_acknowledgment: true,
              gift_type: giftType,
              gift_amount: amount,
              fanfare_level: fanfareLevel,
              gift_id: giftId,
              relationship_bonus: relationshipBonus
            }
          };
        }
      } catch (ackError) {
        console.error('❌ Error creating gift acknowledgment:', ackError);
        // Don't fail the entire gift if acknowledgment fails
      }

      console.log('✅ VerseCoins gift sent successfully:', {
        userId: user.id,
        characterKey,
        giftType,
        amount,
        newBalance
      });

      return NextResponse.json({
        success: true,
        gift: {
          characterKey,
          type: giftType,
          amount,
          message: message || '',
          timestamp: new Date().toISOString()
        },
        versecoins: {
          spent: amount,
          new_balance: newBalance
        },
        relationship_bonus: relationshipBonus,
        order_id: orderResult.order_id,
        acknowledgment_message: acknowledgmentMessage
      });

    } catch (dbError) {
      console.error('❌ Database error during gift sending:', dbError);

      return NextResponse.json(
        { error: 'Failed to send gift. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ VerseCoins gift error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}