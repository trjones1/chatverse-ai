// app/layout.tsx
import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import NavBar from '@/components/NavBar';
import GTM from '@/components/GTM';
import GtmPageView from '@/components/GtmPageView';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import AnalyticsDebugger from '@/components/AnalyticsDebugger';
import ActivityTracker from '@/components/ActivityTracker';
import { Suspense } from 'react';
import LoginPortal from '@/components/LoginPortal';
import ConditionalFooter from "@/components/ConditionalFooter";
import CookieBanner from "@/components/CookieBanner";
import NsfwGateModal from "@/components/NsfwGateModal";
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocalizationProvider } from '@/contexts/LocalizationContext';
import { getCharacterConfig } from '@/lib/characters.config';
import { headers } from 'next/headers';
import ErrorBoundary from '@/components/ErrorBoundary';
import SentryUserProvider from '@/components/SentryUserProvider';
import { SentryTrackingProvider } from '@/components/SentryUserProvider';
import CharacterThemeProvider from '@/components/CharacterThemeProvider';
import { Analytics } from "@vercel/analytics/next"
import MetaPixelScript from '@/components/MetaPixelScript'

const inter = Inter({ subsets: ['latin'] });

// Character emoji mapping for favicons
const characterEmojis: Record<string, string> = {
  chatverse: '🌟',
  lexi: '💋',
  nyx: '🕷️',
  chloe: '📚',
  aiko: '🍡',
  zaria: '🌺',
  nova: '✨',
  dom: '⚡',
  chase: '🔥',
  ethan: '💼',
  jayden: '🌿',
  miles: '🤓',
};

// Generate SVG emoji favicon data URI
function generateEmojiSvgFavicon(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="24" font-family="system-ui, -apple-system">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Dynamic metadata generation based on domain
export async function generateMetadata() {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost:3000';
  const characterConfig = getCharacterConfig(hostname);

  // Get character emoji for favicon with cache busting
  const emoji = characterEmojis[characterConfig.key] || '✨';
  const faviconDataUri = generateEmojiSvgFavicon(emoji);
  const cacheBust = `?v=${Date.now()}`;

  // AI girlfriend keywords for ChatVerse
  const isChatVerse = hostname.includes('chatverse.ai');
  const keywords = isChatVerse
    ? 'AI girlfriend, virtual girlfriend, AI companion, chatbot girlfriend, AI waifu, virtual relationship, AI dating, digital girlfriend, virtual companion, AI chat, NSFW AI, realistic AI girlfriend, best AI girlfriend app, AI girlfriend free'
    : `${characterConfig.displayName}, AI girlfriend, virtual companion, AI chat, chatbot, AI relationship`;

  const baseMetadata = {
    title: characterConfig.og.title,
    description: characterConfig.og.description,
    keywords,
    icons: {
      icon: [
        { url: `${faviconDataUri}${cacheBust}`, sizes: '32x32', type: 'image/svg+xml' },
        { url: `${faviconDataUri}${cacheBust}`, sizes: '16x16', type: 'image/svg+xml' },
      ],
      apple: characterConfig.og.image, // Use the OG image for apple-touch-icon
      shortcut: `${faviconDataUri}${cacheBust}`,
    },
    openGraph: {
      title: characterConfig.og.title,
      description: characterConfig.og.description,
      images: [characterConfig.og.image],
      type: 'website',
      siteName: isChatVerse ? 'ChatVerse' : characterConfig.displayName,
    },
    twitter: {
      card: 'summary_large_image',
      title: characterConfig.og.title,
      description: characterConfig.og.description,
      images: [characterConfig.og.image],
    },
  };

  // Add additional meta tags for ChatVerse
  if (isChatVerse) {
    return {
      ...baseMetadata,
      other: {
        'robots': 'index, follow',
        'googlebot': 'index, follow',
        'author': 'ChatVerse',
        'classification': 'Entertainment',
        'category': 'AI Companions',
        'coverage': 'Worldwide',
        'distribution': 'Global',
        'rating': 'General',
        'revisit-after': '1 day',
        'language': 'EN',
        'geo.region': 'US',
        'geo.country': 'US',
        'theme-color': '#8b5cf6',
        'msapplication-TileColor': '#8b5cf6',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'black-translucent',
        'mobile-web-app-capable': 'yes',
        // ExoClick site verification
        '6a97888e-site-verification': '5e08ac0dec82c3eb392b7a1811f01734',
      },
      alternates: {
        canonical: `https://${hostname}`,
      },
    };
  }

  // Add ExoClick site verification for all other domains
  return {
    ...baseMetadata,
    other: {
      '6a97888e-site-verification': '5e08ac0dec82c3eb392b7a1811f01734',
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost:3000';
  const isChatVerse = hostname.includes('chatverse.ai');
  const characterConfig = getCharacterConfig(hostname);

  return (
    <html lang="en">
      <head>
        <meta name="6a97888e-site-verification" content="5e08ac0dec82c3eb392b7a1811f01734" />
      </head>
      <body className={`${inter.className} bg-background text-foreground min-h-screen flex flex-col`}>
        <ErrorBoundary>
          <LocalizationProvider>
            <AuthProvider>
              <SentryUserProvider>
                <SentryTrackingProvider>
                <CharacterThemeProvider />
                <GTM />
                <Analytics/>
                <MetaPixelScript character={characterConfig.key} />
                <Suspense fallback={null}>
                  <GtmPageView />
                  <AnalyticsTracker />
                  <ActivityTracker />
                </Suspense>
                <noscript
                  dangerouslySetInnerHTML={{
                    __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID?.replace(/[^a-zA-Z0-9\-_]/g, '') || ''}"
                  height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
                  }}
                />
                {!isChatVerse && (
                  <ErrorBoundary componentName="Navigation">
                    <NavBar />
                    <EmailVerificationBanner />
                  </ErrorBoundary>
                )}
                <main className="flex-1">
                  <ErrorBoundary componentName="MainContent">
                    {children}
                  </ErrorBoundary>
                </main>
                {!isChatVerse && (
                  <ErrorBoundary componentName="Footer">
                    <ConditionalFooter />
                  </ErrorBoundary>
                )}
                <CookieBanner />
                <NsfwGateModal />
                <Toaster />
                {/* Always-mounted client modal portal */}
                <LoginPortal />
                <AnalyticsDebugger />
              </SentryTrackingProvider>
            </SentryUserProvider>
          </AuthProvider>
          </LocalizationProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
