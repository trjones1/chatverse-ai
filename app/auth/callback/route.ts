// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { trackUserActivity, createEmailPreferences } from '@/lib/emailService';
import { adminNotifications } from '@/lib/adminNotifications';
import { resetRateLimitForUser } from '@/lib/rate-limiting-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const rawNext = url.searchParams.get('next') ?? '/chat';

  // sanitize `next` to same-origin path
  let nextPath = '/chat';
  try {
    const dest = new URL(rawNext, url.origin);
    if (dest.origin === url.origin) {
      nextPath = dest.pathname + dest.search + dest.hash;
    }
  } catch {
    /* ignore */
  }

  if (!code) {
    return NextResponse.redirect(new URL('/chat?error=missing_code', url.origin));
  }

  // Track if this will be a new sign-in (we'll set this later)
  let welcomeBonus = false;

  // Prepare a response up front so we can set cookies on it
  const res = NextResponse.redirect(new URL(nextPath, url.origin));

  // Build Supabase with req/res cookie adapters (no next/headers here)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    // This writes the auth cookie to `res`
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      throw error;
    }

    // Track login activity and setup email preferences for new/returning users
    if (data?.user) {
      const userId = data.user.id;
      const userEmail = data.user.email;

      try {
        // Track login activity
        await trackUserActivity(userId, 'login', undefined, {
          login_method: 'oauth_callback',
          timestamp: new Date().toISOString(),
          user_agent: req.headers.get('user-agent'),
        });

        // Create email preferences if they don't exist (for new users)
        if (userEmail) {
          await createEmailPreferences(userId, userEmail);

          // Check if this is a NEW user by checking created_at
          const createdAt = new Date(data.user.created_at);
          const now = new Date();
          const isNewUser = (now.getTime() - createdAt.getTime()) < 60000; // Within last minute

          // 🎁 REWARD: Reset rate limit for ALL sign-ins (give them 3 free messages)
          // This creates a better UX - users can chat immediately after signing in
          try {
            await resetRateLimitForUser(userId, 'chat');
            console.log(`[Auth] ✅ Reset rate limit for user ${userId} - they get 3 free messages!`);
            welcomeBonus = true; // Flag for showing celebration message
          } catch (resetError) {
            console.error('[Auth] Failed to reset rate limit:', resetError);
            // Don't fail auth for this
          }

          // Send admin notification for new signups
          if (isNewUser) {
            const provider = data.user.app_metadata.provider || 'email';
            const signupMethod: 'email' | 'google' | 'oauth' =
              provider === 'google' ? 'google' :
              provider === 'email' ? 'email' : 'oauth';

            await adminNotifications.notifyNewSignup({
              userId,
              email: userEmail,
              signupMethod,
              timestamp: createdAt.toISOString(),
            }).catch(err => {
              console.error('Failed to send admin signup notification:', err);
              // Don't fail auth for notification errors
            });
          }
        }
      } catch (trackingError) {
        console.error('Failed to track login or create email preferences:', trackingError);
        // Don't fail the auth process for tracking errors
      }
    }
  } catch {
    return NextResponse.redirect(new URL('/chat?error=callback', url.origin));
  }

  // Add welcome bonus query parameter if rate limit was reset
  if (welcomeBonus) {
    const finalUrl = new URL(nextPath, url.origin);
    finalUrl.searchParams.set('welcome_bonus', '1');
    return NextResponse.redirect(finalUrl, {
      headers: res.headers,
      status: res.status,
    });
  }

  // Return the SAME response we wrote cookies to
  return res;
}
