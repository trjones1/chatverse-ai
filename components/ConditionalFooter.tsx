'use client';

import { usePathname } from 'next/navigation';
import { SiteFooter } from '@/components/NavBar';
import FooterLegal from '@/components/FooterLegal';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footers on chat page
  if (pathname === '/chat') {
    return null;
  }

  return (
    <>
      <SiteFooter />
      <FooterLegal />
    </>
  );
}