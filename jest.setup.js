import '@testing-library/jest-dom';

// Import auth mocking utilities manually to avoid module resolution issues
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { nsfwMode: false }
};

const mockSession = {
  access_token: 'test-access-token',
  user: mockUser
};

const mockAuthContext = {
  user: mockUser,
  session: mockSession,
  loading: false,
  signOut: jest.fn().mockResolvedValue(undefined)
};

// Mock AuthContext globally
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => mockAuthContext),
  AuthProvider: ({ children }) => children
}));

// Enhanced fetch polyfill for Node.js test environment
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    headers: new Map([
      ['content-type', 'application/json'],
      ['x-voice-remaining', '100']
    ]),
    json: () => Promise.resolve({
      unlocked: true,
      tier: 'premium',
      features: { chat: true, nsfw: true, voice: true },
      canBuyCredits: true,
      dailyChatCount: 5,
      dailyChatLimit: 100,
      dailyLimitReached: false,
      credits: 50,
      voiceCredits: 10
    }),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
);

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Supabase clients (legacy - will be overridden by auth-mocks setup)
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ 
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
  }),
}));

// Mock Supabase SSR (legacy - will be overridden by auth-mocks setup)
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
  })),
  createServerClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
  })),
}));

// Mock our Supabase client with proper auth data
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ 
        data: { session: mockSession },
        error: null
      })),
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: mockUser },
        error: null
      })),
      onAuthStateChange: jest.fn(() => ({ 
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      updateUser: jest.fn(() => Promise.resolve({ error: null }))
    }
  })),
}), { virtual: true });

// Mock auth-server-utils (server-side auth patterns)
jest.mock('@/lib/auth-server-utils', () => ({
  getUserFromServerClient: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: { nsfwMode: false }
  })),
  validateAuthenticatedUser: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com'
  })),
  resolveUserId: jest.fn(() => Promise.resolve({
    userId: 'test-user-id',
    userIdSource: 'authenticated',
    isAuthenticated: true
  })),
  getAuthContext: jest.fn(() => Promise.resolve({
    user: { id: 'test-user-id', email: 'test@example.com' },
    userId: 'test-user-id',
    isAuthenticated: true,
    userIdSource: 'authenticated'
  })),
  isUserAdmin: jest.fn(() => Promise.resolve(false)),
  getAdminClient: jest.fn(),
  AuthErrors: {
    UNAUTHORIZED: { error: 'Authentication required', status: 401 },
    FORBIDDEN: { error: 'Insufficient permissions', status: 403 }
  }
}));

// Mock character hooks
jest.mock('@/lib/useCharacter', () => ({
  useCharacter: jest.fn(() => ({
    key: 'lexi',
    displayName: 'Lexi',
    description: 'Test character',
    primaryColor: '#FF69B4',
    secondaryColor: '#FF1493',
  })),
}), { virtual: true });

// Mock window methods for JSDOM compatibility
Object.defineProperty(window, 'dispatchEvent', {
  value: jest.fn(),
  writable: true
});

// Mock HTMLMediaElement for audio tests
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  value: jest.fn(() => Promise.resolve()),
  writable: true
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  value: jest.fn(),
  writable: true
});
Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  value: jest.fn(),
  writable: true
});

// Mock localStorage globally
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

// Global beforeEach and afterEach hooks
beforeEach(() => {
  // Clear mock call history but preserve mock implementations
  jest.clearAllMocks();
  
  // Re-setup AuthContext mock after clearing
  const { useAuth } = require('@/contexts/AuthContext');
  useAuth.mockReturnValue(mockAuthContext);
});

afterEach(() => {
  // Don't reset all mocks as it breaks our global setup
  // Just clear call counts
  jest.clearAllMocks();
});

// Note: window.location mocking is handled per-test as needed

// Mock environment variables
process.env.NEXT_PUBLIC_SITE_URL = 'https://chatwithlexi.com';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.VOICE_ID_LEXI = 'test-lexi-voice';
process.env.VOICE_ID_NYX = 'test-nyx-voice';
process.env.VOICE_ID_CHLOE = 'test-chloe-voice';
process.env.VOICE_ID_AIKO = 'test-aiko-voice';
process.env.VOICE_ID_ZARIA = 'test-zaria-voice';
process.env.VOICE_ID_NOVA = 'test-nova-voice';
process.env.VOICE_ID_DOM = 'test-dom-voice';
process.env.VOICE_ID_CHASE = 'test-chase-voice';
process.env.VOICE_ID_ETHAN = 'test-ethan-voice';
process.env.VOICE_ID_JAYDEN = 'test-jayden-voice';
process.env.VOICE_ID_MILES = 'test-miles-voice';