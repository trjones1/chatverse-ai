'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { linkAnonAfterLogin } from '@/lib/linkAnonAfterLogin';
import { authLog } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Always start with null to prevent hydration mismatches
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log('🔐 AuthContext: Getting initial session...');
      authLog.debug('AuthContext: Getting initial session...');
      
      // Get user session from Supabase

      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('🔐 AuthContext: Initial session result', {
          hasUser: !!user,
          hasSession: !!session,
          userEmail: user?.email,
          accessToken: session?.access_token ? 'present' : 'missing',
          error: error
        });
        
        authLog.debug('AuthContext: Initial session result', {
          hasUser: !!user,
          hasSession: !!session,
          userEmail: user?.email,
          accessToken: session?.access_token ? 'present' : 'missing',
          error: error
        });
        
        if (user) {
          console.log('🔐 AuthContext: User found on init', { email: user.email });
          authLog.info('AuthContext: User found on init', { email: user.email });
          setUser(user);
          setSession(session);
        } else {
          console.log('🔐 AuthContext: No user found on init');
          authLog.debug('AuthContext: No user found on init');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('🔐 AuthContext: Error getting initial session', error);
        authLog.error('AuthContext: Error getting initial session', error);
        setUser(null);
        setSession(null);
      } finally {
        console.log('🔐 AuthContext: Initial session loading complete');
        authLog.debug('AuthContext: Initial session loading complete');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        authLog.debug('AuthContext: Auth state change', {
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          accessToken: session?.access_token ? 'present' : 'missing',
          timestamp: new Date().toISOString()
        });
        
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          authLog.info('AuthContext: User signed out, clearing state');
        } else if (event === 'SIGNED_IN') {
          authLog.info('AuthContext: User signed in', { email: session?.user?.email });
          // No longer transfer anonymous conversations - they are lost on sign in
        } else if (event === 'TOKEN_REFRESHED') {
          authLog.debug('AuthContext: Token refreshed', { email: session?.user?.email });
        }
      }
    );

    authLog.debug('AuthContext: Auth state listener registered');
    return () => {
      authLog.debug('AuthContext: Unsubscribing auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      authLog.error('AuthContext: Error signing out', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};