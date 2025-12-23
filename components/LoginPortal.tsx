// /components/LoginPortal.tsx
'use client';

import { useEffect, useState } from 'react';
import LoginModal from '@/components/LoginModal';
import { useCharacter } from '@/lib/useCharacter';

export default function LoginPortal() {
  const [open, setOpen] = useState(false);
  const character = useCharacter();

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      try { window.dispatchEvent(new Event('login-modal-ack')); } catch {}
      document.body.dataset.modal = 'open';
      // Prevent background scrolling on mobile
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      window.dispatchEvent(new Event('modal-open'));
    };
    const onClose = () => {
      setOpen(false);
      delete (document.body as any).dataset?.modal;
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      window.dispatchEvent(new Event('modal-close'));
    };
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('open-login', onOpen);
    document.addEventListener('open-login', onOpen);
    window.addEventListener('close-login', onClose);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('open-login', onOpen);
      document.removeEventListener('open-login', onOpen);
      window.removeEventListener('close-login', onClose);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
      style={{ 
        zIndex: 'var(--z-modal-backdrop)',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingTop: 'max(1rem, env(safe-area-inset-top))'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setOpen(false);
          delete (document.body as any).dataset?.modal;
          // Restore scrolling
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          window.dispatchEvent(new Event('modal-close'));
        }
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        aria-hidden="true"
        style={{
          // Ensure backdrop covers safe areas on mobile
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)', 
          paddingRight: 'env(safe-area-inset-right)'
        }}
      />
      
      {/* Modal Container - Mobile Optimized */}
      <div className="relative w-full max-w-md mx-auto" style={{ zIndex: 'var(--z-modal-content)' }}>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all" 
             style={{
               // Ensure modal appears properly above safe areas
               marginTop: 'env(safe-area-inset-top)',
               marginBottom: 'env(safe-area-inset-bottom)'
             }}>
          {/* Close Button */}
          <div className="absolute right-3 top-3 z-10">
            <button
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors touch-manipulation"
              onClick={() => {
                setOpen(false);
                delete (document.body as any).dataset?.modal;
                // Restore scrolling
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                window.dispatchEvent(new Event('modal-close'));
              }}
              aria-label="Close login modal"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="p-6">
            {/* Hidden title for screen readers */}
            <h1 id="login-modal-title" className="sr-only">Login or Sign Up</h1>
            <LoginModal 
              characterName={character.displayName}
              onClose={() => {
                setOpen(false);
                delete (document.body as any).dataset?.modal;
                // Restore scrolling
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                window.dispatchEvent(new Event('modal-close'));
              }} />
          </div>
        </div>
      </div>
    </div>
  );
}
