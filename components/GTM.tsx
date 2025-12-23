'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { useCharacter } from '@/lib/useCharacter';

export default function GTM() {
  const character = useCharacter();
  const id = character.gtm || process.env.NEXT_PUBLIC_GTM_ID;
  if (!id) return null;

  // Sanitize GTM ID to prevent XSS - GTM IDs should only contain alphanumeric, hyphens, and underscores
  const sanitizedId = id.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (sanitizedId !== id || !sanitizedId.match(/^GTM-[A-Z0-9]+$/)) {
    console.error('Invalid GTM ID format:', id);
    return null;
  }
  useEffect(() => {
    const onConsent = (e: any) => {
    if (e?.detail?.value === "declined") {
    // e.g., set a flag your analytics code respects
    (window as any)["ga-disable-GA_MEASUREMENT_ID"] = true;
    }
    };
    window.addEventListener("cookie-consent", onConsent);
    return () => window.removeEventListener("cookie-consent", onConsent);
  }, []);


  return (
    <>
      {/* dataLayer bootstrap */}
      <Script id="gtm-dl" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || []; window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });`}
      </Script>

      {/* GTM container */}
      <Script
        id="gtm"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${sanitizedId}');`,
        }}
      />

      {/* (Optional) Consent defaults — update to your policy */}
      <Script id="gtm-consent" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'default_consent',
            ad_storage: 'denied',
            analytics_storage: 'granted',
            functionality_storage: 'granted',
            security_storage: 'granted'
          });`}
      </Script>
    </>
  );
}
