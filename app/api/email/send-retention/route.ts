import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { emailService } from '@/lib/emailService';
import { EmailPersonalization, PersonalizationData } from '@/lib/emailPersonalization';
import { domainMap } from '@/lib/characterConfig';
import { characters } from '@/lib/characters.config';

export async function POST(request: NextRequest) {
  try {
    const { userId, campaignType = 'retention', characterKey } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, first_name, last_seen_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Check if user has unsubscribed
    const { data: unsubscribe } = await supabase
      .from('email_unsubscribes')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (unsubscribe) {
      return NextResponse.json({ error: 'User has unsubscribed from emails' }, { status: 400 });
    }

    // Get user memories for personalization
    const memories = await emailService.getUserMemories(userId);

    // Get conversation stats
    const { data: stats } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    const conversationCount = stats?.length || 0;

    // Detect character from request or default to lexi
    const detectedCharacterKey = characterKey || 'lexi';
    const characterConfig = characters[detectedCharacterKey];
    
    // Get domain for this character (find first domain in domainMap that matches)
    const characterDomain = Object.entries(domainMap).find(([domain, key]) => key === detectedCharacterKey)?.[0] || 'chatwithlexi.com';

    // Prepare personalization data
    const personalizationData: PersonalizationData = {
      firstName: user.first_name,
      lastActiveDate: user.last_seen_at,
      conversationCount,
      memories,
      favoriteTopics: [], // Could be extracted from memories in the future
      characterName: detectedCharacterKey,
      characterDisplayName: characterConfig?.displayName || detectedCharacterKey,
      fromDomain: characterDomain
    };

    // Generate personalized email template
    const template = EmailPersonalization.generateRetentionTemplate(personalizationData);

    // Send email
    const result = await emailService.sendRetentionEmail(
      user.email,
      template,
      userId,
      campaignType
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Retention email sent successfully'
    });

  } catch (error) {
    console.error('Error sending retention email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}