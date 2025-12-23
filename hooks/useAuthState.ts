// hooks/useAuthState.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

interface AuthState {
  user: any;
  session: any;
  isAnonymous: boolean;
  memUserIdRef: React.MutableRefObject<string | null>;
}

interface UseAuthStateReturn extends AuthState {
  resolveMemUserId: (character?: string) => Promise<string>;
  refreshSession: () => Promise<any>;
}

export function useAuthState(): UseAuthStateReturn {
  const { user, session } = useAuth();
  const supabase = createClient();
  const memUserIdRef = useRef<string | null>(null);
  
  const isAnonymous = !user;

  const resolveMemUserId = async (character: string = 'lexi'): Promise<string> => {
    // Use auth context user if available
    if (user?.id) {
      const uid = user.id;
      
      // DISABLED: Automatic memory transfer
      // (Was causing unwanted API calls to transfer-all-memories)
      /*
      if (memUserIdRef.current && memUserIdRef.current !== uid) {
        // Memory transfer logic disabled for now
      }
      */
      
      memUserIdRef.current = uid;
      return uid;
    }
    
    // Generate or retrieve anonymous user ID
    if (!memUserIdRef.current) {
      const stored = localStorage.getItem('anonUserId');
      if (stored) {
        memUserIdRef.current = stored;
      } else {
        const anon = 'anon-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('anonUserId', anon);
        memUserIdRef.current = anon;
      }
    }
    
    return memUserIdRef.current;
  };

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  return {
    user,
    session,
    isAnonymous,
    memUserIdRef,
    resolveMemUserId,
    refreshSession
  };
}