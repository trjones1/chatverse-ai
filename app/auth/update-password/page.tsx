'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
const sb = createClient();
export const dynamic = 'force-dynamic';

export default function UpdatePasswordPage() {
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string>('');
  const [ok, setOk] = useState(false);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Try to harvest tokens from URL hash
    (async () => {
      try {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.slice(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await sb.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          }
        } else {
          // Fallback: preserve checkout email if we have it
          const e = window.localStorage.getItem('lastCheckoutEmail') || '';
          setEmail(e);
        }
      } catch (e: any) {
        setMsg(e?.message || 'Could not prepare session.');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function submit() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) {
        setMsg('Auth session missing! Use the button below to resend a secure link on this device.');
        return;
      }
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
      setOk(true);
      setMsg('Password updated! You can now continue.');
      // Optional: redirect to next param
      const sp = new URLSearchParams(window.location.search);
      const next = sp.get('next') || '/chat';
      setTimeout(() => (window.location.href = next), 600);
    } catch (e: any) {
      setOk(false);
      setMsg(e?.message || 'Failed to update password.');
    }
  }

  async function resendSecureLink() {
    try {
      const target = email || prompt('Enter your account email to resend the link:') || '';
      if (!target) return;
      const sp = new URLSearchParams(window.location.search);
      const next = sp.get('next') || '/chat';
      const redirectTo = `${location.origin}/auth/update-password?next=${encodeURIComponent(next)}`;

      const { error } = await sb.auth.resetPasswordForEmail(target, { redirectTo });
      if (error) throw error;
      setMsg('Resent! Open the new email on this device to continue.');
    } catch (e: any) {
      setMsg(e?.message || 'Resend failed.');
    }
  }

  if (!ready) return <div className="p-6">Preparing…</div>;

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <input
        type="password"
        placeholder="New password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className="w-full rounded border px-3 py-2 bg-yellow-50"
      />
      <button onClick={submit} disabled={!pw} className="rounded border px-3 py-2">
        Save password
      </button>

      {msg && <p className={`text-sm ${ok ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

      {/* Recovery if tokens are missing */}
      {!ok && (
        <div className="text-xs opacity-80 space-y-2">
          <p>If you landed here without a green success message, your email app likely removed the secure token.</p>
          <button onClick={resendSecureLink} className="rounded border px-3 py-2">
            Resend secure link
          </button>
        </div>
      )}
    </div>
  );
}
