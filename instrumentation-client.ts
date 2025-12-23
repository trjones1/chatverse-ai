// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://67ebf487a2542eec19906c55a1760251@o4510075631763456.ingest.us.sentry.io/4510075633074176",

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay - Single instance only
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content, inputs, and sensitive data for privacy
      maskAllText: true,
      maskAllInputs: true,
      // Block media elements for privacy
      blockAllMedia: true,
    }),
  ],

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

  // Custom error filtering
  beforeSend(event) {
    // Filter out known development-only errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.value?.includes('ResizeObserver loop limit exceeded')) {
        return null;
      }
      if (error?.value?.includes('Non-Error promise rejection captured')) {
        return null;
      }
      if (error?.value?.includes('Script error')) {
        return null;
      }
    }

    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
      return null;
    }

    return event;
  },

  // Privacy: Don't capture user IP addresses
  sendDefaultPii: false,

  // Additional configuration for multi-domain setup
  allowUrls: [
    // Production domains for all characters
    /chatwithlexi\.com/,
    /talktonyx\.com/,
    /chatwithchloe\.com/,
    /waifuwithaiko\.com/,
    /chatwithzaria\.com/,
    /chatwithnova\.com/,
    /sirdominic\.com/,
    /fuckboychase\.com/,
    /chatwithethan\.com/,
    /chatwithjayden\.com/,
    /chatwithmiles\.com/,
    // All character domain aliases
    /chatwithdom\.com/,
    /dominicreyes\.com/,
    /obeydom\.com/,
    /dominicdom\.com/,
    /talktodominic\.com/,
    /chatwithchase\.com/,
    /chasehunter\.com/,
    /talktochase\.com/,
    /chasehottie\.com/,
    /hotchase\.com/,
    /ethanbrooks\.com/,
    /bossethan\.com/,
    /ethanbusiness\.com/,
    /talktoehan\.com/,
    /jaydencarter\.com/,
    /jaydenvibes\.com/,
    /chillwithjayden\.com/,
    /jaydensurfer\.com/,
    /milestanaka\.com/,
    /geekwithmiles\.com/,
    /milestech\.com/,
    /nerdwithmiles\.com/,
    /heyitslexi\.com/,
    /lexilove\.com/,
    /sweetlexi\.com/,
    /talktolexi\.com/,
    /nyxafterdark\.com/,
    /nyxatnight\.com/,
    /nyxatnite\.com/,
    /darkwithnyx\.com/,
    /chatnyx\.com/,
    /studywithchloe\.com/,
    /smartchloe\.com/,
    /chloesmart\.com/,
    /chatwithaiko\.com/,
    /aikochan\.com/,
    /sweetaiko\.com/,
    /glowwithzaria\.com/,
    /zariaglow\.com/,
    /brightzaria\.com/,
    /novadark\.com/,
    /darkstar\.com/,
    /novanight\.com/,
    /stargazewithnova\.com/,
    // Development and Vercel URLs
    /localhost/,
    /127\.0\.0\.1/,
    /\.vercel\.app$/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;