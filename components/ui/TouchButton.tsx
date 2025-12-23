'use client';

import React from 'react';
import { ReactNode, ButtonHTMLAttributes } from 'react';

interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  touchFeedback?: boolean;
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  loadingText?: string;
}

/**
 * TouchButton - Mobile-optimized button component with WCAG 2.1 AA compliance
 * 
 * Features:
 * - 44px minimum touch target for mobile accessibility
 * - Enhanced touch feedback with haptic-like animations
 * - Proper touch handling with -webkit-tap-highlight-color
 * - Safe area inset awareness
 * - Responsive sizing with consistent touch targets
 * - High contrast focus indicators
 */
const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  touchFeedback = true,
  className = '',
  style = {},
  disabled = false,
  loading = false,
  loadingText,
  onClick,
  ...props
}) => {
  // Base styles ensuring WCAG 2.1 AA compliance
  const baseStyles: React.CSSProperties = {
    // WCAG 2.1 AA minimum touch target size
    minHeight: '44px',
    minWidth: '44px',
    
    // Touch optimization
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    
    // Layout
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    
    // Typography
    fontSize: '16px', // Prevents zoom on iOS
    fontWeight: '600',
    lineHeight: '1',
    
    // Visual
    borderRadius: '12px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    
    // Transitions for smooth feedback
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Focus outline for accessibility
    outline: 'none',
    ...style
  };

  // Size variants
  const sizeStyles = {
    sm: {
      minHeight: '44px', // Never go below WCAG minimum
      minWidth: '44px',
      padding: '8px 16px',
      fontSize: '14px',
    },
    md: {
      minHeight: '44px',
      minWidth: '44px', 
      padding: '12px 24px',
      fontSize: '16px',
    },
    lg: {
      minHeight: '48px',
      minWidth: '48px',
      padding: '16px 32px', 
      fontSize: '18px',
    }
  };

  // Color variants
  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, var(--brand-start, #a855f7), var(--brand-end, #ec4899))',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.25)',
    },
    secondary: {
      background: 'var(--elev-bg, #ffffff)',
      color: 'var(--elev-text, #111827)',
      border: '1px solid var(--elev-border, rgba(17, 24, 39, 0.08))',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--brand-start, #a855f7)',
      border: '2px solid var(--brand-start, #a855f7)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--elev-text, #111827)',
    }
  };

  // Disabled or loading styles
  const disabledOrLoadingStyles = (disabled || loading) ? {
    opacity: loading ? 0.7 : 0.5,
    transform: 'none',
    boxShadow: 'none',
    cursor: loading ? 'wait' : 'not-allowed',
  } : {};

  // Focus styles for accessibility
  const focusStyles = `
    &:focus-visible {
      outline: 2px solid var(--brand-start, #a855f7);
      outline-offset: 2px;
    }
  `;

  // Touch feedback styles
  const interactionStyles = !disabled ? {
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: variant === 'primary' ? '0 6px 16px rgba(168, 85, 247, 0.35)' : '0 4px 8px rgba(0, 0, 0, 0.1)',
    },
    '&:active': {
      transform: touchFeedback ? 'translateY(0) scale(0.98)' : 'translateY(0)',
      transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
    }
  } : {};

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    // Add touch feedback ripple effect
    if (touchFeedback) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      
      // Calculate ripple position
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;
      
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);
      
      // Remove ripple after animation
      setTimeout(() => {
        ripple.remove();
      }, 600);
    }
    
    onClick?.(e);
  };

  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...disabledOrLoadingStyles,
  };

  // Loading spinner styles
  const spinnerStyles = {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTopColor: '#ffffff',
    animation: 'spin 1s ease-in-out infinite',
  };

  return (
    <>
      <style>{`
        .touch-button:focus-visible {
          outline: 2px solid var(--brand-start, #a855f7);
          outline-offset: 2px;
        }
        
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Enhanced touch targets for mobile */
        @media (max-width: 768px) {
          .touch-button {
            min-height: 48px !important;
            min-width: 48px !important;
            padding: 14px 28px !important;
          }
          
          .touch-button.touch-button-sm {
            min-height: 44px !important;
            min-width: 44px !important;
            padding: 10px 20px !important;
          }
          
          .touch-button.touch-button-lg {
            min-height: 52px !important;
            min-width: 52px !important;
            padding: 18px 36px !important;
          }
        }
        
        /* Safe area inset support */
        @supports (padding: max(0px)) {
          .touch-button-safe-area {
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
          }
        }
      `}</style>
      <button
        className={`touch-button touch-button-${size} ${className}`}
        style={combinedStyles}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <>
            <span style={spinnerStyles}></span>
            <span>{loadingText || 'Loading...'}</span>
          </>
        ) : (
          children
        )}
      </button>
    </>
  );
};

export default TouchButton;