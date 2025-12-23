'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getCharacterConfig } from '@/lib/characters.config';

declare global {
  interface Window {
    dataLayer: Array<Record<string, any>>;
  }
}

export default function GtmPageView() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hostname = window.location.hostname;
    const config = getCharacterConfig(hostname);
    const url = pathname + (search?.toString() ? `?${search}` : '');
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_location: url,
      page_path: pathname,
      page_search: search?.toString() || '',
      character: config.key,
      hostname: hostname,
    });
  }, [pathname, search]);

  return null;
}
