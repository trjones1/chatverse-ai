// app/api/admin/user-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { authenticateRequest } from '@/lib/auth-headers';
import { isAdminUser } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await authenticateRequest(req, { requireAuth: true });
    const { user, isAuthenticated } = authResult;
    
    if (!isAuthenticated || !user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, character, action, data } = await req.json();
    
    if (!email || !character || !action) {
      return NextResponse.json({ 
        error: 'Email, character, and action are required' 
      }, { status: 400 });
    }

    const supabase = await makeServerSupabase();

    // Get target user by email using database query (more efficient than listing all auth users)
    const { data: userRecord, error: userQueryError } = await supabase
      .from('auth.users')
      .select('id, email, created_at, email_confirmed_at')
      .eq('email', email)
      .single();
    
    if (userQueryError || !userRecord) {
      return NextResponse.json({ 
        error: 'User not found with email: ' + email 
      }, { status: 404 });
    }

    // Create a compatible user object
    const targetUser = {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        created_at: userRecord.created_at,
        email_confirmed_at: userRecord.email_confirmed_at
      }
    };

    let result = {};

    switch (action) {
      case 'grant_subscription':
        const { tier, duration_months = 1 } = data;
        if (!tier || !['sfw', 'nsfw'].includes(tier)) {
          return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
        }

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + duration_months);

        // Insert or update subscription
        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: targetUser.user.id,
            character_key: character,
            stripe_subscription_id: `admin_granted_${Date.now()}`,
            stripe_customer_id: targetUser.user.id,
            subscription_status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: expiresAt.toISOString(),
            cancel_at_period_end: false,
            tier: tier.toLowerCase(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,character_key'
          })
          .select()
          .single();

        if (subError) throw subError;
        result = { subscription, action: 'granted' };
        break;

      case 'revoke_subscription':
        // Set subscription to cancelled
        const { error: revokeError } = await supabase
          .from('user_subscriptions')
          .update({
            subscription_status: 'canceled',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', targetUser.user.id)
          .eq('character_key', character);

        if (revokeError) throw revokeError;
        result = { action: 'revoked' };
        break;

      case 'add_voice_credits':
        const { credits } = data;
        if (!credits || credits <= 0) {
          return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
        }

        // Get current balance or create new record
        const { data: currentCredits } = await supabase
          .from('voice_credits')
          .select('*')
          .eq('user_id', targetUser.user.id)
          .single();

        const newBalance = (currentCredits?.balance || 0) + credits;
        const newTotalEarned = (currentCredits?.total_earned || 0) + credits;

        const { data: updatedCredits, error: creditsError } = await supabase
          .from('voice_credits')
          .upsert({
            user_id: targetUser.user.id,
            balance: newBalance,
            total_earned: newTotalEarned,
            total_spent: currentCredits?.total_spent || 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (creditsError) throw creditsError;

        // Log the credit addition
        await supabase
          .from('voice_credit_transactions')
          .insert({
            user_id: targetUser.user.id,
            character_key: character,
            credits: credits,
            transaction_type: 'admin_grant',
            description: `Admin granted ${credits} voice credits`,
            created_at: new Date().toISOString()
          });

        result = { credits: updatedCredits, action: 'credits_added', amount: credits };
        break;

      case 'set_voice_credits':
        const { balance } = data;
        if (balance < 0) {
          return NextResponse.json({ error: 'Balance cannot be negative' }, { status: 400 });
        }

        const { data: setCredits, error: setError } = await supabase
          .from('voice_credits')
          .upsert({
            user_id: targetUser.user.id,
            balance: balance,
            total_earned: balance, // Reset earned to match balance
            total_spent: 0, // Reset spent
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (setError) throw setError;

        // Log the balance change
        await supabase
          .from('voice_credit_transactions')
          .insert({
            user_id: targetUser.user.id,
            character_key: character,
            credits: balance,
            transaction_type: 'admin_set',
            description: `Admin set voice credits balance to ${balance}`,
            created_at: new Date().toISOString()
          });

        result = { credits: setCredits, action: 'balance_set', balance };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_user_id: user.id,
        admin_email: user.email,
        target_user_id: targetUser.user.id,
        target_email: targetUser.user.email,
        action: action,
        character_key: character,
        data: data,
        result: result,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      action: action,
      result: result
    });

  } catch (error) {
    console.error('User access management error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}