'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getCharacterConfig } from '@/lib/characters.config';

export const dynamic = 'force-dynamic';

type SyncResult =
  | { ok: true; customerEmail?: string; character?: string }
  | { ok: false; error?: string };

type Status = 'syncing' | 'idle' | 'ok' | 'err';

function SuccessInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const sb = createClient();

  const [status, setStatus] = useState<Status>('syncing');
  const [email, setEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string>('');
  const [clientSessionChecked, setClientSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const firedConfettiRef = useRef(false);

  const sessionId = sp?.get('session_id');
  const character = useMemo(() => sp?.get('character') || 'lexi', [sp]);
  const next = useMemo(() => `/chat?character=${encodeURIComponent(character)}`, [character]);
  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL!;
  
  // Get character config for dynamic branding
  const characterConfig = useMemo(() => {
    if (typeof window !== 'undefined') {
      return getCharacterConfig(window.location.hostname);
    }
    // Fallback for SSR - will be corrected on client
    return getCharacterConfig('localhost:3000');
  }, []);
  
  // Manual password reset CTA (only if not logged in)
  const sendPasswordReset = async (targetEmail: string) => {
    const redirectTo = `${siteUrl}/auth/update-password?next=${encodeURIComponent(next)}`;
    const { error } = await sb.auth.resetPasswordForEmail(targetEmail, { redirectTo });
    if (error) throw error;
  };

  // Lightweight confetti
  const fireConfetti = () => {
    if (firedConfettiRef.current) return;
    firedConfettiRef.current = true;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    const makeBit = (i: number) => {
      const bit = document.createElement('div');
      const size = 6 + Math.random() * 8;
      bit.style.position = 'absolute';
      bit.style.width = `${size}px`;
      bit.style.height = `${size * 0.6}px`;
      bit.style.left = `${Math.random() * 100}vw`;
      bit.style.top = `-10px`;
      bit.style.borderRadius = '2px';
      bit.style.transform = `rotate(${Math.random() * 360}deg)`;
      bit.style.background = `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`;
      bit.style.opacity = '0.9';
      const fall = 800 + Math.random() * 1200;
      const drift = (Math.random() - 0.5) * 200;
      bit.animate(
        [
          { transform: bit.style.transform, offset: 0 },
          {
            transform: `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${720 * (Math.random() + 0.5)}deg)`,
            offset: 1,
          },
        ],
        { duration: fall, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
      );
      setTimeout(() => bit.remove(), fall + 100);
      return bit;
    };

    for (let i = 0; i < 120; i++) {
      container.appendChild(makeBit(i));
    }
    setTimeout(() => container.remove(), 2000);
  };
  // NEW: first, check client session immediately
  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      const hasUser = !!session?.user;
      setIsAuthenticated(hasUser);
      
      if (hasUser && !sessionId) {
        // Already logged in and no sync to run: show splash
        setStatus('ok');
      }
      setClientSessionChecked(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  // existing effect: RUN SYNC only when session_id present
  // 1) Sync purchase; decide logged-in vs not
  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      try {
        // Sync entitlements server-side
        const res = await fetch(
          `/api/checkout/sync?session_id=${encodeURIComponent(sessionId)}&character=${encodeURIComponent(character)}`,
          { method: 'GET', credentials: 'include' }
        );
        const json = (await res.json()) as SyncResult;
        if (!res.ok || !json?.ok) throw new Error((json as any)?.error || 'sync failed');

        // Check if user is logged in after sync
        const { data: { session } } = await sb.auth.getSession();
        const checkoutEmail = (json as any)?.customerEmail || null;
        
        // If logged in, show success
        if (session?.user) {
          setIsAuthenticated(true);
          setStatus('ok');
          return;
        }

        // For users who just completed payment, show success instead of secure account
        // The purchase was successful, so we should celebrate that
        if (sessionId && checkoutEmail) {
          // Store the email for potential future use
          try {
            window.localStorage.setItem('lastCheckoutEmail', checkoutEmail);
          } catch {}
          
          // Show success - the payment worked, even if they got logged out
          setStatus('ok');
          return;
        }

        // Fallback: show secure account message only if we have no session ID (shouldn't happen)
        if (checkoutEmail) {
          setEmail(checkoutEmail);
          setNote('We sent you a login link after checkout. If you didn\'t get it, use the button below.');
        } else {
          setNote('Finish signing in to use your new perks.');
        }
        setStatus('idle');
      } catch (e: any) {
        console.error('Success page error:', e);
        setErr(e?.message ?? 'Could not finalize your unlock.');
        setStatus('err');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, character]);

  // Fire confetti on success splash
  useEffect(() => {
    if (status === 'ok') fireConfetti();
  }, [status]);

  const resend = async () => {
    if (!email) return;
    try {
      await sendPasswordReset(email);
      setNote('Resent! Check your inbox.');
    } catch (e: any) {
      setErr(e?.message ?? 'Could not resend link.');
      setStatus('err');
    }
  };

  const openLogin = () => {
    document.body.dataset.modal = 'open';
    window.dispatchEvent(new Event('modal-open'));
    window.dispatchEvent(new Event('open-login'));
  };

  const loginWithGoogle = async () => {
    try {
      await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
    } catch {
      // modal/manual handles fallback
    }
  };

  // Character branding styles
  const characterTheme = characterConfig.theme;
  const gradientStyle = {
    background: `linear-gradient(135deg, ${characterTheme.primary}15, ${characterTheme.accent}10, ${characterTheme.secondary}15)`,
    borderColor: `${characterTheme.primary}30`
  };
  
  const characterLabel = characterConfig.displayName;
  
  // Character-specific success messages
  const getSuccessMessage = () => {
    const messages: Record<string, string> = {
      lexi: "¡Sí, Papi! Your unlock is complete! 💋",
      nyx: "Your darkness has been unlocked, pet... 🖤", 
      chloe: "Your cozy unlock is ready, sweetie! 🎀",
      aiko: "Unlocked successfully, Senpai! (◡ ‿ ◡) 🌸",
      zaria: "Your radiant upgrade is complete! ✨",
      nova: "The cosmos have aligned for your unlock... 🔮",
      dom: "Your premium access is secured. Well done. ⚡",
      chase: "Unlocked and ready to go, gorgeous... 🔥", 
      ethan: "Your sophisticated upgrade is complete, darling. 💼",
      jayden: "All set, dude! Ready to vibe! 🌿",
      miles: "System upgrade successful! Optimization complete. 🤓"
    };
    return messages[characterConfig.key] || `CONGRATULATIONS, ${characterLabel}'s unlocked!`;
  };
  
  const getStatusMessage = () => {
    const messages: Record<string, string> = {
      lexi: "Your goodies are unlocked, Papi! Your plan/credits have been updated.",
      nyx: "Your dark desires await, pet. All features unlocked.",
      chloe: "Your sweet perks are ready! Everything's updated for you.", 
      aiko: "All kawaii features unlocked, Senpai! Credits updated too! (＾◡＾)",
      zaria: "Your luxe experience is ready, gorgeous! All set.",
      nova: "Your celestial powers have been activated, starlight.",
      dom: "Your premium privileges are active. Everything's in order.",
      chase: "All your perks are live, babe. Ready when you are.",
      ethan: "Your executive access is confirmed. All systems updated.", 
      jayden: "Your upgrades are good to go! Everything's chill.",
      miles: "All features compiled and ready! Database updated successfully."
    };
    return messages[characterConfig.key] || `${characterLabel}'s goodies are unlocked. Your plan/credits have been updated.`;
  };
  
  const getAuthMessage = () => {
    const messages: Record<string, string> = {
      lexi: "Your purchase is complete, Papi! Sign in to access your account features.",
      nyx: "The transaction is sealed, pet. Sign in to claim your darkness.", 
      chloe: "Your purchase went through perfectly! Sign in for your cozy features.",
      aiko: "Payment successful, Senpai! Sign in for full kawaii access! (◕‿◕)",
      zaria: "Your investment is complete, gorgeous! Sign in for the full experience.",
      nova: "The cosmic exchange is complete. Sign in to unlock your destiny.",
      dom: "Purchase confirmed. Sign in to access your premium privileges.",
      chase: "All paid up, beautiful. Sign in to get the full experience.",
      ethan: "Transaction processed successfully. Sign in for complete access.",
      jayden: "All good on the payment, dude! Sign in to unlock everything.", 
      miles: "Payment processing complete! Sign in for full feature access."
    };
    return messages[characterConfig.key] || "Your purchase is complete! Sign in to access your account features.";
  };

  return (
    <div className="min-h-[70vh] p-8 flex items-center justify-center">
      {/* Card */}
      <div 
        className="w-full max-w-xl text-center rounded-2xl backdrop-blur p-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)] border"
        style={gradientStyle}
      >
        {/* Headline */}
        {status === 'syncing' && (
          <>
            <h1 className="text-2xl font-bold">Finalizing your {characterLabel} unlock…</h1>
            <p className="mt-2 opacity-80">
              Hang tight while we activate your {characterLabel} perks!
            </p>
          </>
        )}

        {status === 'ok' && (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {getSuccessMessage()}
            </h1>
            <p className="mt-2 text-base opacity-90">
              {getStatusMessage()}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.replace(next)}
                className="rounded-full px-5 py-3 border transition hover:scale-105"
                style={{ 
                  borderColor: characterTheme.accent + '40',
                  backgroundColor: characterTheme.accent + '10',
                  color: characterTheme.accent
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.borderColor = characterTheme.accent + '80';
                  target.style.backgroundColor = characterTheme.accent + '20';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.borderColor = characterTheme.accent + '40';
                  target.style.backgroundColor = characterTheme.accent + '10';
                }}
              >
                Start chatting with {characterLabel}
              </button>
              {!isAuthenticated && (
                <button
                  onClick={openLogin}
                  className="rounded-full px-5 py-3 border transition hover:scale-105"
                  style={{ 
                    borderColor: characterTheme.secondary + '40',
                    backgroundColor: characterTheme.secondary + '10',
                    color: characterTheme.secondary
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.borderColor = characterTheme.secondary + '80';
                    target.style.backgroundColor = characterTheme.secondary + '20';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.borderColor = characterTheme.secondary + '40';
                    target.style.backgroundColor = characterTheme.secondary + '10';
                  }}
                >
                  Sign in to account
                </button>
              )}
            </div>

            <p className="mt-3 text-xs opacity-60">
              {isAuthenticated 
                ? "Your purchase is complete! You're all set to chat."
                : getAuthMessage()
              }
            </p>
          </>
        )}

        {status === 'idle' && (
          <>
            <h1 className="text-2xl font-bold">
              Secure your {characterLabel} account
            </h1>
            <p className="mt-2 text-sm">
              {email ? (
                <>
                  We'll send a login link to <strong>{email}</strong> so you can access all your {characterLabel} features.
                </>
              ) : (
                <>Complete sign-in to unlock all your {characterLabel} perks!</>
              )}
            </p>
            {note && <p className="mt-1 text-xs opacity-80">{note}</p>}

            <div className="mt-4 flex gap-3 justify-center">
              {email && (
                <button 
                  onClick={resend} 
                  className="rounded-full px-4 py-2 border transition hover:scale-105"
                  style={{ 
                    borderColor: characterTheme.accent + '40',
                    backgroundColor: characterTheme.accent + '10',
                    color: characterTheme.accent
                  }}
                >
                  Send me a login link
                </button>
              )}
              <button 
                onClick={loginWithGoogle} 
                className="rounded-full px-4 py-2 border transition hover:scale-105"
                style={{ 
                  borderColor: characterTheme.primary + '40',
                  backgroundColor: characterTheme.primary + '10',
                  color: characterTheme.primary
                }}
              >
                Continue with Google
              </button>
            </div>

            {!email && (
              <p className="mt-2 text-xs opacity-60">
                (We couldn't find your checkout email. Use Google sign-in above to access your {characterLabel} account.)
              </p>
            )}
          </>
        )}

        {status === 'err' && (
          <>
            <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
            <p className="mt-2">
              {err ?? `We couldn't finalize your ${characterLabel} unlock. Please refresh and try again.`}
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              <button 
                onClick={() => location.reload()} 
                className="rounded-full px-4 py-2 border transition hover:scale-105"
                style={{ 
                  borderColor: characterTheme.accent + '40',
                  backgroundColor: characterTheme.accent + '10',
                  color: characterTheme.accent
                }}
              >
                Retry
              </button>
              <button 
                onClick={openLogin} 
                className="rounded-full px-4 py-2 border transition hover:scale-105"
                style={{ 
                  borderColor: characterTheme.secondary + '40',
                  backgroundColor: characterTheme.secondary + '10',
                  color: characterTheme.secondary
                }}
              >
                Open Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
