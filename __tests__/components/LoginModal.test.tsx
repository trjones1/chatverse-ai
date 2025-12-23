// Mock Supabase client with direct mock definition
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignInWithOAuth = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}));

// Mock analytics to prevent tracking errors
jest.mock('@/lib/analytics', () => ({
  trackSignUp: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginModal from '@/components/LoginModal';

describe('LoginModal', () => {
  const mockOnClose = jest.fn();
  
  // Mock window addEventListener
  const mockAddEventListener = jest.fn();
  const mockRemoveEventListener = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.env for Supabase
    process.env.NEXT_PUBLIC_SITE_URL = 'https://chatwithlexi.com';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    // Setup window mock
    Object.defineProperty(window, 'addEventListener', {
      writable: true,
      value: mockAddEventListener,
    });
    Object.defineProperty(window, 'removeEventListener', {
      writable: true,
      value: mockRemoveEventListener,
    });
    
    // Reset any promises to prevent async state issues
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
    mockSignInWithOAuth.mockResolvedValue({ error: null });
  });

  it('renders signup modal by default with streamlined design', () => {
    render(<LoginModal onClose={mockOnClose} />);
    
    // Should default to signup mode for better conversion
    expect(screen.getByText('Join Lexi')).toBeInTheDocument();
    expect(screen.getByText('Save your chats • Unlock voice calls • Premium features')).toBeInTheDocument();
    
    // Should have Google OAuth button prominently displayed
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    
    // Should have email/password form
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Create password (8+ characters)')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('switches between login and signup modes', () => {
    render(<LoginModal onClose={mockOnClose} />);
    
    // Should start in signup mode, switch to login
    const loginToggle = screen.getByText('Already have an account? Sign in');
    fireEvent.click(loginToggle);
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    
    // Switch back to signup
    const signupToggle = screen.getByText("Don't have an account? Sign up");
    fireEvent.click(signupToggle);
    
    expect(screen.getByText('Join Lexi')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it.skip('handles email/password login', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    
    render(<LoginModal onClose={mockOnClose} />);
    
    // Switch to login mode first
    const loginToggle = screen.getByText('Already have an account? Sign in');
    fireEvent.click(loginToggle);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByText('Sign In');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    }, { timeout: 2000 });
  });

  it.skip('handles email/password signup', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    
    render(<LoginModal onClose={mockOnClose} />);
    
    // Should already be in signup mode by default
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Create password (8+ characters)');
    const createButton = screen.getByText('Create Account');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'https://chatwithlexi.com/auth/callback',
        },
      });
    }, { timeout: 2000 });
  });

  it.skip('shows real-time form validation', () => {
    render(<LoginModal onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Create password (8+ characters)');
    const submitButton = screen.getByText('Create Account');
    
    // Test invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Please enter a valid email and password (8+ characters)')).toBeInTheDocument();
  });

  it.skip('handles Google OAuth', async () => {
    // Mock window.location for OAuth redirect handling
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://chatwithlexi.com',
      },
      writable: true,
    });
    
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    
    render(<LoginModal onClose={mockOnClose} />);
    
    const googleButton = screen.getByText('Continue with Google');
    fireEvent.click(googleButton);
    
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://chatwithlexi.com/auth/callback',
        },
      });
    }, { timeout: 2000 });
  });

  it.skip('displays user-friendly error messages', async () => {
    const errorMessage = 'Invalid login credentials';
    mockSignInWithPassword.mockRejectedValue({ message: errorMessage });
    
    render(<LoginModal onClose={mockOnClose} />);
    
    // Switch to login mode
    const loginToggle = screen.getByText('Already have an account? Sign in');
    fireEvent.click(loginToggle);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByText('Sign In');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password. Please try again.')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it.skip('shows success state after account creation', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    
    render(<LoginModal onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Create password (8+ characters)');
    const createButton = screen.getByText('Create Account');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Account Created!')).toBeInTheDocument();
      expect(screen.getByText('Check your email to verify your account and start chatting with premium features.')).toBeInTheDocument();
      expect(screen.getByText('Continue Chatting')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
  
  it.skip('handles user already exists error gracefully', async () => {
    mockSignUp.mockRejectedValue({ message: 'User already registered' });
    
    render(<LoginModal onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Create password (8+ characters)');
    const createButton = screen.getByText('Create Account');
    
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('This email is already registered. Try logging in instead.')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Wait for mode switch to happen
    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});