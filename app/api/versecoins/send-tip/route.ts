import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OrdersService } from '@/lib/ordersService';

export async function POST(request: NextRequest) {
  try {
    const { characterKey, amount, message } = await request.json();

    if (!characterKey || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Character key and valid amount are required' },
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

    console.log('💝 Processing VerseCoins tip:', {
      userId: user.id,
      characterKey,
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
          description: `Tip sent to ${characterKey}`,
          reference_type: 'tip',
          reference_id: null,
          metadata: {
            characterKey,
            tip_amount: amount,
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
        order_type: 'tip',
        status: 'completed',
        product_type: 'tip',
        product_name: `Tip for ${characterKey}`,
        amount_cents: amount, // VerseCoins are already in cents (1 VC = 1 cent)
        currency: 'versecoins',
        tip_amount_cents: amount,
        tip_character: characterKey,
        stripe_metadata: {
          paid_with: 'versecoins',
          versecoins_amount: amount,
          character_key: characterKey,
          tip_message: message || ''
        },
        completed_at: new Date()
      });

      if (!orderResult.success) {
        console.warn('⚠️ Order creation failed, but tip was sent:', orderResult.error);
      }

      // 6. Create tip acknowledgment message for fanfare system
      let acknowledgmentMessage = null;
      try {
        const tipAmount = amount / 100; // Convert to dollars for display
        const fanfareLevel = amount >= 1000 ? 'epic' : amount >= 500 ? 'large' : amount >= 250 ? 'medium' : 'small';

        // Check if user has NSFW mode enabled
        const isNsfwMode = user?.user_metadata?.nsfwMode === true;

        // Generate tip acknowledgment using the same system as Stripe tips
        let acknowledgment;
        try {

          const { generateTipAcknowledgment } = await import('@/lib/tipSystem');
          acknowledgment = generateTipAcknowledgment(
            {
              id: `vc-tip-${Date.now()}`,
              amount_cents: amount,
              message: message || '',
              created_at: new Date().toISOString()
            },
            characterKey,
            isNsfwMode
          );
          console.log('✅ Generated tip acknowledgment:', {
            characterKey,
            acknowledgmentLength: acknowledgment?.length,
            fanfareLevel
          });
        } catch (importError: any) {
          console.error('❌ Error importing or calling generateTipAcknowledgment:', {
            error: importError,
            errorMessage: importError?.message,
            errorStack: importError?.stack,
            characterKey,
            amount,
            fanfareLevel
          });
          // Fallback acknowledgment
          acknowledgment = `Thank you so much for the ${amount} VerseCoins tip! 💖`;
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
              is_tip_acknowledgment: true,
              tip_amount_cents: amount,
              fanfare_level: fanfareLevel
            }
          })
          .select()
          .single();

        if (messageError) {
          console.error('❌ Failed to create tip acknowledgment message:', {
            error: messageError,
            errorCode: messageError?.code,
            errorMessage: messageError?.message,
            errorDetails: messageError?.details,
            errorHint: messageError?.hint,
            acknowledgmentText: acknowledgment,
            acknowledgmentLength: acknowledgment?.length,
            userId: user.id,
            characterKey,
            fanfareLevel,
            insertData: {
              user_id: user.id,
              character_key: characterKey,
              content: acknowledgment,
              role: 'assistant',
              nsfw: false,
              metadata: {
                is_tip_acknowledgment: true,
                tip_amount_cents: amount,
                fanfare_level: fanfareLevel
              }
            }
          });
        } else {
          console.log('✅ Created tip acknowledgment message with fanfare level:', fanfareLevel);
          acknowledgmentMessage = {
            id: messageData.id,
            text: acknowledgment,
            isUser: false,
            character: characterKey,
            created_at: messageData.created_at,
            is_tip_acknowledgment: true,
            tip_amount_cents: amount,
            fanfare_level: fanfareLevel
          };
        }
      } catch (ackError) {
        console.error('❌ Error creating tip acknowledgment:', ackError);
        // Don't fail the entire tip if acknowledgment fails
      }

      console.log('✅ VerseCoins tip sent successfully:', {
        userId: user.id,
        characterKey,
        amount,
        newBalance
      });

      return NextResponse.json({
        success: true,
        tip: {
          characterKey,
          amount,
          message: message || '',
          timestamp: new Date().toISOString()
        },
        versecoins: {
          spent: amount,
          new_balance: newBalance
        },
        order_id: orderResult.order_id,
        acknowledgment_message: acknowledgmentMessage
      });

    } catch (dbError) {
      console.error('❌ Database error during tip sending:', dbError);

      return NextResponse.json(
        { error: 'Failed to send tip. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ VerseCoins tip error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}