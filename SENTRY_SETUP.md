# Sentry Error Monitoring Setup

This document outlines the comprehensive Sentry error monitoring implementation for the multi-character AI chat platform.

## Overview

The Sentry integration provides:
- Client-side and server-side error tracking
- Character-specific error tagging
- Performance monitoring for critical flows
- Privacy-protected user context tracking
- React error boundaries
- API error tracking middleware
- Voice feature error monitoring
- Payment flow error tracking

## Configuration Files

### Core Configuration
- `sentry.client.config.ts` - Client-side Sentry initialization
- `sentry.server.config.ts` - Server-side Sentry initialization  
- `sentry.edge.config.ts` - Edge runtime Sentry initialization
- `instrumentation.ts` - Next.js instrumentation file

### Components & Utilities
- `components/ErrorBoundary.tsx` - React error boundaries
- `components/SentryUserProvider.tsx` - User context provider
- `lib/sentry-utils.ts` - Utility functions for tracking
- `lib/api-error-handler.ts` - API error handling middleware
- `lib/performance-monitoring.ts` - Performance monitoring utilities

## Environment Variables

Add these to your `.env.local` (and production environment):

```bash
# Required
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Optional (Development)
SENTRY_DEBUG=false
NEXT_PUBLIC_SENTRY_DEBUG=false
```

## Character-Specific Features

### Multi-Domain Support
The setup automatically detects which character domain is being used and tags errors accordingly:

- `chatwithlexi.com` → `character: lexi`
- `talktonyx.com` → `character: nyx`
- `chatwithchloe.com` → `character: chloe`
- And all other character domains...

### Character-Specific Error Context
```typescript
import { setCharacterContext } from '@/lib/sentry-utils';

// Automatically sets character tags based on hostname
setCharacterContext(hostname);
```

## Usage Examples

### API Route Error Tracking
```typescript
import { apiMiddleware, createErrorResponse } from '@/lib/api-error-handler';

export const GET = apiMiddleware(async (request: NextRequest) => {
  try {
    // Your API logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error, {
        endpoint: '/api/your-endpoint',
        method: 'GET',
        characterKey: 'lexi' // or get from request context
      });
    }
    throw error;
  }
});
```

### Performance Monitoring
```typescript
import { monitorChatFlow, monitorVoiceFlow, monitorPaymentFlow } from '@/lib/performance-monitoring';

// Monitor chat operations
const response = await monitorChatFlow('lexi', 'premium', async () => {
  return await generateChatResponse(message);
});

// Monitor voice generation
const audioUrl = await monitorVoiceFlow('lexi', async () => {
  return await generateVoiceResponse(text);
});

// Monitor payment operations
const session = await monitorPaymentFlow('subscription_purchase', 'lexi', 'premium', async () => {
  return await stripe.checkout.sessions.create(sessionConfig);
});
```

### Component Error Boundaries
```typescript
import ErrorBoundary, { ChatErrorBoundary, VoiceErrorBoundary, PaymentErrorBoundary } from '@/components/ErrorBoundary';

// General error boundary
<ErrorBoundary componentName="MyComponent">
  <MyComponent />
</ErrorBoundary>

// Specialized boundaries
<ChatErrorBoundary>
  <ChatInterface />
</ChatErrorBoundary>

<VoiceErrorBoundary>
  <VoiceControls />
</VoiceErrorBoundary>

<PaymentErrorBoundary>
  <SubscriptionForm />
</PaymentErrorBoundary>
```

### User Tracking (Privacy-Safe)
```typescript
import { useSentryTracking } from '@/components/SentryUserProvider';

function MyComponent() {
  const { trackFeatureUsage, trackUserAction } = useSentryTracking();
  
  const handleFeatureClick = () => {
    trackFeatureUsage('voice_generation', { character: 'lexi' });
    // Your feature logic
  };
  
  const handleUpgrade = () => {
    trackPaymentIntent('subscription_upgrade', 'lexi');
    // Navigate to payment
  };
}
```

### Custom Error Tracking
```typescript
import { trackPaymentError, trackVoiceError, trackChatError } from '@/lib/sentry-utils';

// Payment errors
try {
  await processPayment();
} catch (error) {
  trackPaymentError(error, {
    operation: 'subscription_purchase',
    characterKey: 'lexi',
    productType: 'premium',
    amount: 2999,
    currency: 'USD'
  });
}

// Voice errors
try {
  await generateVoice();
} catch (error) {
  trackVoiceError(error, {
    operation: 'voice_generation',
    characterKey: 'lexi',
    provider: 'elevenlabs',
    credits: userCredits
  });
}

// Chat errors
try {
  await generateChatResponse();
} catch (error) {
  trackChatError(error, {
    operation: 'message_generation',
    characterKey: 'lexi',
    messageCount: conversationLength,
    model: 'gpt-4'
  });
}
```

## Testing Sentry Integration

Use the test endpoint to verify everything is working:

```bash
# Test general error tracking
curl "http://localhost:3000/api/test-sentry?type=general"

# Test payment error tracking
curl "http://localhost:3000/api/test-sentry?type=payment"

# Test voice error tracking
curl "http://localhost:3000/api/test-sentry?type=voice"

# Test chat error tracking
curl "http://localhost:3000/api/test-sentry?type=chat"

# Test API error tracking
curl "http://localhost:3000/api/test-sentry?type=api"

# Test success response
curl "http://localhost:3000/api/test-sentry?type=success"
```

## Privacy Protection

The implementation follows strict privacy guidelines:
- No user IDs, emails, or usernames are tracked
- Only anonymous usage patterns are recorded
- Subscription tiers are tracked generically
- Character preferences are anonymized
- All PII is excluded from error reports

## Production Deployment

1. Set up your Sentry project at https://sentry.io
2. Add environment variables to your deployment platform
3. Ensure source maps are uploaded (handled automatically by the webpack plugin)
4. Configure alerting rules in Sentry dashboard
5. Set up performance monitoring thresholds

## Error Filtering

The setup includes intelligent error filtering:
- Development-only errors are excluded in production
- Known browser errors (ResizeObserver, etc.) are filtered out
- Stripe webhook signature errors are handled separately
- Network errors in development are ignored

## Monitoring Best Practices

1. **Character-Specific Dashboards**: Create separate dashboards for each character domain
2. **Performance Alerts**: Set up alerts for slow API responses and high error rates
3. **Critical Flow Monitoring**: Monitor payment, voice, and chat flows closely
4. **User Experience Metrics**: Track Core Web Vitals and user interaction errors
5. **Release Tracking**: Use Sentry releases to track error rates after deployments

## Troubleshooting

### Common Issues

1. **Source maps not uploading**: Check SENTRY_AUTH_TOKEN and org/project settings
2. **Errors not appearing**: Verify NEXT_PUBLIC_SENTRY_DSN is set correctly
3. **Too many errors**: Adjust sample rates in config files
4. **CSP violations**: Ensure Sentry domains are added to Content-Security-Policy

### Debug Mode

Enable debug logging in development:
```bash
SENTRY_DEBUG=true
NEXT_PUBLIC_SENTRY_DEBUG=true
```

This will show Sentry SDK logs in the console and allow errors to be sent from development.