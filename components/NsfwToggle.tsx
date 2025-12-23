'use client';
import themeColors from '../utils/theme';
import { useState, useEffect, useMemo } from 'react';

type Props = {
  nsfwEnabled: boolean;
  onToggle: (value: boolean) => void;
  character?: string;
  /** when false, the toggle is visually locked and cannot be changed */
  canUseNsfw?: boolean;
  onLockedClick?: () => void; // 👈 new

};

export default function NsfwToggle({
  nsfwEnabled,
  onToggle,
  character,
  canUseNsfw = false,
  onLockedClick,             // 👈 new

}: Props) {
  const [checked, setChecked] = useState(nsfwEnabled);

  const key = useMemo(() => (character ?? 'lexi').toLowerCase(), [character]);
  const theme = themeColors[key] || themeColors.default;

  useEffect(() => {
    setChecked(nsfwEnabled);
  }, [nsfwEnabled]);

  const handleChange = () => {
    if (!canUseNsfw) return; // hard gate
    const newValue = !checked;
    setChecked(newValue);
    onToggle(newValue);
  };

  const title = canUseNsfw ? 'Toggle NSFW mode' : 'NSFW is locked — upgrade to unlock';
  const handleLabelClick: React.MouseEventHandler<HTMLLabelElement> = (e) => {
    if (!canUseNsfw) {
      e.preventDefault();
      e.stopPropagation();
      onLockedClick?.(); // fire CTA
    }
  };
  // keyboard a11y when locked (Enter/Space)
  const handleKeyDown: React.KeyboardEventHandler<HTMLLabelElement> = (e) => {
    if (!canUseNsfw && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onLockedClick?.();
    }
  };
  return (
    <div className="flex flex-col items-center space-y-1">
      {/* Premium label */}
      <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">
        NSFW Mode
      </div>
      
      <label
        className="cursor-pointer relative select-none group"
        aria-disabled={!canUseNsfw}
        title={title}
        onClick={handleLabelClick}
        onKeyDown={handleKeyDown}  
        role={!canUseNsfw ? 'button' : undefined}
        tabIndex={!canUseNsfw ? 0 : -1}
      >
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-label="NSFW mode"
          checked={checked}
          onChange={handleChange}
          className="sr-only"
          disabled={!canUseNsfw}
        />

        {/* Premium horizontal light switch design */}
        <div
          className={`relative w-14 h-7 rounded-lg shadow-lg transition-all duration-300 border-2 ${
            canUseNsfw ? 'opacity-100' : 'opacity-60'
          } ${
            checked 
              ? 'border-pink-400 shadow-pink-200' 
              : 'border-gray-400 shadow-gray-200'
          }`}
          style={{ 
            backgroundColor: checked ? '#ff69b4' : '#6b7280',
            boxShadow: checked 
              ? '0 4px 12px rgba(255, 105, 180, 0.3), inset 0 2px 4px rgba(0,0,0,0.1)' 
              : '0 2px 6px rgba(107, 114, 128, 0.2), inset 0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {/* Switch thumb with emoji */}
          <div
            className={`absolute top-0.5 w-6 h-6 bg-white rounded-md shadow-lg transition-all duration-300 flex items-center justify-center text-sm ${
              checked ? 'translate-x-7 rotate-3' : 'translate-x-0.5 -rotate-3'
            } ${canUseNsfw ? 'group-hover:scale-105' : ''}`}
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transform: `translateX(${checked ? '1.75rem' : '0.125rem'}) ${checked ? 'rotate(3deg)' : 'rotate(-3deg)'}`,
            }}
          >
            {checked ? '💦' : '🍑'}
          </div>

          {/* Background emoji indicators */}
          <div className="absolute inset-0 flex items-center justify-between px-1.5 text-xs opacity-60 pointer-events-none">
            <span className={`transition-opacity duration-200 ${!checked ? 'opacity-100' : 'opacity-0'}`}>
              🍑
            </span>
            <span className={`transition-opacity duration-200 ${checked ? 'opacity-100' : 'opacity-0'}`}>
              💦
            </span>
          </div>

          {/* Lock overlay for non-premium users */}
          {!canUseNsfw && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg backdrop-blur-sm" style={{ pointerEvents: 'none' }}>
              <span className="text-lg drop-shadow-sm">
                🔒
              </span>
            </div>
          )}
          
          {/* Subtle glow effect when active */}
          {checked && canUseNsfw && (
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 rounded-xl opacity-30 blur-sm animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Status text */}
        <div className={`text-center text-[10px] mt-1 font-medium transition-colors duration-200 ${
          checked && canUseNsfw ? 'text-pink-600' : 'text-gray-500'
        }`}>
          {!canUseNsfw ? 'Locked' : checked ? 'ON' : 'OFF'}
        </div>
      </label>
    </div>
  );
}
