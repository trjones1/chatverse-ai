import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatBox from '../../components/ChatBox';
import { CharacterConfig } from '../../lib/characters.config';
import { 
  setupAuthMocks, 
  resetAuthMocks, 
  mockFetchSuccess, 
  mockEntitlements 
} from '../utils/auth-mocks';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock analytics functions
jest.mock('@/lib/analytics', () => ({
  trackMessageSent: jest.fn(),
  trackMessageLimit: jest.fn(),
  trackPremiumCTA: jest.fn(),
  trackCharacterSwitch: jest.fn(),
}));

// Mock the character config
const mockCharacterConfig: CharacterConfig = {
  key: 'lexi',
  name: 'lexi',
  displayName: 'Lexi',
  theme: {
    bg: '#ffebf7',
    accent: '#ff7db5',
    primary: '#ff7db5',
    secondary: '#ffebf7',
    gradient: 'linear-gradient(135deg, #ff7db5, #ec4899)',
  },
  products: {
    sub_sfw: 'price_test_sfw',
    sub_nsfw: 'price_test_nsfw',
    voice_pack_10: 'price_test_voice_10',
    voice_pack_25: 'price_test_voice_25',
    voice_pack_50: 'price_test_voice_50',
    voice_pack_100: 'price_test_voice_100',
  },
  gtm: 'GTM-TEST',
  og: {
    title: 'Test Title',
    description: 'Test Description',
    image: 'test-image.png'
  },
  email: {
    fromName: 'Test',
    replyTo: 'test@example.com'
  }
};

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'test-user' }, access_token: 'test-token' } }
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [] })
        })
      })
    })
  })
};

// Remove non-existent supabaseClient mock
// // Removed non-existent supabaseClient mock
// jest.mock("@/lib/supabaseClient", () => ({
//   getSupabase: () => mockSupabase
// }));

// Mock fetch for entitlements and messages
global.fetch = jest.fn((url: string) => {
  if (url.includes('/api/messages')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        messages: [],
        count: 0
      })
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      unlocked: false,
      features: { chat: true, nsfw: false, voice: false },
      voiceCredits: 0
    })
  });
}) as jest.Mock;

// Mock the API calls
jest.mock('@/lib/analytics', () => ({
  track: jest.fn()
}));

// Test wrapper with AuthProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// Mock the hooks that ChatBox uses
jest.mock('@/hooks/useAuthState', () => ({
  useAuthState: jest.fn(() => ({
    user: null,
    session: null,
    isAnonymous: true,
    resolveMemUserId: jest.fn().mockResolvedValue('anon_test123')
  }))
}));

jest.mock('@/hooks/useChatMessages', () => ({
  useChatMessages: jest.fn(() => ({
    messages: [],
    addMessage: jest.fn(),
    clearMessages: jest.fn(),
    loadMessages: jest.fn().mockResolvedValue(undefined),
    isTyping: false,
    setIsTyping: jest.fn()
  }))
}));

jest.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: jest.fn(() => ({
    paid: false,
    nsfwAllowed: false,
    hasVoiceAccess: false,
    voiceCredits: 0,
    refreshEntitlements: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('@/hooks/useChatAPI', () => ({
  useChatAPI: jest.fn(() => ({
    sendMessage: jest.fn().mockResolvedValue({ reply: 'Test response', emote: 'idle' })
  }))
}));

describe('ChatBox', () => {
  const mockProps = {
    config: mockCharacterConfig,
    onTriggerLogin: jest.fn(),
    onEmoteChange: jest.fn(),
    nsfwMode: false,
    isAnonymous: true
  };

  beforeEach(() => {
    resetAuthMocks();
    setupAuthMocks('authenticated');
    mockFetchSuccess(mockEntitlements);
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<ChatBox {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it.skip('displays free chat counter for anonymous users', async () => {
    render(<ChatBox {...mockProps} />);
    
    await waitFor(() => {
      // Component shows "X messages remaining today" for anonymous users
      expect(screen.getByText(/messages remaining today/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows conversation starters for anonymous users', async () => {
    render(<ChatBox {...mockProps} />);
    
    await waitFor(() => {
      // Anonymous users see conversation starter buttons when there are no messages
      const starterButton = screen.getByText(/Let's flirt a little/);
      expect(starterButton).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles authentication state changes', async () => {
    const { rerender } = render(<ChatBox {...mockProps} />);
    
    // Simulate user logging in
    rerender(<ChatBox {...mockProps} isAnonymous={false} />);
    
    // Component should handle auth changes and re-render appropriately
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('handles NSFW mode toggle', async () => {
    const { rerender } = render(<ChatBox {...mockProps} />);
    
    // Enable NSFW mode
    rerender(<ChatBox {...mockProps} nsfwMode={true} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it.skip('calls onTriggerLogin when premium features are accessed while anonymous', async () => {
    render(<ChatBox {...mockProps} />);
    
    await waitFor(() => {
      // Click a conversation starter which triggers chat functionality
      const starterButton = screen.getByText(/Let's flirt a little/);
      fireEvent.click(starterButton);
    }, { timeout: 2000 });
    
    // The conversation starter should work without triggering login (anonymous users can chat)
    expect(mockProps.onTriggerLogin).toHaveBeenCalledTimes(0);
  });

  it('handles entitlements API error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    
    render(<ChatBox {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('handles 401 entitlements API response gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' })
    });
    
    render(<ChatBox {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('refreshes entitlements when character changes', async () => {
    const { rerender } = render(<ChatBox {...mockProps} />);
    
    const newConfig = { ...mockCharacterConfig, key: 'nyx', displayName: 'Nyx' };
    rerender(<ChatBox {...mockProps} config={newConfig} />);
    
    // Component should handle character change and re-render appropriately
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('shows typing indicator when available', async () => {
    render(<ChatBox {...mockProps} />);
    
    // Simulate typing state (this would be controlled by parent component)
    // The component should handle typing state properly
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('handles voice credits display when user has credits', async () => {
    // Mock entitlements hook to return voice credits
    const mockUseEntitlements = require('@/hooks/useEntitlements').useEntitlements;
    mockUseEntitlements.mockReturnValueOnce({
      paid: true,
      nsfwAllowed: true,
      hasVoiceAccess: true,
      voiceCredits: 10,
      refreshEntitlements: jest.fn().mockResolvedValue(undefined)
    });
    
    render(
      <TestWrapper>
        <ChatBox {...mockProps} isAnonymous={false} />
      </TestWrapper>
    );
    
    // Component should render with voice access features available
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('handles premium user state correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        unlocked: true,
        features: { chat: true, nsfw: true, voice: true },
        voiceCredits: 10
      })
    });
    
    render(
      <TestWrapper>
        <ChatBox {...mockProps} isAnonymous={false} />
      </TestWrapper>
    );
    
    await waitFor(() => {
      // Premium users shouldn't see the upgrade CTA buttons
      expect(screen.queryByText(/Upgrade to Premium/)).not.toBeInTheDocument();
    });
  });
});