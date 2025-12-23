// API route to check crypto subscription status
import { NextRequest, NextResponse } from 'next/server';
import { CryptoSubscriptionService } from '@/lib/cryptoSubscriptionService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const characterKey = searchParams.get('characterKey');

    if (!userId || !characterKey) {
      return NextResponse.json({
        error: 'Missing required parameters: userId, characterKey'
      }, { status: 400 });
    }

    console.log('🔍 Checking crypto subscription status API:', {
      userId: userId.substring(0, 8) + '...',
      character: characterKey
    });

    const status = await CryptoSubscriptionService.checkSubscription(userId, characterKey);

    return NextResponse.json({
      success: true,
      subscription: status
    });

  } catch (error) {
    console.error('❌ Crypto subscription status API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, characterKey } = body;

    if (!userId || !characterKey) {
      return NextResponse.json({
        error: 'Missing required fields: userId, characterKey'
      }, { status: 400 });
    }

    console.log('🔍 Checking crypto subscription status (POST):', {
      userId: userId.substring(0, 8) + '...',
      character: characterKey
    });

    const status = await CryptoSubscriptionService.checkSubscription(userId, characterKey);

    return NextResponse.json({
      success: true,
      subscription: status
    });

  } catch (error) {
    console.error('❌ Crypto subscription status API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}