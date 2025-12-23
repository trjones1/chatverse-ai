import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdmin();

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { userId, character } = body;
  if (!userId || !character) {
    return new NextResponse(JSON.stringify({ error: 'Invalid UserID or charcter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
    
  }

  // 1. Fetch last 10 messages
  const { data: memories, error } = await supabase
    .from('memories')
    .select('message')
    .eq('user_id', userId)
    .eq('character', character)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error || !memories || memories.length === 0) {
    return new NextResponse(JSON.stringify({ error: 'Failed to load memory history' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
    
  }

  const chatHistory = memories.map((m) => m.message);

  // 2. Send to OpenAI for summarization
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Summarize this chat log from a user into a short memory for ${character}, an AI companion. Focus on remembering the user's name, interests, tone, and desires. Format the summary as a system message.`,
        },
        ...chatHistory,
      ],
    }),
  });

  const result = await response.json();
  const summaryText = result.choices?.[0]?.message?.content;

  if (!summaryText) {
    return new NextResponse(JSON.stringify({ error: 'Failed to summarize memory' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Save summary to `summaries` table
  const { error: insertError } = await supabase.from('summaries').insert({
    user_id: userId,
    character,
    summary: summaryText,
  });

  if (insertError) {
    return new NextResponse(JSON.stringify({ error: 'save summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new NextResponse(JSON.stringify({ summary: summaryText}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
