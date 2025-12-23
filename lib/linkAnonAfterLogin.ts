// lib/linkAnonAfterLogin.ts
import { createClient } from '@/utils/supabase/client';

export async function linkAnonAfterLogin(character = 'lexi') {
  const supabase = createClient();

  // Get current session info
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  
  if (!uid) {
    console.error('linkAnonAfterLogin: No authenticated user found');
    return;
  }

  // Link anonymous memories to authenticated user
  try {
    const anonUserId = localStorage.getItem('user_id');
    if (anonUserId && anonUserId !== uid) {
      console.log('🔗 Linking anonymous memories to authenticated user', { anonUserId, uid });
      
      // Use admin API to transfer memories from anonymous user to authenticated user
      const response = await fetch('/api/migrate/link-memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          anonUserId,
          authenticatedUserId: uid,
          character
        })
      });

      if (response.ok) {
        console.log('✅ Successfully linked anonymous memories');
      } else {
        console.error('❌ Failed to link memories:', response.status);
      }
    }
  } catch (error) {
    console.error('❌ Error linking memories:', error);
  }

  // Make the server claim anon subs using current session + scid cookie
  await fetch('/api/claim', { method: 'POST', credentials: 'include' });

  // Refresh session (in case you store tier/flags in user metadata later)
  await supabase.auth.getSession();

  // Optional: prime entitlements cache/UI by hitting the endpoint
  try {
    const headers: Record<string, string> = {};
    if (uid) headers['x-user-id'] = uid;
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    console.log("refreshEntitlements:ChatHeader");
    await fetch(`/api/entitlements?character=${character}`, {
      method: 'GET',
      headers,
      credentials: 'include', // <- send scid cookie
    });
  } catch { /* ignore */ }
}
