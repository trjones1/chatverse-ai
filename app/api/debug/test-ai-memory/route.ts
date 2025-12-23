// Test endpoint for AI-enhanced memory system
import { NextRequest, NextResponse } from 'next/server';
import { processConversationWithAI } from '@/lib/aiEnhancedMemory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, character, userMessage, aiResponse, conversationHistory } = body;

    if (!userId || !character || !userMessage || !aiResponse) {
      return NextResponse.json({
        error: 'Missing required fields: userId, character, userMessage, aiResponse'
      }, { status: 400 });
    }

    console.log('🧪 Testing AI-enhanced memory system...');

    await processConversationWithAI(
      userId,
      character,
      userMessage,
      aiResponse,
      conversationHistory || []
    );

    return NextResponse.json({
      success: true,
      message: 'AI-enhanced memory processing completed'
    });

  } catch (error) {
    console.error('🧪 Test AI memory error:', error);
    return NextResponse.json({
      error: 'Failed to process AI memory enhancement',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}