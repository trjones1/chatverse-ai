import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { token, reason } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Unsubscribe token is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Try to find user by existing unsubscribe token
    const { data: existingUnsubscribe } = await supabase
      .from('email_unsubscribes')
      .select('user_id, email_address')
      .eq('token', token)
      .single();

    if (existingUnsubscribe) {
      return NextResponse.json({
        success: true,
        message: 'You are already unsubscribed from our emails',
        alreadyUnsubscribed: true
      });
    }

    // Try to find user by message_id in email logs
    const { data: emailLog } = await supabase
      .from('email_logs')
      .select('user_id, email_address')
      .eq('message_id', token)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (!emailLog) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 404 }
      );
    }

    // Create unsubscribe record
    const { error: insertError } = await supabase
      .from('email_unsubscribes')
      .insert({
        user_id: emailLog.user_id,
        email_address: emailLog.email_address,
        reason: reason || 'User requested unsubscribe',
        token: token
      });

    if (insertError) {
      console.error('Error creating unsubscribe record:', insertError);
      return NextResponse.json(
        { error: 'Failed to process unsubscribe request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'You have been successfully unsubscribed from our emails'
    });

  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for unsubscribe page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Unsubscribe token is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if already unsubscribed
    const { data: existingUnsubscribe } = await supabase
      .from('email_unsubscribes')
      .select('email_address, unsubscribed_at')
      .eq('token', token)
      .single();

    if (existingUnsubscribe) {
      return NextResponse.json({
        success: true,
        alreadyUnsubscribed: true,
        email: existingUnsubscribe.email_address,
        unsubscribedAt: existingUnsubscribe.unsubscribed_at
      });
    }

    // Try to find the email log to get user info
    const { data: emailLog } = await supabase
      .from('email_logs')
      .select('email_address, sent_at')
      .eq('message_id', token)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (!emailLog) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyUnsubscribed: false,
      email: emailLog.email_address,
      canUnsubscribe: true
    });

  } catch (error) {
    console.error('Error checking unsubscribe status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}