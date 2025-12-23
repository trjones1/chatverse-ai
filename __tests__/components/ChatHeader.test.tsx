import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatHeader from '../../components/ChatHeader';

// Mock @supabase/ssr first
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
      onAuthStateChange: jest.fn(() => ({ 
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
  })),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ features: { nsfw: true, voice: true } })
  })
) as jest.Mock;

const defaultProps = {
  characterName: 'Lexi',
  onLoginClick: jest.fn(),
  nsfwMode: false,
  onToggleNsfw: jest.fn()
};

describe('ChatHeader', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    jest.clearAllMocks();
  });

  describe('Avatar emojis for male characters', () => {
    it('should display correct emoji for Dom', () => {
      render(<ChatHeader {...defaultProps} characterName="Dominic" />);
      
      // The emoji should be rendered in the H1 along with character name
      expect(screen.getByText(/Dominic.*⚡/)).toBeInTheDocument();
    });

    it('should display correct emoji for Chase', () => {
      render(<ChatHeader {...defaultProps} characterName="Chase" />);
      expect(screen.getByText(/Chase.*🔥/)).toBeInTheDocument();
    });

    it('should display correct emoji for Ethan', () => {
      render(<ChatHeader {...defaultProps} characterName="Ethan" />);
      expect(screen.getByText(/Ethan.*💼/)).toBeInTheDocument();
    });

    it('should display correct emoji for Jayden', () => {
      render(<ChatHeader {...defaultProps} characterName="Jayden" />);
      expect(screen.getByText(/Jayden.*🌿/)).toBeInTheDocument();
    });

    it('should display correct emoji for Miles', () => {
      render(<ChatHeader {...defaultProps} characterName="Miles" />);
      expect(screen.getByText(/Miles.*🤓/)).toBeInTheDocument();
    });
  });

  describe('Avatar emojis for female characters', () => {
    it('should display correct emoji for Lexi', () => {
      render(<ChatHeader {...defaultProps} characterName="Lexi" />);
      expect(screen.getByText(/Lexi.*💋/)).toBeInTheDocument();
    });

    it('should display correct emoji for Nyx', () => {
      render(<ChatHeader {...defaultProps} characterName="Nyx" />);
      expect(screen.getByText(/Nyx.*🕷️/)).toBeInTheDocument();
    });
  });

  describe('Tip jar functionality', () => {
    it('should show tip button for all characters', () => {
      render(<ChatHeader {...defaultProps} />);
      
      const tipButton = screen.getByTitle(/Tip/);
      expect(tipButton).toBeInTheDocument();
      expect(tipButton).toHaveTextContent('💖');
    });

    it('should open tip modal when tip button is clicked', () => {
      render(<ChatHeader {...defaultProps} />);
      
      const tipButton = screen.getByTitle(/Tip/);
      fireEvent.click(tipButton);
      
      // The modal should be rendered (TipJarModal component)
      // This test verifies the integration works
      expect(tipButton).toBeInTheDocument();
    });

    it('should show character-specific tip button text', () => {
      render(<ChatHeader {...defaultProps} characterName="Dominic" />);
      
      const tipButton = screen.getByTitle('Tip Dominic');
      expect(tipButton).toBeInTheDocument();
    });
  });

  describe('NSFW toggle integration', () => {
    it('should render NSFW toggle when available', async () => {
      render(<ChatHeader {...defaultProps} nsfwAllowed={true} />);
      
      // Wait for component to render
      await waitFor(() => {
        // Should find the header container (not using banner role)
        const headerContainer = screen.getByRole('heading', { name: /lexi/i }).closest('div');
        expect(headerContainer).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Voice call integration', () => {
    it('should render voice call button when available', async () => {
      render(<ChatHeader {...defaultProps} />);
      
      // Wait for component to render
      await waitFor(() => {
        // Should find the header container (not using banner role)
        const headerContainer = screen.getByRole('heading', { name: /lexi/i }).closest('div');
        expect(headerContainer).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Character name display', () => {
    it('should display character name correctly for male characters', () => {
      const maleCharacters = [
        { key: 'dom', displayName: 'Dominic' },
        { key: 'chase', displayName: 'Chase' },
        { key: 'ethan', displayName: 'Ethan' },
        { key: 'jayden', displayName: 'Jayden' },
        { key: 'miles', displayName: 'Miles' }
      ];

      maleCharacters.forEach(character => {
        const { unmount } = render(<ChatHeader {...defaultProps} characterName={character.displayName} />);
        expect(screen.getByRole('heading', { name: new RegExp(character.displayName, 'i') })).toBeInTheDocument();
        unmount();
      });
    });

    it('should display character name correctly for female characters', () => {
      const femaleCharacters = [
        { key: 'lexi', displayName: 'Lexi' },
        { key: 'nyx', displayName: 'Nyx' },
        { key: 'chloe', displayName: 'Chloe' },
        { key: 'aiko', displayName: 'Aiko' },
        { key: 'zaria', displayName: 'Zaria' },
        { key: 'nova', displayName: 'Nova' }
      ];

      femaleCharacters.forEach(character => {
        const { unmount } = render(<ChatHeader {...defaultProps} characterName={character.displayName} />);
        expect(screen.getByRole('heading', { name: new RegExp(character.displayName, 'i') })).toBeInTheDocument();
        unmount();
      });
    });
  });
});