// app/page.tsx
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ChatVerseLanding from '@/components/ChatVerseLanding';

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = await searchParams;
  const headersList = await headers();
  const hostname = headersList.get('x-hostname') || headersList.get('host') || '';

  // Show ChatVerse landing page for chatverse.ai domain
  if (hostname.includes('chatverse.ai')) {
    return <ChatVerseLanding />;
  }

  // For character-specific domains, redirect to chat
  // Preserve query parameters during redirect
  const queryString = new URLSearchParams();

  // Add all search params to the query string
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => queryString.append(key, v));
      } else {
        queryString.set(key, value);
      }
    }
  });

  const queryStr = queryString.toString();
  const redirectUrl = queryStr ? `/chat?${queryStr}` : '/chat';

  redirect(redirectUrl);
}
