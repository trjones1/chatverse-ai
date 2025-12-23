// components/ui/PremiumPlusButton.tsx
'use client';

import React from 'react';
import TouchButton from './TouchButton';

interface PremiumPlusButtonProps {
  onClick: () => void;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  showRibbon?: boolean;
  ribbonText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
}

const PremiumPlusButton: React.FC<PremiumPlusButtonProps> = ({
  onClick,
  loading = false,
  loadingText = "Opening checkout...",
  disabled = false,
  className = "",
  style = {},
  children,
  showRibbon = true,
  ribbonText = "PREMIUM+",
  size = "lg",
  variant = "primary"
}) => {
  const defaultStyle = {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
    ...style
  };

  return (
    <div className="relative inline-block">
      {/* Ribbon Badge */}
      {showRibbon && (
        <div className="absolute -top-2 -right-2 z-20">
          {/* Ribbon background with fold effect */}
          <div className="relative">
            {/* Main ribbon */}
            <div 
              className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg transform rotate-12 animate-[gentle-pulse_3s_ease-in-out_infinite]"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
            >
              {ribbonText}
            </div>
            
            {/* Ribbon shine effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 rounded-full transform rotate-12 animate-[shimmer_2s_ease-in-out_infinite]"
              style={{
                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
                animation: 'shimmer 2s ease-in-out infinite'
              }}
            />
          </div>
        </div>
      )}

      {/* Main Button */}
      <TouchButton
        onClick={onClick}
        variant={variant}
        size={size}
        loading={loading}
        loadingText={loadingText}
        disabled={disabled}
        className={`font-semibold rounded transition-all duration-300 hover:shadow-xl hover:scale-105 ${className}`}
        style={{
          ...defaultStyle,
          minWidth: 'fit-content',
          width: '100%', // Ensures consistent width
          whiteSpace: 'nowrap', // Prevents text wrapping
        }}
      >
        {children}
      </TouchButton>
      
      {/* CSS for shimmer and gentle pulse animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(12deg); }
          100% { transform: translateX(100%) rotate(12deg); }
        }
        
        @keyframes gentle-pulse {
          0%, 100% { opacity: 1; transform: rotate(12deg) scale(1); }
          50% { opacity: 0.85; transform: rotate(12deg) scale(1.02); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PremiumPlusButton;