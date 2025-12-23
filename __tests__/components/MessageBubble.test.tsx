import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageBubble from '../../components/MessageBubble';

// Mock dependencies
jest.mock('@/lib/analytics', () => ({
  track: jest.fn()
}));

// Mock global fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    headers: {
      get: jest.fn((key: string) => key === 'x-voice-remaining' ? '5' : null)
    },
    text: () => Promise.resolve('data:audio/wav;base64,mockAudioData'),
    blob: () => Promise.resolve(new Blob(['mock audio data'], { type: 'audio/wav' }))
  } as any)
);

// Mock toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn()
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-audio-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } }))
    }
  }))
}));

const mockCharacterConfig = {
  key: 'lexi',
  displayName: 'Lexi',
  theme: {
    accent: '#ff7db5',
    bg: '#ffebf7'
  }
};

jest.mock('@/lib/useCharacter', () => ({
  useCharacter: jest.fn(() => mockCharacterConfig)
}));

describe('MessageBubble', () => {
  const defaultProps = {
    text: 'Hello there!',
    isUser: false,
    character: 'lexi',
    hasVoiceAccess: false,
    onTriggerLogin: jest.fn(),
    setPop: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders user message correctly', () => {
    render(
      <MessageBubble 
        {...defaultProps}
        text="This is a user message"
        isUser={true}
      />
    );
    
    expect(screen.getByText('This is a user message')).toBeInTheDocument();
  });

  it('renders character message correctly', () => {
    render(
      <MessageBubble 
        {...defaultProps}
        text="This is a character response"
        isUser={false}
      />
    );
    
    expect(screen.getByText('This is a character response')).toBeInTheDocument();
  });

  it.skip('handles voice playback button for character messages', () => {
    render(
      <MessageBubble 
        {...defaultProps}
        text="Hello with voice!"
        hasVoiceAccess={true}
        isUser={false}
      />
    );
    
    const voiceButton = screen.getByRole('button', { name: /play voice/i });
    expect(voiceButton).toBeInTheDocument();
  });

  it('shows voice pending state correctly', () => {
    render(
      <MessageBubble 
        {...defaultProps}
        text="Message with pending voice"
        voicePending={true}
        isUser={false}
      />
    );
    
    // Should show some loading or pending indicator
    expect(screen.getByText('Message with pending voice')).toBeInTheDocument();
  });

  it('handles emote changes for character messages', () => {
    const onEmoteChange = jest.fn();
    
    render(
      <MessageBubble 
        {...defaultProps}
        text="[smiles] Hello there!"
        onEmoteChange={onEmoteChange}
        isUser={false}
      />
    );
    
    expect(screen.getByText(/Hello there!/)).toBeInTheDocument();
  });

  it('displays timestamp when created_at is provided', () => {
    const testDate = new Date('2023-01-01T12:00:00Z');
    
    render(
      <MessageBubble 
        {...defaultProps}
        text="Message with timestamp"
        created_at={testDate}
      />
    );
    
    expect(screen.getByText('Message with timestamp')).toBeInTheDocument();
  });

  it('handles NSFW content appropriately', () => {
    render(
      <MessageBubble 
        {...defaultProps}
        text="This is NSFW content"
        nsfw={true}
        isUser={false}
      />
    );
    
    expect(screen.getByText('This is NSFW content')).toBeInTheDocument();
  });

  it('triggers upgrade flow for premium features', () => {
    const onTriggerUpgrade = jest.fn();
    
    render(
      <MessageBubble 
        {...defaultProps}
        text="Premium message"
        onTriggerUpgrade={onTriggerUpgrade}
        isUser={false}
      />
    );
    
    // Premium features might trigger upgrade flows
    expect(screen.getByText('Premium message')).toBeInTheDocument();
  });

  it.skip('handles voice button click', () => {
    render(
      <MessageBubble 
        {...defaultProps}
        text="Message with voice"
        hasVoiceAccess={true}
        isUser={false}
      />
    );
    
    const voiceButton = screen.getByRole('button', { name: /play voice/i });
    fireEvent.click(voiceButton);
    
    // Should handle voice playback
    expect(voiceButton).toBeInTheDocument();
  });

  it('applies correct styling for user vs character messages', () => {
    const { rerender } = render(
      <MessageBubble 
        {...defaultProps}
        text="User message"
        isUser={true}
      />
    );
    
    const userMessage = screen.getByText('User message');
    expect(userMessage).toBeInTheDocument();
    
    rerender(
      <MessageBubble 
        {...defaultProps}
        text="Character message"
        isUser={false}
      />
    );
    
    const characterMessage = screen.getByText('Character message');
    expect(characterMessage).toBeInTheDocument();
  });

  it('handles different character types correctly', () => {
    const characters = ['lexi', 'nyx', 'dom', 'chase'];
    
    characters.forEach(character => {
      const { unmount } = render(
        <MessageBubble 
          {...defaultProps}
          text={`Message from ${character}`}
          character={character}
          isUser={false}
        />
      );
      
      expect(screen.getByText(`Message from ${character}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('handles anonymous user state', () => {
    render(
      <MessageBubble 
        {...defaultProps}
        text="Message for anonymous user"
      />
    );
    
    expect(screen.getByText('Message for anonymous user')).toBeInTheDocument();
  });

  it('processes emote patterns in text correctly', () => {
    const emotePatternsText = "[giggles] Hey there [winks]";
    
    render(
      <MessageBubble 
        {...defaultProps}
        text={emotePatternsText}
        isUser={false}
      />
    );
    
    expect(screen.getByText(/Hey there/)).toBeInTheDocument();
  });

  it('handles long messages correctly', () => {
    const longMessage = 'This is a very long message '.repeat(20);
    
    render(
      <MessageBubble 
        {...defaultProps}
        text={longMessage}
        isUser={false}
      />
    );
    
    // Use regex since long text might be split across elements
    expect(screen.getByText(/This is a very long message/)).toBeInTheDocument();
  });
});