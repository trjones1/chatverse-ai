// Import Sentry webpack plugin
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No need for experimental.appDir in Next 15 — App Router is default
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://consentcdn.cookiebot.com https://consent.cookiebot.com https://*.vercel.app https://*.sentry.io https://connect.facebook.net https://*.facebook.com https://*.exoclick.com https://*.realsrv.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.vercel.app",
              "font-src 'self' https://fonts.gstatic.com https://js.stripe.com https://*.vercel.app",
              "img-src 'self' data: blob: https: http://imgsct.cookiebot.com https://*.vercel.app",
              "media-src 'self' data: blob: https: https://*.vercel.app",
              "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://consentcdn.cookiebot.com https://consent.cookiebot.com https://*.vercel.app wss://*.vercel.app https://api.elevenlabs.io https://api.openai.com https://openrouter.ai https://*.sentry.io https://*.facebook.com https://www.facebook.com https://*.exoclick.com https://*.realsrv.com https://*.conversionsapigateway.com https://*.run.app",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://consentcdn.cookiebot.com https://*.vercel.app https://*.exoclick.com https://*.realsrv.com https://*.trackwilltrk.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  
  // Enable source maps for better error tracking in Sentry
  productionBrowserSourceMaps: true,
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "chatverse-ai",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI or when explicitly enabled
  silent: !process.env.CI && !process.env.SENTRY_DEBUG,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Transpile SDK to be compatible with IE11 (increases bundle size)
  transpileClientSDK: false,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
};

// Export the wrapped configuration
module.exports = process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true'
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
