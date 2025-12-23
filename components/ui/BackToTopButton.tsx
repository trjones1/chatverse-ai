'use client';

import { useState, useEffect } from 'react';

interface BackToTopButtonProps {
  threshold?: number; // Show button after scrolling this many pixels
  className?: string;
}

export default function BackToTopButton({ 
  threshold = 300, 
  className = '' 
}: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down
      if (window.pageYOffset > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-20 right-4 z-50
        w-12 h-12 rounded-full
        bg-white/90 backdrop-blur-sm
        border border-gray-200
        shadow-lg hover:shadow-xl
        text-gray-600 hover:text-gray-900
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${className}
      `}
      title="Back to top"
      aria-label="Scroll back to top"
    >
      <svg 
        className="w-6 h-6 mx-auto" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M7 14l5-5 5 5" 
        />
      </svg>
    </button>
  );
}