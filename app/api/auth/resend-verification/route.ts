// app/api/auth/resend-verification/route.ts
// Manual verification email resend endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';
import { getCharacterConfig } from '@/lib/characters.config';

export async function POST(req: NextRequest) {
  try {
    const { email, characterKey, hostname } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create Supabase client for server-side operations
    const supabase = createClient();
    
    // Get user by email to check if they exist
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Failed to list users:', userError);
      return NextResponse.json(
        { error: 'Failed to lookup user' },
        { status: 500 }
      );
    }

    const user = users?.find((u: any) => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Get character config
    const config = getCharacterConfig(hostname || 'chatwithlexi.com');
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid character configuration' },
        { status: 400 }
      );
    }

    // Generate new confirmation token
    const confirmationToken = btoa(`${user.id}:${Date.now()}:${Math.random()}`);
    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chatwithlexi.com'}/auth/confirm?token=${confirmationToken}&email=${encodeURIComponent(email)}`;

    // Send verification email
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://chatwithlexi.com'}/api/email/send-custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.email?.fromName || config.displayName} <${config.email?.replyTo || `noreply@${hostname || 'chatwithlexi.com'}`}>`,
        to: email,
        subject: `${config.displayName} - Verify your email`,
        html: generateManualResendTemplate({
          characterName: config.displayName,
          characterKey: characterKey || config.key,
          email,
          confirmationUrl,
          isResend: true
        })
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send verification email:', errorText);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    console.log(`📧 Manual verification email sent to ${email} for ${config.displayName}`);
    
    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      email,
      character: config.displayName
    });

  } catch (error) {
    console.error('Manual verification resend error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface EmailTemplateOptions {
  characterName: string;
  characterKey: string;
  email: string;
  confirmationUrl: string;
  isResend: boolean;
}

function generateManualResendTemplate({
  characterName,
  characterKey,
  email,
  confirmationUrl,
  isResend
}: EmailTemplateOptions): string {
  // Character-specific messaging for manual resend emails
  const messages = {
    lexi: {
      greeting: isResend ? "Hey babe, I'm back! 💕" : "Hey babe, it's Lexi! 💕",
      message: isResend 
        ? "I know there was a hiccup before, but I'm here now! Let's get you verified so I can remember all our amazing chats! 😘" 
        : "I'm so excited you want to chat with me! Tap the button and I'll remember you forever. 😘",
      buttonText: "Verify & Let's Chat!"
    },
    dom: {
      greeting: isResend ? "Let's resolve this immediately." : "Welcome. This is Dominic.",
      message: isResend 
        ? "Technical difficulties are unacceptable. Complete your verification now and let's continue where we left off. 💼" 
        : "You've made the right choice. Confirm your account and let's see if you can handle what I have to offer. 💼",
      buttonText: "Complete Verification"
    },
    nyx: {
      greeting: isResend ? "The shadows call to you again... 🌙" : "The shadows whisper your name... I am Nyx. 🌙",
      message: isResend 
        ? "The first attempt was merely a test. Now complete the ritual and reclaim what was lost in the void. 🕷️" 
        : "You've been drawn to my realm. Confirm your passage and let the darkness embrace you. 🕷️",
      buttonText: "Complete the Ritual"
    },
    chase: {
      greeting: isResend ? "Missed me already? 😏" : "Hey there, I'm Chase 😏",
      message: isResend 
        ? "Looks like we had some technical issues, but I'm not giving up on us that easily! Let's get you verified and pick up where we left off... 🔥" 
        : "Ready for some fun? Confirm your account and let's see where this goes... 🔥",
      buttonText: "Let's Continue!"
    },
    default: {
      greeting: isResend ? `Hi again from ${characterName}!` : `Hello from ${characterName}!`,
      message: isResend 
        ? "There was an issue with the previous verification email. Please verify your email address to recover your account and conversations." 
        : "Thanks for signing up! Confirm your account to start our conversations.",
      buttonText: "Verify Email"
    }
  };

  const msg = messages[characterKey as keyof typeof messages] || messages.default;

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr><td align="center" style="padding:32px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff;border-radius:20px;box-shadow:0 10px 30px rgba(255,0,122,.12)">
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:24px;">${msg.greeting}</h1>
            <p style="margin:0 0 16px;font-size:15px;opacity:.8">${msg.message}</p>
            ${isResend ? '<p style="margin:0 0 16px;font-size:14px;color:#059669;background:#ecfdf5;padding:12px;border-radius:8px;"><strong>🔄 Recovery Mode:</strong> This email will help you recover your account and previous conversations.</p>' : ''}
            <p style="margin:24px 0;">
              <a href="${confirmationUrl}" 
                 style="display:inline-block;background:linear-gradient(90deg,#7b61ff,#ff3cac);color:white;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:600;">
                ${msg.buttonText}
              </a>
            </p>
            <p style="margin:16px 0 0;font-size:13px;opacity:.6;">
              This link expires in 24 hours. Having trouble? Copy and paste this URL: ${confirmationUrl}
            </p>
            <p style="margin:16px 0 0;font-size:12px;opacity:.5;">
              Email sent to: ${email}
            </p>
            ${isResend ? '<p style="margin:16px 0 0;font-size:12px;opacity:.5;">💡 Once verified, your conversations will be restored automatically.</p>' : ''}
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;
}