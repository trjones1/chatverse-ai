import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { amount, description, reference_type, reference_id, metadata } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
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

    console.log('💳 Debiting VerseCoins:', {
      userId: user.id,
      amount,
      description
    });

    // Use admin client for database operations
    const adminSupabase = getSupabaseAdmin();

    // Start transaction-like operations
    try {
      // 1. Get current user VerseCoins balance
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

      // 4. Record transaction
      const { error: transactionError } = await adminSupabase
        .from('versecoins_transactions')
        .insert({
          user_id: user.id,
          type: 'debit',
          amount: -amount, // Negative for debit
          balance_after: newBalance,
          description: description || 'VerseCoins debit',
          reference_type: reference_type || 'system',
          reference_id: reference_id || null,
          metadata: metadata || {}
        });

      if (transactionError) {
        throw transactionError;
      }

      console.log('✅ VerseCoins debited successfully:', {
        userId: user.id,
        amount,
        newBalance,
        description
      });

      return NextResponse.json({
        success: true,
        amount_debited: amount,
        new_balance: newBalance
      });

    } catch (dbError) {
      console.error('❌ Database error during debit:', dbError);

      return NextResponse.json(
        { error: 'Failed to debit VerseCoins. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ VerseCoins debit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}