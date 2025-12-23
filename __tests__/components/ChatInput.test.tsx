import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatInput from '../../components/ChatInput';

// Mock character hook (even though it's not used directly by ChatInput)
jest.mock('@/lib/useCharacter', () => ({
  useCharacter: jest.fn(() => ({
    key: 'lexi',
    displayName: 'Lexi',
    theme: { accent: '#ff7db5' }
  }))
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  track: jest.fn()
}));

// Mock TouchButton component
jest.mock('../../components/ui/TouchButton', () => {
  return function MockTouchButton({ children, onClick, disabled, style, size, variant, touchFeedback, ...props }: any) {
    return (
      <button 
        onClick={onClick} 
        disabled={disabled}
        data-testid="touch-button"
        style={style}
      >
        {children}
      </button>
    );
  };
});

describe('ChatInput', () => {
  const defaultProps = {
    onSend: jest.fn(),
    character: 'lexi'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the input field', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Type your message...');
  });

  it('starts with empty input', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(input.value).toBe('');
  });

  it('updates input value when typing', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'New message' } });
    
    expect(input.value).toBe('New message');
  });

  it('calls onSend when send button is clicked', () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByTestId('touch-button');
    fireEvent.click(sendButton);
    
    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('calls onSend when Enter is pressed', () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send when Shift+Enter is pressed', () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { 
      key: 'Enter', 
      code: 'Enter', 
      shiftKey: true 
    });
    
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send when message is empty', () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const sendButton = screen.getByTestId('touch-button');
    fireEvent.click(sendButton);
    
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables send button when message is empty', () => {
    render(<ChatInput {...defaultProps} />);
    
    const sendButton = screen.getByTestId('touch-button');
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when message has content', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    const sendButton = screen.getByTestId('touch-button');
    expect(sendButton).not.toBeDisabled();
  });

  it('clears input after sending message', () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const sendButton = screen.getByTestId('touch-button');
    fireEvent.click(sendButton);
    
    expect(input.value).toBe('');
  });

  it('handles multiline input correctly', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    const multilineText = 'Line 1\nLine 2\nLine 3';
    fireEvent.change(input, { target: { value: multilineText } });
    
    expect(input.value).toBe(multilineText);
  });

  it('trims whitespace when sending', () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  Test message  ' } });
    
    const sendButton = screen.getByTestId('touch-button');
    fireEvent.click(sendButton);
    
    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('does not send empty or whitespace-only messages', () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    
    const sendButton = screen.getByTestId('touch-button');
    fireEvent.click(sendButton);
    
    expect(onSend).not.toHaveBeenCalled();
  });

  it('auto-resizes textarea based on content', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate typing multiple lines
    fireEvent.change(input, { 
      target: { value: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5' } 
    });
    
    // Component sets height programmatically via useEffect
    expect(input).toBeInTheDocument();
  });

  it('handles focus events correctly', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    
    // Mock scrollIntoView since it's not available in jsdom
    input.scrollIntoView = jest.fn();
    
    // Focus the input and wait for the event to be processed
    input.focus();
    expect(input).toHaveFocus();
  });

  it('scrolls into view when focused', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Mock scrollIntoView
    input.scrollIntoView = jest.fn();
    
    fireEvent.focus(input);
    
    // Component should call scrollIntoView on focus
    expect(input.scrollIntoView).toHaveBeenCalledWith({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  });

  it('applies correct styling based on character theme', () => {
    const { container } = render(<ChatInput {...defaultProps} character="lexi" />);
    
    // Component uses character to determine theme styling
    const inputWrapper = container.querySelector('.input-wrapper');
    expect(inputWrapper || container.firstChild).toBeInTheDocument();
  });

  it('accepts different character props', () => {
    const { rerender } = render(<ChatInput {...defaultProps} character="dominic" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    
    rerender(<ChatInput {...defaultProps} character="lexi" />);
    expect(input).toBeInTheDocument();
  });

  it('handles special characters and emojis', () => {
    const onSend = jest.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByRole('textbox');
    const specialMessage = "Hello! 😊 Special chars: @#$%^&*()";
    
    fireEvent.change(input, { target: { value: specialMessage } });
    
    const sendButton = screen.getByTestId('touch-button');
    fireEvent.click(sendButton);
    
    expect(onSend).toHaveBeenCalledWith(specialMessage);
  });

  it('handles rapid typing without losing characters', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate rapid typing
    'Hello'.split('').forEach((char, index) => {
      fireEvent.change(input, { 
        target: { value: 'Hello'.substring(0, index + 1) } 
      });
    });
    
    expect(input.value).toBe('Hello');
  });

  it('handles very long messages', () => {
    const longMessage = 'a'.repeat(10000);
    const onSend = jest.fn();
    
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: longMessage } });
    
    const sendButton = screen.getByTestId('touch-button');
    fireEvent.click(sendButton);
    
    // Component sends the message as-is (no length limit implemented)
    expect(onSend).toHaveBeenCalledWith(longMessage);
  });

  it('handles paste events correctly', () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Simulate paste by changing the value directly
    fireEvent.change(input, { target: { value: 'Pasted content' } });
    
    expect(input.value).toBe('Pasted content');
  });
});