// lib/supabaseServer.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export async function makeServerSupabase(req?: NextRequest) {
  const store = await cookies();
  
  // Get auth token from multiple sources
  const authHeader = req?.headers.get('authorization') || '';
  const bearerToken = authHeader.replace('Bearer ', '');
  
  if (process.env.SUPABASE_DEBUG === 'true') {
    console.log('🔧 makeServerSupabase: Creating server client with auth:', {
      hasAuthHeader: !!authHeader,
      hasBearerToken: !!bearerToken,
      cookieCount: store.getAll().length,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
    });
  }

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { 
          const allCookies = store.getAll();
          if (process.env.SUPABASE_DEBUG === 'true') {
            console.log('🔧 Cookie getAll called, found cookies:', allCookies.length);
          }
          return allCookies;
        },
        setAll(cookiesToSet) {
          if (process.env.SUPABASE_DEBUG === 'true') {
            console.log('🔧 Cookie setAll called with', cookiesToSet.length, 'cookies');
          }
          cookiesToSet.forEach(({ name, value, options }) => {
            // Enhanced cookie options for better persistence
            const cookieOptions = {
              ...options,
              httpOnly: false, // Allow client-side access for auth tokens
              secure: process.env.VERCEL_ENV === 'production' || 
                      (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production') ||
                      process.env.NEXT_PUBLIC_SITE_URL?.includes('https://'),
              sameSite: 'lax' as const,
              path: '/',
              maxAge: options?.maxAge || 60 * 60 * 24 * 7, // 1 week for auth cookies
            };
            try {
              store.set({ name, value, ...cookieOptions });
              if (process.env.SUPABASE_DEBUG === 'true') {
                console.log('🔧 Set cookie:', name, value ? 'with value' : 'empty');
              }
            } catch (error) {
              console.error('🔧 Error setting cookie:', name, error);
            }
          });
        },
      },
      global: bearerToken ? { 
        headers: { 
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        } 
      } : {},
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        debug: process.env.SUPABASE_DEBUG === 'true'
      }
    }
  );

  // Force session refresh if we have a token but no session
  if (bearerToken) {
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (process.env.SUPABASE_DEBUG === 'true') {
        console.log('🔧 Server session check result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          error: error?.message
        });
      }
      
      // If token exists but no session, try to set it directly
      if (!session && !error) {
        if (process.env.SUPABASE_DEBUG === 'true') {
          console.log('🔧 Attempting to set session from bearer token...');
        }
        await client.auth.setSession({
          access_token: bearerToken,
          refresh_token: '' // Will be handled by session refresh
        });
      }
    } catch (sessionError) {
      console.error('🔧 Error checking server session:', sessionError);
    }
  }

  return client;
}
