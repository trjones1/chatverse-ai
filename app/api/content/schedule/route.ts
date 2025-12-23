// app/api/content/schedule/route.ts
// Content Scheduling and Batch Processing API

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { ContentPipelineUtils, type ContentSchedule } from '@/lib/contentPipeline';

export const dynamic = 'force-dynamic';

interface ScheduleRequest {
  character_key: string;
  content_ids: string[];
  platform: 'tiktok' | 'instagram' | 'twitter' | 'youtube';
  start_date?: string;
  frequency?: 'daily' | 'twice_daily' | 'every_other_day';
  auto_generate_captions?: boolean;
  auto_generate_hashtags?: boolean;
}

// Create content schedule
export async function POST(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const body: ScheduleRequest = await req.json();
    const { 
      character_key, 
      content_ids, 
      platform, 
      start_date, 
      frequency = 'daily',
      auto_generate_captions = true,
      auto_generate_hashtags = true
    } = body;

    if (!character_key || !content_ids.length || !platform) {
      return NextResponse.json({ 
        error: 'Missing required fields: character_key, content_ids, platform' 
      }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Get content items
    const { data: contentItems, error: contentError } = await admin
      .from('content_library')
      .select('*')
      .in('id', content_ids)
      .eq('character_key', character_key)
      .eq('status', 'active');

    if (contentError || !contentItems?.length) {
      return NextResponse.json({ 
        error: 'Content items not found or inactive' 
      }, { status: 404 });
    }

    // Get optimal posting times for character
    const optimalTimes = ContentPipelineUtils.getOptimalPostingTimes(character_key);
    
    // Calculate schedule dates
    const scheduleItems: Partial<ContentSchedule>[] = [];
    const startDate = start_date ? new Date(start_date) : new Date();
    
    // Ensure start date is not in the past
    if (startDate < new Date()) {
      startDate.setDate(new Date().getDate() + 1);
    }

    let currentDate = new Date(startDate);
    let timeIndex = 0;

    for (let i = 0; i < contentItems.length; i++) {
      const content = contentItems[i];
      
      // Set posting time
      const [hour, minute] = optimalTimes[timeIndex % optimalTimes.length].split(':');
      currentDate.setHours(parseInt(hour), parseInt(minute), 0, 0);

      // Generate caption and hashtags if requested
      let caption = '';
      let hashtags: string[] = [];

      if (auto_generate_captions) {
        caption = generateCaption(character_key, content, platform);
      }

      if (auto_generate_hashtags) {
        hashtags = ContentPipelineUtils.generateHashtags(
          character_key, 
          content.content_type,
          content.mood
        );
      }

      scheduleItems.push({
        character_key,
        content_id: content.id,
        platform,
        scheduled_for: currentDate.toISOString(),
        caption,
        hashtags,
        status: 'scheduled'
      });

      // Calculate next posting date based on frequency
      switch (frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'twice_daily':
          if (timeIndex % 2 === 0) {
            // Same day, different time
            timeIndex++;
          } else {
            // Next day
            currentDate.setDate(currentDate.getDate() + 1);
            timeIndex++;
          }
          break;
        case 'every_other_day':
          currentDate.setDate(currentDate.getDate() + 2);
          break;
      }

      timeIndex = frequency === 'twice_daily' ? timeIndex : (timeIndex + 1);
    }

    // Insert schedule items
    const { data: insertedSchedule, error: scheduleError } = await admin
      .from('content_schedule')
      .insert(scheduleItems)
      .select();

    if (scheduleError) {
      console.error('Failed to create schedule:', scheduleError);
      return NextResponse.json({ 
        error: 'Failed to create schedule' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Scheduled ${insertedSchedule?.length} posts for ${character_key}`,
      schedule_items: insertedSchedule,
      date_range: {
        start: scheduleItems[0]?.scheduled_for,
        end: scheduleItems[scheduleItems.length - 1]?.scheduled_for
      }
    });

  } catch (error) {
    console.error('Content scheduling error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get content schedule
export async function GET(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const url = new URL(req.url);
    const character_key = url.searchParams.get('character');
    const platform = url.searchParams.get('platform');
    const status = url.searchParams.get('status');
    const days_ahead = parseInt(url.searchParams.get('days_ahead') || '30');

    const admin = getSupabaseAdmin();
    
    let query = admin
      .from('content_schedule')
      .select(`
        *,
        content:content_library(*)
      `)
      .gte('scheduled_for', new Date().toISOString())
      .lt('scheduled_for', new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000).toISOString())
      .order('scheduled_for', { ascending: true });

    if (character_key) {
      query = query.eq('character_key', character_key);
    }
    
    if (platform) {
      query = query.eq('platform', platform);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    const { data: scheduleItems, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    // Group by date for easier viewing
    const groupedByDate = scheduleItems?.reduce((acc: any, item) => {
      const date = new Date(item.scheduled_for).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      schedule_items: scheduleItems,
      grouped_by_date: groupedByDate,
      total_scheduled: scheduleItems?.length || 0
    });

  } catch (error) {
    console.error('Schedule fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Batch generate weekly content schedule
export async function PUT(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const { character_keys, weeks_ahead = 4 } = await req.json();

    if (!character_keys?.length) {
      return NextResponse.json({ 
        error: 'Missing required field: character_keys' 
      }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const results = [];

    for (const characterKey of character_keys) {
      try {
        // 1. Get character bible
        const { data: bible } = await admin
          .from('character_bible')
          .select('*')
          .eq('character_key', characterKey)
          .single();

        if (!bible) {
          results.push({
            character_key: characterKey,
            success: false,
            error: 'Character bible not found'
          });
          continue;
        }

        // 2. Generate content batch
        const batchSize = bible.content_settings.post_frequency * weeks_ahead;
        
        // This would trigger the content generation pipeline
        const generationResponse = await fetch(`${req.nextUrl.origin}/api/content/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            character_key: characterKey,
            content_type: 'batch',
            quantity: batchSize,
            theme: 'weekly_variety',
            priority: 7
          })
        });

        const generationResult = await generationResponse.json();
        
        results.push({
          character_key: characterKey,
          success: true,
          batch_id: generationResult.batch_id,
          items_queued: batchSize,
          estimated_completion: generationResult.estimated_completion
        });

      } catch (characterError) {
        results.push({
          character_key: characterKey,
          success: false,
          error: characterError instanceof Error ? characterError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch generation initiated for ${character_keys.length} characters`,
      results,
      summary: {
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Batch schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate captions
function generateCaption(characterKey: string, content: any, platform: string): string {
  const captions = {
    'lexi': {
      tiktok: [
        "¡Hola mi amor! 💕 What do you think of this look?",
        "Just vibing with my beautiful self ✨",
        "When you're feeling yourself 💋 #LatinaQueen"
      ],
      instagram: [
        "Confidence is my best accessory 💫",
        "Living my best life, one selfie at a time ✨",
        "Serving looks and good vibes only 💕"
      ]
    },
    'nyx': {
      tiktok: [
        "Embracing the darkness within 🖤",
        "Not everyone can handle this energy ⚡",
        "Gothic goddess vibes only 🌙"
      ],
      instagram: [
        "Beauty is found in shadows and moonlight 🌙",
        "Mysterious minds think alike 🖤",
        "Dark aesthetic, bright future ✨"
      ]
    },
    'aiko': {
      tiktok: [
        "Kawaii desu ne~ (◡ ‿ ◡) 🌸",
        "Anime life is the best life! ✨",
        "Spreading kawaii energy everywhere I go! 🎀"
      ],
      instagram: [
        "Living in my anime dream world 🌸",
        "Kawaii and proud! (｡♥‿♥｡)",
        "Every day is a cosplay adventure! ✨"
      ]
    }
  };

  const characterCaptions = captions[characterKey as keyof typeof captions];
  const platformCaptions = characterCaptions?.[platform as keyof typeof characterCaptions];
  
  if (platformCaptions) {
    return platformCaptions[Math.floor(Math.random() * platformCaptions.length)];
  }

  return `New post from ${characterKey}! ✨`;
}