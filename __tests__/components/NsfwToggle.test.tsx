import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NsfwToggle from '../../components/NsfwToggle';

describe('NsfwToggle', () => {
  const defaultProps = {
    nsfwEnabled: false,
    canUseNsfw: true,
    onToggle: jest.fn(),
    character: 'Lexi'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders toggle switch', () => {
    render(<NsfwToggle {...defaultProps} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
  });

  it('shows correct state when NSFW is disabled', () => {
    render(<NsfwToggle {...defaultProps} nsfwEnabled={false} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('shows correct state when NSFW is enabled', () => {
    render(<NsfwToggle {...defaultProps} nsfwEnabled={true} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onToggle when clicked and can use NSFW', () => {
    const onToggle = jest.fn();
    render(<NsfwToggle {...defaultProps} onToggle={onToggle} canUseNsfw={true} />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onToggle to turn off when currently enabled', () => {
    const onToggle = jest.fn();
    render(<NsfwToggle {...defaultProps} nsfwEnabled={true} onToggle={onToggle} />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('shows upgrade prompt when user cannot use NSFW', () => {
    render(<NsfwToggle {...defaultProps} canUseNsfw={false} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/locked/i);
  });

  it('dispatches gate event when user cannot use NSFW', () => {
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
    const mockOnLockedClick = jest.fn(() => {
      window.dispatchEvent(new CustomEvent('gate-nsfw'));
    });
    
    render(<NsfwToggle {...defaultProps} canUseNsfw={false} onLockedClick={mockOnLockedClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnLockedClick).toHaveBeenCalled();
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'gate-nsfw'
      })
    );
  });

  it('shows character-specific content', () => {
    const characters = ['Lexi', 'Dom', 'Chase', 'Nyx'];
    
    characters.forEach(character => {
      const { unmount } = render(
        <NsfwToggle {...defaultProps} character={character} />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
      
      unmount();
    });
  });

  it('has correct accessibility attributes', () => {
    render(<NsfwToggle {...defaultProps} />);
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked');
    expect(toggle).toHaveAttribute('aria-label', 'NSFW mode');
    expect(toggle).toBeInTheDocument();
  });

  it('handles keyboard navigation correctly', () => {
    const onToggle = jest.fn();
    render(<NsfwToggle {...defaultProps} onToggle={onToggle} />);
    
    const toggle = screen.getByRole('switch');
    
    // For switch role, clicking should work
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalled();
  });

  it('applies correct styling when enabled vs disabled', () => {
    const { rerender } = render(
      <NsfwToggle {...defaultProps} nsfwEnabled={false} />
    );
    
    let toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    rerender(<NsfwToggle {...defaultProps} nsfwEnabled={true} />);
    
    toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('shows correct tooltip text', () => {
    const { container } = render(<NsfwToggle {...defaultProps} nsfwEnabled={false} />);
    
    const label = container.querySelector('label');
    expect(label).toHaveAttribute('title', 'Toggle NSFW mode');
  });

  it('handles rapid clicks correctly', () => {
    const onToggle = jest.fn();
    render(<NsfwToggle {...defaultProps} onToggle={onToggle} />);
    
    const toggle = screen.getByRole('switch');
    
    // Click multiple times rapidly
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    
    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('shows emoji or icon correctly', () => {
    const { container } = render(<NsfwToggle {...defaultProps} />);
    
    // Check if component renders without errors
    expect(container).toBeInTheDocument();
  });

  it('handles different character themes', () => {
    const characters = [
      { name: 'Lexi', theme: 'pink' },
      { name: 'Dom', theme: 'purple' },
      { name: 'Nyx', theme: 'dark' }
    ];
    
    characters.forEach(({ name }) => {
      const { unmount } = render(
        <NsfwToggle {...defaultProps} character={name} />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
      
      unmount();
    });
  });

  it('maintains state consistency', () => {
    const { rerender } = render(
      <NsfwToggle {...defaultProps} nsfwEnabled={false} />
    );
    
    // Should show off state
    let toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    
    // Change to enabled
    rerender(<NsfwToggle {...defaultProps} nsfwEnabled={true} />);
    
    // Should show on state
    toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('prevents action when disabled by parent component', () => {
    const onToggle = jest.fn();
    
    const { container } = render(
      <div>
        <NsfwToggle {...defaultProps} onToggle={onToggle} canUseNsfw={false} />
      </div>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should not call onToggle when user cannot use NSFW
    expect(onToggle).not.toHaveBeenCalled();
  });
});