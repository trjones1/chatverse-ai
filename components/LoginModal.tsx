// /components/LoginModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { trackSignUp } from '@/lib/analytics';
import { customSignUp } from '@/lib/customAuth';
import { useCharacter } from '@/lib/useCharacter';

type Mode = 'login' | 'signup' | 'success';

interface LoginModalProps {
  characterName?: string;
  onClose?: () => void;
}

export default function LoginModal({ characterName = 'Lexi', onClose }: LoginModalProps) {
  const sb = createClient();
  const character = useCharacter();
  const [mode, setMode] = useState<Mode>('signup'); // Default to signup for conversion
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Validation state
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Listen for prefer-signup event from checkout
  useEffect(() => {
    const handlePreferSignup = (event: any) => {
      setMode('signup');
    };
    
    window.addEventListener('prefer-signup', handlePreferSignup);
    return () => window.removeEventListener('prefer-signup', handlePreferSignup);
  }, []);

  // Real-time email validation
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(email));
  }, [email]);

  // Real-time password validation  
  useEffect(() => {
    setPasswordValid(password.length >= 8);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    
    if (!emailValid || !passwordValid) {
      setError('Please enter a valid email and password (8+ characters)');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (mode === 'signup') {
        // Use custom signup with character-specific emails
        const result = await customSignUp({
          email,
          password,
          characterKey: character?.key || 'lexi',
          hostname: window.location.hostname,
          redirectUrl: `${window.location.origin}/auth/callback`
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Signup failed');
        }
        
        trackSignUp('email');
        setMode('success');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.dispatchEvent(new Event('auth:logged-in'));
        onClose?.();
      }
    } catch (e: any) {
      // Auto-login existing users during signup attempt
      if (e.message.includes('User already registered') && mode === 'signup') {
        setLoading(true);
        try {
          // Attempt automatic login with provided credentials
          const { error: loginError } = await sb.auth.signInWithPassword({ email, password });
          if (!loginError) {
            // Success! Auto-logged in
            window.dispatchEvent(new Event('auth:logged-in'));
            onClose?.();
            return;
          } else {
            // Login failed, probably wrong password
            setError('This email is already registered. Please check your password or use "Forgot Password".');
            setMode('login');
          }
        } catch (autoLoginError: any) {
          setError('This email is already registered. Please check your password or use "Forgot Password".');
          setMode('login');
        }
      } else if (e.message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(e.message || `${mode === 'signup' ? 'Signup' : 'Login'} failed`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL!;
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // Track Google signup (we'll track it as signup since this modal defaults to signup mode)
      if (mode === 'signup') {
        trackSignUp('google');
      }
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  // Success screen
  if (mode === 'success') {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Created!</h2>
        <p className="text-gray-600 mb-6">
          Check your email to verify your account and start chatting with premium features.
        </p>
        <button 
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Continue Chatting
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-sm mx-auto">
      {/* Value Proposition Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {mode === 'signup' ? `Join ${characterName}` : 'Welcome Back'}
        </h2>
        {mode === 'signup' && (
          <p className="text-sm text-gray-600 leading-relaxed">
            Save your chats • Unlock voice messages • Premium features
          </p>
        )}
        {mode === 'login' && (
          <p className="text-sm text-gray-600">
            Sign in to access your saved conversations
          </p>
        )}
      </div>

      {/* Google Auth Only */}
      <div className="mb-4">
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 min-h-[48px] touch-manipulation"
          type="button"
          aria-label={`${mode === 'signup' ? 'Sign up' : 'Sign in'} with Google`}
        >
          {loading ? (
            <Spinner />
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>
      </div>



      {/* Email/Password Form - Hidden temporarily */}
      <form onSubmit={handleSubmit} className="space-y-4 hidden">
        <div>
          <label htmlFor="email-input" className="sr-only">
            Email address
          </label>
          <input
            id="email-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-3.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[48px] touch-manipulation ${
              showValidation && !emailValid && email 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300'
            }`}
            required
            autoComplete="email"
            inputMode="email"
          />
          {showValidation && !emailValid && email && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1" role="alert">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Please enter a valid email address
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password-input" className="sr-only">
            {mode === 'signup' ? 'Create password (8+ characters)' : 'Password'}
          </label>
          <input
            id="password-input"
            type="password"
            placeholder={mode === 'signup' ? 'Create password (8+ characters)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-3.5 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[48px] touch-manipulation ${
              showValidation && !passwordValid && password 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300'
            }`}
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {showValidation && !passwordValid && password && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1" role="alert">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Password must be at least 8 characters
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (showValidation && (!emailValid || !passwordValid))}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3.5 px-4 rounded-lg transition-colors disabled:opacity-50 min-h-[48px] touch-manipulation"
          aria-label={mode === 'signup' ? 'Create your account' : 'Sign in to your account'}
        >
          {loading ? <Spinner /> : (mode === 'signup' ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Mode Switcher - Hidden temporarily */}
      <div className="text-center mt-6 hidden">
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
            setShowValidation(false);
            // Reset form state when switching modes
            setEmail('');
            setPassword('');
          }}
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 font-medium text-sm min-h-[44px] px-2 py-2 rounded transition-colors touch-manipulation"
          type="button"
          aria-label={mode === 'signup' 
            ? 'Switch to sign in if you already have an account' 
            : 'Switch to sign up to create a new account'}
        >
          {mode === 'signup' 
            ? 'Already have an account? Sign in' 
            : "Don't have an account? Sign up"}
        </button>
      </div>

      {/* Privacy Note */}
      {mode === 'signup' && (
        <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
          By signing up, you agree to save your conversation history and enable premium features. Your data is secure and private.
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="animate-spin" aria-label="loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 533.5 544.3"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M533.5 278.4c0-17.4-1.6-34-4.7-50.2H272v95.1h147.5c-6.4 34.7-25.9 64.1-55.2 83.8l89.2 69.3c52.1-48 80-118.9 80-197.9z"
        fill="#4285f4"
      />
      <path
        d="M272 544.3c72.6 0 133.6-24 178.1-65.1l-89.2-69.3c-24.7 16.6-56.3 26.3-88.9 26.3-68.3 0-126.2-46.1-146.9-108.1l-92.9 71.6c42.6 84.1 129.5 144.6 239.8 144.6z"
        fill="#34a853"
      />
      <path
        d="M125.1 327.8c-9.6-28.6-9.6-59.4 0-88l-92.9-71.6c-39.5 78.6-39.5 172.7 0 251.2l92.9-71.6z"
        fill="#fbbc04"
      />
      <path
        d="M272 107.7c37.6-.6 73.9 13.7 101.7 39.7l75.9-75.9C394.2 24.2 334.3 0 272 0 161.7 0 74 60.5 31.1 144.2l92.9 71.6C145.8 153.8 203.7 107.7 272 107.7z"
        fill="#ea4335"
      />
    </svg>
  );
}

