'use client';

import { createClient } from '@/utils/supabase/client';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

// Simple server-compatible auth context
interface ServerAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const ServerAuthContext = createContext<ServerAuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useServerAuth = () => {
  const context = useContext(ServerAuthContext);
  if (!context) {
    throw new Error('useServerAuth must be used within ServerAuthProvider');
  }
  return context;
};

interface ServerAuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
  initialSession?: Session | null;
}

export default function ServerAuthProvider({ 
  children, 
  initialUser = null, 
  initialSession = null 
}: ServerAuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [loading, setLoading] = useState(!initialUser);
  const supabase = createClient();

  useEffect(() => {
    if (!initialUser) {
      // Get auth state on client-side
      const getAuthState = async () => {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!error) {
            setUser(user);
            setSession(session);
          }
        } catch (error) {
          console.error('Auth state error:', error);
        } finally {
          setLoading(false);
        }
      };

      getAuthState();
    } else {
      setLoading(false);
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, initialUser]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const authValue = {
    user,
    session,
    loading,
    signOut
  };

  return (
    <ServerAuthContext.Provider value={authValue}>
      {children}
    </ServerAuthContext.Provider>
  );
}