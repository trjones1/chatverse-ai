// components/ConfirmEmailBanner.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
export const dynamic = 'force-dynamic';

export default function ConfirmEmailBanner() {
  const sb = createClient();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      const confirmed = !!user.email_confirmed_at; // Supabase exposes this
      setShow(!confirmed);
    })();
  }, []);

  if (!show) return null;
  async function resend() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email) return;
    await sb.auth.resend({ type: 'signup', email: user.email });
  }

  return (
    <div className="w-full bg-yellow-100 border border-yellow-300 text-yellow-900 p-3 rounded-lg flex items-center justify-between">
      <span>⚠️ Confirm your email to secure your account ({email}).</span>
      <div className="flex gap-2">
        <button className="btn" onClick={resend}>Resend link</button>
        <button className="btn" onClick={() => fetch('/api/link-customer', { method: 'POST' })}>Link purchase</button>
      </div>
    </div>
  );
}
