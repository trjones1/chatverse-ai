// app/api/email/send-custom/route.ts
// Custom email sending via Resend for character-specific auth emails

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { from, to, subject, html } = await req.json();

    if (!from || !to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: from, to, subject, html' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      // Add some headers for better deliverability
      headers: {
        'X-Entity-Ref-ID': Math.random().toString(36).substring(7),
      },
    });

    if (error) {
      console.error('Resend email error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', { id: data?.id, to });
    
    return NextResponse.json({ 
      success: true, 
      messageId: data?.id 
    });

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}