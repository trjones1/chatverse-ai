// app/api/test-sentry/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware, createErrorResponse, PaymentError, VoiceError, ChatError } from '@/lib/api-error-handler';
import { trackApiError, trackPaymentError, trackVoiceError, trackChatError } from '@/lib/sentry-utils';
import { getCharacterConfig } from '@/lib/characters.config';

export const dynamic = 'force-dynamic';

// Test route to verify Sentry integration
async function testSentryHandler(request: NextRequest) {
  const url = new URL(request.url);
  const testType = url.searchParams.get('type') || 'general';
  const hostname = request.headers.get('host') || 'localhost:3000';
  const characterConfig = getCharacterConfig(hostname);

  switch (testType) {
    case 'general':
      throw new Error('Test error from Sentry integration');

    case 'payment':
      const paymentError = new PaymentError('Test payment processing failed', 'test_payment', characterConfig.key);
      trackPaymentError(paymentError, {
        operation: 'test_payment',
        characterKey: characterConfig.key,
        productType: 'test_subscription',
        amount: 999,
        currency: 'USD'
      });
      throw paymentError;

    case 'voice':
      const voiceError = new VoiceError('Test voice generation failed', 'test_voice', 'elevenlabs');
      trackVoiceError(voiceError, {
        operation: 'test_voice',
        characterKey: characterConfig.key,
        provider: 'elevenlabs',
        credits: 10
      });
      throw voiceError;

    case 'chat':
      const chatError = new ChatError('Test chat processing failed', 'test_chat', 'gpt-4');
      trackChatError(chatError, {
        operation: 'test_chat',
        characterKey: characterConfig.key,
        messageCount: 5,
        model: 'gpt-4'
      });
      throw chatError;

    case 'api':
      trackApiError(new Error('Test API error'), {
        endpoint: '/api/test-sentry',
        method: 'GET',
        statusCode: 500,
        characterKey: characterConfig.key,
        userTier: 'test'
      });
      throw new Error('Test API error tracking');

    case 'success':
      return NextResponse.json({
        success: true,
        message: 'Sentry integration is working properly',
        character: characterConfig.displayName,
        domain: hostname,
        timestamp: new Date().toISOString()
      });

    default:
      return NextResponse.json({
        error: 'Invalid test type',
        availableTypes: ['general', 'payment', 'voice', 'chat', 'api', 'success']
      }, { status: 400 });
  }
}

// Wrap handler with Sentry middleware
export const GET = apiMiddleware(testSentryHandler);

// Also support POST for testing
export const POST = apiMiddleware(testSentryHandler);