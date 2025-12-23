// lib/customAuth.ts
// Custom authentication with character-specific Resend emails

import { createClient } from '@/utils/supabase/client';
import { getCharacterConfig } from '@/lib/characters.config';

export interface CustomSignUpOptions {
  email: string;
  password: string;
  characterKey: string;
  hostname: string;
  redirectUrl?: string;
}

export interface CustomSignUpResult {
  success: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export async function customSignUp({
  email,
  password,
  characterKey,
  hostname,
  redirectUrl
}: CustomSignUpOptions): Promise<CustomSignUpResult> {
  try {
    const supabase = createClient();
    
    // First, try to sign up with Supabase (but disable their emails)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl || `${window.location.origin}/auth/callback`,
        // This prevents Supabase from sending their email
        data: {
          email_confirm: false
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Send custom character-specific confirmation email via Resend
    const emailResult = await sendCustomConfirmationEmail({
      email,
      characterKey,
      hostname,
      userId: data.user.id,
      confirmationToken: data.user.email_confirmed_at ? null : generateConfirmationToken(data.user.id)
    });

    if (!emailResult.success) {
      console.error('Failed to send custom confirmation email:', emailResult.error);
      // Don't fail the signup, just log the email issue
    }

    return {
      success: true,
      needsEmailConfirmation: !data.user.email_confirmed_at
    };

  } catch (error) {
    console.error('Custom signup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Signup failed'
    };
  }
}

interface CustomEmailOptions {
  email: string;
  characterKey: string;
  hostname: string;
  userId: string;
  confirmationToken: string | null;
}

async function sendCustomConfirmationEmail({
  email,
  characterKey,
  hostname,
  userId,
  confirmationToken
}: CustomEmailOptions) {
  try {
    const config = getCharacterConfig(hostname);
    if (!config) {
      return { success: false, error: 'Character config not found' };
    }

    const confirmationUrl = confirmationToken 
      ? `${window.location.origin}/auth/confirm?token=${confirmationToken}&email=${encodeURIComponent(email)}`
      : `${window.location.origin}/auth/callback`;

    const emailPayload = {
      from: `${config.email?.fromName || config.displayName} <${config.email?.replyTo || `noreply@${hostname}`}>`,
      to: email,
      subject: `Welcome to ${config.displayName}! Confirm your account`,
      html: generateCharacterEmailTemplate({
        characterName: config.displayName,
        characterKey,
        confirmationUrl,
        hostname,
        config
      })
    };

    // Send via your Resend API
    const response = await fetch('/api/email/send-custom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    return { success: true };

  } catch (error) {
    console.error('Email sending error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email send failed' 
    };
  }
}

function generateConfirmationToken(userId: string): string {
  // Generate a secure token (in production, use crypto.randomBytes or similar)
  return btoa(`${userId}:${Date.now()}:${Math.random()}`);
}

interface EmailTemplateOptions {
  characterName: string;
  characterKey: string;
  confirmationUrl: string;
  hostname: string;
  config: any;
}

function generateCharacterEmailTemplate({
  characterName,
  characterKey,
  confirmationUrl,
  hostname,
  config
}: EmailTemplateOptions): string {
  // Character-specific messaging
  const messages = {
    lexi: {
      greeting: "Hey babe, it's Lexi! 💕",
      message: "I'm so excited you want to chat with me! Tap the button and I'll remember you forever. 😘",
      buttonText: "Confirm & Start Chatting"
    },
    dom: {
      greeting: "Welcome. This is Dominic.",
      message: "You've made the right choice. Confirm your account and let's see if you can handle what I have to offer. 💼",
      buttonText: "Confirm Access"
    },
    nyx: {
      greeting: "The shadows whisper your name... I am Nyx. 🌙",
      message: "You've been drawn to my realm. Confirm your passage and let the darkness embrace you. 🕷️",
      buttonText: "Enter the Void"
    },
    chase: {
      greeting: "Hey there, I'm Chase 😏",
      message: "Ready for some fun? Confirm your account and let's see where this goes... 🔥",
      buttonText: "Let's Do This"
    },
    default: {
      greeting: `Hello from ${characterName}!`,
      message: "Thanks for signing up! Confirm your account to start our conversations.",
      buttonText: "Confirm Account"
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
            <p style="margin:24px 0;">
              <a href="${confirmationUrl}" 
                 style="display:inline-block;background:linear-gradient(90deg,#7b61ff,#ff3cac);color:white;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:600;">
                ${msg.buttonText}
              </a>
            </p>
            <p style="margin:16px 0 0;font-size:13px;opacity:.6;">
              This link expires in 24 hours. Having trouble? Copy and paste this URL: ${confirmationUrl}
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;
}