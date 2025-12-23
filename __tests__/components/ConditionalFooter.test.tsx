import { render, screen } from '@testing-library/react';
import ConditionalFooter from '@/components/ConditionalFooter';
import { usePathname } from 'next/navigation';

// Mock the usePathname hook
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock the footer components
jest.mock('@/components/NavBar', () => ({
  SiteFooter: () => <div data-testid="site-footer">Site Footer</div>,
}));

jest.mock('@/components/FooterLegal', () => {
  return function FooterLegal() {
    return <div data-testid="footer-legal">Legal Footer</div>;
  };
});

describe('ConditionalFooter', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both footers on non-chat pages', () => {
    mockUsePathname.mockReturnValue('/');
    
    render(<ConditionalFooter />);
    
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(screen.getByTestId('footer-legal')).toBeInTheDocument();
  });

  it('renders both footers on dashboard page', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    
    render(<ConditionalFooter />);
    
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(screen.getByTestId('footer-legal')).toBeInTheDocument();
  });

  it('hides footers on chat page', () => {
    mockUsePathname.mockReturnValue('/chat');
    
    render(<ConditionalFooter />);
    
    expect(screen.queryByTestId('site-footer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('footer-legal')).not.toBeInTheDocument();
  });

  it('renders both footers on dashboard page', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    
    render(<ConditionalFooter />);
    
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(screen.getByTestId('footer-legal')).toBeInTheDocument();
  });
});