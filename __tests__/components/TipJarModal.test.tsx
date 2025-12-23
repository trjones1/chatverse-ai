import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TipJarModal from '../../components/TipJarModal';

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    confirmCardPayment: jest.fn(() => Promise.resolve({ error: null }))
  }))
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="card-element">Mock Card Element</div>,
  useStripe: () => ({
    confirmCardPayment: jest.fn(() => Promise.resolve({ error: null }))
  }),
  useElements: () => ({
    getElement: jest.fn(() => ({ /* mock card element */ }))
  })
}));

// Mock fetch
global.fetch = jest.fn();

// Mock character hook to return predictable data
jest.mock('@/lib/useCharacter', () => ({
  useCharacter: jest.fn(() => ({
    key: 'lexi',
    displayName: 'Lexi',
    theme: { accent: '#ff7db5' }
  }))
}));

describe('TipJarModal', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders correctly when open', () => {
    render(
      <TipJarModal isOpen={true} onClose={() => {}} />
    );
    
    expect(screen.getByText(/💖 Tip Lexi/)).toBeInTheDocument();
    expect(screen.getByText('Tip Amount')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TipJarModal isOpen={false} onClose={() => {}} />
    );
    
    expect(screen.queryByText('💖 Tip Jar')).not.toBeInTheDocument();
  });

  it('shows character name in title and description', () => {
    render(
      <TipJarModal isOpen={true} onClose={() => {}} />
    );
    
    expect(screen.getByText(/💖 Tip Lexi/)).toBeInTheDocument();
    expect(screen.getByText(/Show your appreciation for Lexi/)).toBeInTheDocument();
  });

  it('has correct tip amount options', () => {
    render(
      <TipJarModal isOpen={true} onClose={() => {}} />
    );
    
    expect(screen.getByText('$5')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });

  it('allows custom tip amount', () => {
    render(
      <TipJarModal isOpen={true} onClose={() => {}} />
    );
    
    const customInput = screen.getByDisplayValue('5'); // Default amount is 5
    fireEvent.change(customInput, { target: { value: '15' } });
    
    expect(customInput).toHaveValue(15);
  });

  it('calls onClose when close button is clicked', () => {
    const mockClose = jest.fn();
    render(
      <TipJarModal isOpen={true} onClose={mockClose} />
    );
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('allows message input with character limit', () => {
    render(
      <TipJarModal isOpen={true} onClose={() => {}} />
    );
    
    const messageInput = screen.getByPlaceholderText(/Send a sweet message to Lexi/);
    fireEvent.change(messageInput, { target: { value: 'Great work!' } });
    
    expect(messageInput).toHaveValue('Great work!');
    expect(screen.getByText('11/500 characters')).toBeInTheDocument(); // Character limit is 500
  });

  it('has correct submit button text', () => {
    render(
      <TipJarModal isOpen={true} onClose={() => {}} />
    );
    
    expect(screen.getByText('Send $5 Tip 💖')).toBeInTheDocument(); // Default is $5
  });

  it('updates submit button text when custom amount is entered', () => {
    render(
      <TipJarModal isOpen={true} onClose={() => {}} />
    );
    
    const customInput = screen.getByDisplayValue('5');
    fireEvent.change(customInput, { target: { value: '15' } });
    
    expect(screen.getByText('Send $15 Tip 💖')).toBeInTheDocument();
  });
});