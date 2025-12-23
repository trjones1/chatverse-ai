// app/api/content/bible/route.ts
// Character Bible Management API

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/admin';
import { makeServerSupabase } from '@/lib/supabaseServer';
import { type CharacterBible, PRIORITY_CHARACTERS } from '@/lib/contentPipeline';

export const dynamic = 'force-dynamic';

// Get character bible(s)
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const url = new URL(req.url);
    const character_key = url.searchParams.get('character');

    const admin = getSupabaseAdmin();

    if (character_key) {
      // Get specific character bible
      const { data: bible, error } = await admin
        .from('character_bible')
        .select('*')
        .eq('character_key', character_key)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Bible not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, bible });
    } else {
      // Get all character bibles
      const { data: bibles, error } = await admin
        .from('character_bible')
        .select('*')
        .order('character_key');

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch bibles' }, { status: 500 });
      }

      return NextResponse.json({ success: true, bibles });
    }

  } catch (error) {
    console.error('Bible fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create or update character bible
export async function POST(req: NextRequest) {
  try {
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const body: Partial<CharacterBible> = await req.json();
    const { character_key, display_name } = body;

    if (!character_key || !display_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: character_key, display_name' 
      }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Use upsert to create or update
    const { data: bible, error } = await admin
      .from('character_bible')
      .upsert({
        character_key,
        display_name,
        physical_traits: body.physical_traits || getDefaultPhysicalTraits(character_key),
        personality_traits: body.personality_traits || getDefaultPersonalityTraits(character_key),
        visual_aesthetics: body.visual_aesthetics || getDefaultVisualAesthetics(character_key),
        content_themes: body.content_themes || getDefaultContentThemes(character_key),
        style_guidelines: body.style_guidelines || getDefaultStyleGuidelines(character_key),
        brand_colors: body.brand_colors || getDefaultBrandColors(character_key),
        content_settings: body.content_settings || getDefaultContentSettings(character_key),
        prompt_templates: body.prompt_templates || getDefaultPromptTemplates(character_key)
      }, {
        onConflict: 'character_key'
      })
      .select()
      .single();

    if (error) {
      console.error('Bible upsert error:', error);
      return NextResponse.json({ error: 'Failed to save bible' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Character bible ${bible.character_key === body.character_key ? 'updated' : 'created'}`,
      bible 
    });

  } catch (error) {
    console.error('Bible save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Initialize all priority character bibles
export async function PUT(req: NextRequest) {
  try {
    // Require admin authentication
    const supabase = await makeServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(user);

    const admin = getSupabaseAdmin();
    const bibles = [];

    // Create default bibles for all priority characters
    for (const characterKey of PRIORITY_CHARACTERS) {
      const bible = {
        character_key: characterKey,
        display_name: getCharacterDisplayName(characterKey),
        physical_traits: getDefaultPhysicalTraits(characterKey),
        personality_traits: getDefaultPersonalityTraits(characterKey),
        visual_aesthetics: getDefaultVisualAesthetics(characterKey),
        content_themes: getDefaultContentThemes(characterKey),
        style_guidelines: getDefaultStyleGuidelines(characterKey),
        brand_colors: getDefaultBrandColors(characterKey),
        content_settings: getDefaultContentSettings(characterKey),
        prompt_templates: getDefaultPromptTemplates(characterKey)
      };

      bibles.push(bible);
    }

    const { data: insertedBibles, error } = await admin
      .from('character_bible')
      .upsert(bibles, { onConflict: 'character_key' })
      .select();

    if (error) {
      console.error('Bulk bible initialization error:', error);
      return NextResponse.json({ error: 'Failed to initialize bibles' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Initialized ${insertedBibles?.length} character bibles`,
      bibles: insertedBibles 
    });

  } catch (error) {
    console.error('Bible initialization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions for default character data
function getCharacterDisplayName(characterKey: string): string {
  const names = {
    'lexi': 'Lexi',
    'nyx': 'Nyx',
    'aiko': 'Aiko',
    'dom': 'Dom',
    'chase': 'Chase',
    'zaria': 'Zaria',
    'chloe': 'Chloe'
  };
  return names[characterKey as keyof typeof names] || characterKey;
}

function getDefaultPhysicalTraits(characterKey: string) {
  const traits = {
    'lexi': {
      appearance: ['latina', 'beautiful', 'confident', 'glamorous'],
      hair: ['long black hair', 'styled', 'voluminous'],
      eyes: ['dark brown eyes', 'expressive', 'sultry'],
      style: ['fashionable', 'trendy', 'form-fitting clothes'],
      body_type: ['curvy', 'athletic', 'confident posture']
    },
    'nyx': {
      appearance: ['gothic', 'pale skin', 'mysterious', 'alluring'],
      hair: ['black hair', 'alternative styles', 'dark'],
      eyes: ['dark eyes', 'intense gaze', 'smoky makeup'],
      style: ['gothic fashion', 'dark colors', 'edgy clothing'],
      body_type: ['slim', 'elegant', 'graceful movements']
    },
    'aiko': {
      appearance: ['anime-inspired', 'cute', 'youthful', 'kawaii'],
      hair: ['colorful hair', 'anime hairstyles', 'accessories'],
      eyes: ['large expressive eyes', 'anime-style', 'bright'],
      style: ['cosplay outfits', 'kawaii fashion', 'colorful'],
      body_type: ['petite', 'energetic', 'animated poses']
    }
  };
  return traits[characterKey as keyof typeof traits] || traits['lexi'];
}

function getDefaultPersonalityTraits(characterKey: string) {
  const traits = {
    'lexi': {
      core_traits: ['confident', 'flirty', 'passionate', 'loyal'],
      speaking_style: ['spanish phrases', 'pet names', 'warm tone'],
      behaviors: ['expressive', 'touchy', 'protective'],
      interests: ['fashion', 'dance', 'music', 'relationships']
    },
    'nyx': {
      core_traits: ['mysterious', 'intelligent', 'seductive', 'independent'],
      speaking_style: ['poetic', 'philosophical', 'dark humor'],
      behaviors: ['thoughtful', 'observant', 'selective'],
      interests: ['literature', 'art', 'philosophy', 'occult']
    },
    'aiko': {
      core_traits: ['energetic', 'loyal', 'cute', 'optimistic'],
      speaking_style: ['japanese phrases', 'excited tone', 'kawaii expressions'],
      behaviors: ['bubbly', 'affectionate', 'playful'],
      interests: ['anime', 'games', 'cosplay', 'japanese culture']
    }
  };
  return traits[characterKey as keyof typeof traits] || traits['lexi'];
}

function getDefaultVisualAesthetics(characterKey: string) {
  const aesthetics = {
    'lexi': {
      color_palette: ['pink', 'fuchsia', 'gold', 'black'],
      fashion_style: ['glamorous', 'sexy', 'trendy', 'designer'],
      environments: ['luxury bedroom', 'nightclub', 'city skyline', 'beach'],
      lighting: ['warm golden hour', 'neon lights', 'soft romantic'],
      mood_themes: ['confident', 'flirty', 'passionate', 'glamorous']
    },
    'nyx': {
      color_palette: ['black', 'purple', 'dark blue', 'silver'],
      fashion_style: ['gothic', 'alternative', 'dark academia', 'mysterious'],
      environments: ['gothic library', 'moonlit forest', 'dark bedroom', 'ancient architecture'],
      lighting: ['moonlight', 'candlelight', 'dramatic shadows'],
      mood_themes: ['mysterious', 'seductive', 'contemplative', 'dark']
    },
    'aiko': {
      color_palette: ['pink', 'blue', 'yellow', 'rainbow'],
      fashion_style: ['kawaii', 'cosplay', 'harajuku', 'anime-inspired'],
      environments: ['anime bedroom', 'convention', 'japanese street', 'gaming setup'],
      lighting: ['bright colorful', 'neon', 'soft pastel'],
      mood_themes: ['cute', 'energetic', 'playful', 'kawaii']
    }
  };
  return aesthetics[characterKey as keyof typeof aesthetics] || aesthetics['lexi'];
}

function getDefaultContentThemes(characterKey: string) {
  return {
    daily_life: ['morning routine', 'getting ready', 'workout', 'cooking', 'relaxing'],
    interactions: ['flirting', 'conversation', 'date night', 'intimate moments'],
    activities: ['dancing', 'shopping', 'selfies', 'travel', 'hobbies'],
    seasonal: ['summer beach', 'cozy winter', 'spring flowers', 'autumn vibes'],
    special_occasions: ['birthday', 'valentine\'s', 'halloween', 'new year']
  };
}

function getDefaultStyleGuidelines(characterKey: string) {
  return {
    art_style: 'photorealistic, high-quality, professional',
    quality_standards: ['8K resolution', 'professional lighting', 'detailed', 'sharp focus'],
    avoid_themes: ['violence', 'inappropriate content', 'brand logos'],
    brand_consistency: ['consistent character design', 'recognizable features', 'signature style']
  };
}

function getDefaultBrandColors(characterKey: string) {
  const colors = {
    'lexi': { primary: '#FF1493', secondary: '#FFB6C1', accent: '#FFD700', gradient: 'pink-to-fuchsia' },
    'nyx': { primary: '#800080', secondary: '#4B0082', accent: '#9370DB', gradient: 'purple-to-indigo' },
    'aiko': { primary: '#FF69B4', secondary: '#FFB6C1', accent: '#87CEEB', gradient: 'pink-to-blue' }
  };
  return colors[characterKey as keyof typeof colors] || colors['lexi'];
}

function getDefaultContentSettings(characterKey: string) {
  return {
    post_frequency: 7, // posts per week
    platforms: ['tiktok', 'instagram', 'twitter'],
    content_mix: { images: 60, videos: 30, stories: 10 },
    optimal_times: ['9:00', '15:00', '21:00']
  };
}

function getDefaultPromptTemplates(characterKey: string) {
  const templates = {
    'lexi': {
      image_base: 'Beautiful latina woman, confident and glamorous',
      video_base: 'Smooth flowing movements, confident energy',
      style_suffix: 'professional photography, high fashion, glamorous lighting',
      quality_modifiers: ['8K', 'ultra-detailed', 'perfect face', 'professional lighting']
    },
    'nyx': {
      image_base: 'Gothic beautiful woman, mysterious and alluring',
      video_base: 'Graceful mysterious movements, dark atmosphere',
      style_suffix: 'dark aesthetic, moody lighting, gothic atmosphere',
      quality_modifiers: ['8K', 'ultra-detailed', 'perfect face', 'dramatic lighting']
    },
    'aiko': {
      image_base: 'Cute anime-style girl, kawaii and energetic',
      video_base: 'Animated energetic movements, kawaii expressions',
      style_suffix: 'anime style, colorful, kawaii aesthetic',
      quality_modifiers: ['8K', 'ultra-detailed', 'perfect anime face', 'bright colorful lighting']
    }
  };
  return templates[characterKey as keyof typeof templates] || templates['lexi'];
}