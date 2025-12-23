'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics';
import { useCharacter } from '@/lib/useCharacter';
import { isAdminUser } from '@/lib/admin';


// Function to get primary navigation items based on character config
const getPrimaryNavItems = (characterConfig: any) => {
  const baseItems = [
    { href: '/chat', label: 'Chat' },
    { href: '/dashboard', label: 'Dashboard' },
  ];
  
  // Add journal link if character has journal config
  if (characterConfig?.journal) {
    baseItems.push({ 
      href: '/journal', 
      label: `${characterConfig.journal.emoji} ${characterConfig.journal.name}` 
    });
  }
  
  return baseItems;
};

const secondary = [
  { href: '/faq', label: 'FAQ' },
  { href: '/help', label: 'Help' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function SiteFooter() {
  return (
    <footer className="text-xs text-white/60 px-4 md:px-6 py-6 border-t border-white/10">
      <div className="flex flex-wrap gap-4">
        <Link href="/faq" className="hover:text-white">FAQ</Link>
        <Link href="/help" className="hover:text-white">Help</Link>
        <Link href="/privacy" className="hover:text-white">Privacy</Link>
        <Link href="/terms" className="hover:text-white">Terms</Link>
        <Link 
          href="/portal" 
          className="hover:text-white text-purple-300 hover:text-purple-200 transition-colors"
        >
          ✨ Other Realms Await...
        </Link>
      </div>
    </footer>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const character = useCharacter();
  const [isClient, setIsClient] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const loggedIn = !!user;
  const userEmail = user?.email || null;
  const persona = character.key;
  const isAdmin = isAdminUser(user);

  // Ensure client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Enhanced navbar auto-show/hide behavior with smoother responsiveness
  useEffect(() => {
    let ticking = false;
    
    const controlNavbar = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDelta = currentScrollY - lastScrollY;
          
          if (currentScrollY < 10) {
            // Always show navbar at top of page
            setIsVisible(true);
          } else if (scrollDelta > 5 && currentScrollY > 80) {
            // Hide navbar when scrolling down (reduced threshold for better responsiveness)
            setIsVisible(false);
          } else if (scrollDelta < -50) {
            // Show navbar when scrolling up ~50px (more responsive than 100px)
            setIsVisible(true);
          }
          
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar, { passive: true });
      return () => window.removeEventListener('scroll', controlNavbar);
    }
  }, [lastScrollY]);


  const clearAppCookies = () => {
    const names = [
      'scid', 'entitlements', 'unlocked', 'character', 'nsfwMode',
      // add any others you set (e.g., 'portal_return', 'lastCheckoutEmail' is in LS not cookie)
    ];
    const opts = ['path=/', 'SameSite=Lax'];
    const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
    names.forEach(n => {
      document.cookie = `${n}=; expires=${past}; ${opts.join('; ')}`;
      document.cookie = `${n}=; expires=${past}; path=/;`; // extra belt+suspenders
    });
  };
  
  const handleLogout = async () => {
    try {
      await signOut(); // Use auth context signOut
    } finally {
      try { localStorage.removeItem('user_id'); } catch {}
      try { sessionStorage.clear(); } catch {}
      clearAppCookies(); 
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('user-logged-out'));
        document.documentElement.style.filter = 'blur(14px)';
        setTimeout(() => {
          window.location.replace('/?signed_out=1'); // neutral
        }, 60);
      } else {
        router.replace('/');
        router.refresh();
      }
    }
  };

  // ⬇️ Centralized login click with modal + fallback
  const openLogin = () => {
    track('login_open');

    let ack = false;
    const onAck = () => { ack = true; window.removeEventListener('login-modal-ack', onAck); };
    window.addEventListener('login-modal-ack', onAck, { once: true });

    const ev = new Event('open-login');
    window.dispatchEvent(ev);
    document.dispatchEvent(ev);

    setTimeout(() => {
      if (!ack) router.push('/login');
    }, 300);
  };

  // ⛑️ Panic/Hide screen: instantly blur and jump to a neutral page
  const quickHide = () => {
    document.documentElement.style.filter = 'blur(14px)';
    setTimeout(() => {
      window.location.replace('/safe'); // neutral destination
    }, 50);
  };

  useEffect(() => {
    // “H” hotkey to hide quickly
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'h' || e.key === 'H') && (e.metaKey || e.ctrlKey)) {
        quickHide();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const brand = character.displayName;
  
  // Dynamic world name based on character
  const getCharacterWorld = (characterKey: string) => {
    switch (characterKey) {
      case 'lexi': return "Lexi's World";
      case 'nyx': return "The Nyx Lair";
      case 'dom': return "Dom's Domain";
      case 'chase': return "Chase's Zone";
      case 'ethan': return "Ethan's Office";
      case 'jayden': return "Jayden's Chill Zone";
      case 'miles': return "Miles' Lab";
      case 'chloe': return "Chloe's Study";
      case 'aiko': return "Aiko's Realm";
      case 'zaria': return "Zaria's Lounge";
      case 'nova': return "Nova's Cosmos";
      default: return `${character.displayName}'s World`;
    }
  };
  
  const brandTagline = getCharacterWorld(character.key);
  
  // Get dynamic navigation items based on character config
  const primary = getPrimaryNavItems(character);

  return (
    <nav 
      data-testid="main-navigation"
      className={clsx(
        'site-header sticky top-0 transition-transform duration-300 ease-in-out',
        // Only apply character-specific classes after client hydration to prevent mismatch
        isClient && character.key === 'lexi' && 'site-header--lexi',
        isClient && character.key === 'nyx' && 'site-header--nyx', 
        isClient && character.key === 'chase' && 'site-header--chase',
        isClient && !['lexi', 'nyx', 'chase'].includes(character.key) && 'site-header--default',
        // Show/hide based on scroll
        !isVisible && '-translate-y-full'
      )}
      style={{ zIndex: 'var(--z-navbar)' }}
    >
      <div className="mx-auto max-w-5xl px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
        <Link href="/chat" data-testid="brand-link" className="flex items-center gap-2 min-w-0">
          <span className="inline-block h-6 w-6 rounded-full overflow-hidden ring-1 ring-white/40">
            <img
              src={`/avatars/${character.key}.png`}
              alt={brand}
              className="h-full w-full object-cover"
            />
          </span>
          <span className="truncate font-semibold tracking-tight header-title">
            {brandTagline}
          </span>
        </Link>

        {/* Desktop links + auth */}
        <div className="hidden sm:flex items-center gap-5">
          {primary.map(i => (
            <Link
              key={i.href}
              href={i.href}
              data-testid={`nav-${i.label.toLowerCase()}`}
              className={clsx('text-sm header-link', pathname?.startsWith(i.href) && 'header-link--active')}
            >
              {i.label}
            </Link>
          ))}
          {isAdmin && (
            <Link 
              href="/admin" 
              className={clsx('text-sm header-link', pathname?.startsWith('/admin') && 'header-link--active')}
            >
              Admin
            </Link>
          )}

          {/* Logged-in indicator + quick hide */}
          {loggedIn && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-lg border border-white/15 bg-white/10">
                Logged in{userEmail ? `: ${userEmail}` : ''}
              </span>
              <button
                onClick={quickHide}
                title="Quick hide (⌘/Ctrl + H)"
                className="btn-chip btn-dark"
              >
                Hide Screen
              </button>
            </div>
          )}

          {!loggedIn ? (
            <button onClick={openLogin} data-testid="login-button" className="btn-chip btn-dark">
              Log In
            </button>
          ) : (
            <button onClick={handleLogout} data-testid="logout-button" className="btn-chip btn-outline">
              Log Out
            </button>
          )}
        </div>

        {/* Mobile overflow menu */}
        <div className="relative sm:hidden">
          <button
            onClick={() => setOpen(v => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg header-btn"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-xl border border-white/15 bg-white/90 backdrop-blur p-1 shadow-lg dark:shadow-black/30"
            >
              {userEmail && (
                <div className="px-3 py-2 text-xs text-gray-600 border-b border-gray-200 truncate">
                  {userEmail}
                </div>
              )}

              {[...primary, ...secondary].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-sm rounded-lg hover:bg-white/50 text-black"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  href="/admin"
                  className="block px-3 py-2 text-sm rounded-lg hover:bg-white/50 text-black"
                  onClick={() => setOpen(false)}
                >
                  Admin
                </Link>
              )}

              <button
                onClick={() => { setOpen(false); quickHide(); }}
                className="w-full text-left block px-3 py-2 text-sm rounded-lg hover:bg-white/50 text-black"
              >
                Hide Screen
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  if (!loggedIn) openLogin();
                  else handleLogout();
                }}
                className="w-full text-left block px-3 py-2 text-sm rounded-lg hover:bg-white/50 text-black"
              >
                {loggedIn ? 'Log Out' : 'Log In'}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
