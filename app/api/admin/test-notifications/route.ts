// app/api/admin/test-notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminNotifications } from '@/lib/adminNotifications';

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();

    if (type === 'signup') {
      // Test signup notification
      const success = await adminNotifications.notifyNewSignup({
        userId: 'test-user-123',
        email: 'test.user@example.com',
        signupMethod: 'google',
        characterKey: 'lexi',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success,
        message: success
          ? 'Signup notification sent successfully!'
          : 'Failed to send signup notification',
      });
    }

    if (type === 'purchase') {
      // Test purchase notification
      const success = await adminNotifications.notifyNewPurchase({
        userId: 'test-user-123',
        userEmail: 'test.user@example.com',
        purchaseType: 'subscription',
        amount: 2500, // 2500 VerseCoins or $25.00
        currency: 'USD',
        productName: 'Premium+ All Access Pass',
        characterKey: 'lexi',
        timestamp: new Date().toISOString(),
        orderId: 'test-order-' + Date.now(),
      });

      return NextResponse.json({
        success,
        message: success
          ? 'Purchase notification sent successfully!'
          : 'Failed to send purchase notification',
      });
    }

    if (type === 'test') {
      // Test general notification
      const success = await adminNotifications.sendTestNotification();

      return NextResponse.json({
        success,
        message: success
          ? 'Test notification sent successfully!'
          : 'Failed to send test notification',
      });
    }

    return NextResponse.json(
      {
        error: 'Invalid type. Use "signup", "purchase", or "test"',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send test notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing from browser
export async function GET() {
  return NextResponse.json({
    message: 'Admin notification test endpoint',
    usage: {
      method: 'POST',
      body: {
        type: '"signup" | "purchase" | "test"',
      },
      examples: {
        signup: 'curl -X POST http://localhost:3000/api/admin/test-notifications -H "Content-Type: application/json" -d \'{"type":"signup"}\'',
        purchase: 'curl -X POST http://localhost:3000/api/admin/test-notifications -H "Content-Type: application/json" -d \'{"type":"purchase"}\'',
        test: 'curl -X POST http://localhost:3000/api/admin/test-notifications -H "Content-Type: application/json" -d \'{"type":"test"}\'',
      },
    },
  });
}
