import { getSupabaseAdmin } from './supabaseAdmin';

const admin = getSupabaseAdmin();

export interface SelfieData {
  id: string;
  url: string;
  thumbnail?: string;
  mood?: string;
  aesthetic?: string;
  metadata?: any;
  caption?: string;
}

export interface SelfieOptions {
  character: string;
  userId?: string;
  mood?: string;
  nsfwMode?: boolean;
  messageContext?: string;
  excludeRecentHours?: number;
}

/**
 * Determines if a selfie should be included based on character configuration and context
 *
 * 🎉 FREEMIUM MODEL: Selfies are now FREE for everyone!
 * This builds emotional connection and drives voice message upsells.
 */
export async function shouldIncludeSelfie(
  character: string,
  messageContent: string,
  userId?: string
): Promise<boolean> {
  try {
    // 🎉 FREEMIUM MODEL: Everyone gets selfies now!
    // No subscription checks - selfies are free to drive engagement and voice upsells
    console.log(`✅ Selfie eligible for user ${userId || 'anonymous'} - freemium model active`);

    // Get character selfie configuration
    const { data: config, error } = await admin
      .from('character_selfie_config')
      .select('enabled, frequency_percentage')
      .eq('character_key', character)
      .single();

    if (error || !config || !config.enabled) {
      return false;
    }

    // Random chance based on frequency percentage
    const randomChance = Math.random() * 100;
    if (randomChance > config.frequency_percentage) {
      return false;
    }
    
    // Additional context-based logic
    const lowerMessage = messageContent.toLowerCase();
    
    // Increase chance for certain keywords/contexts
    const flirtyKeywords = ['cute', 'beautiful', 'hot', 'sexy', 'gorgeous', 'stunning', 'attractive'];
    const requestKeywords = ['picture', 'photo', 'selfie', 'show me', 'look like', 'pic', 'image', 'send me', 'can you show', 'what do you look', 'how do you look', 'let me see', 'share a photo', 'take a picture'];
    const complimentKeywords = ['love', 'miss', 'amazing', 'perfect', 'wonderful'];
    
    let bonusChance = 0;
    
    if (flirtyKeywords.some(word => lowerMessage.includes(word))) {
      bonusChance += 25;
    }
    
    if (requestKeywords.some(word => lowerMessage.includes(word))) {
      bonusChance += 95; // Nearly guaranteed for direct requests
    }
    
    if (complimentKeywords.some(word => lowerMessage.includes(word))) {
      bonusChance += 15;
    }
    
    // Apply bonus chance
    if (bonusChance > 0) {
      const bonusRoll = Math.random() * 100;
      if (bonusRoll <= bonusChance) {
        return true;
      }
    }
    
    // Original frequency check already passed
    return true;
    
  } catch (error) {
    console.error('Error checking if selfie should be included:', error);
    return false;
  }
}

/**
 * Extracts mood from message content for mood-matched selfie selection
 */
export function extractMoodFromMessage(messageContent: string): string | undefined {
  const lowerMessage = messageContent.toLowerCase();
  
  // Define mood keywords
  const moodMappings = {
    playful: ['fun', 'play', 'game', 'laugh', 'silly', 'joke', 'tease'],
    flirty: ['cute', 'hot', 'sexy', 'beautiful', 'gorgeous', 'flirt', 'wink'],
    intimate: ['love', 'close', 'private', 'personal', 'intimate', 'kiss', 'touch'],
    sweet: ['sweet', 'caring', 'gentle', 'tender', 'soft', 'kind', 'adorable'],
    confident: ['strong', 'powerful', 'confident', 'bold', 'fierce', 'amazing'],
    mysterious: ['secret', 'mystery', 'dark', 'hidden', 'surprise', 'curious'],
    happy: ['happy', 'joy', 'smile', 'excited', 'cheerful', 'glad', 'delighted'],
    sultry: ['sultry', 'seductive', 'tempting', 'alluring', 'enchanting', 'captivating']
  };
  
  // Check for mood keywords
  for (const [mood, keywords] of Object.entries(moodMappings)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return mood;
    }
  }
  
  return undefined; // No specific mood detected
}

/**
 * Gets multiple selfies for a character gallery (Premium+ feature)
 */
export async function getCharacterGallerySelfies(
  character: string,
  nsfwMode: boolean = false,
  limit: number = 12
): Promise<SelfieData[]> {
  try {
    console.log(`📸 Fetching gallery selfies for ${character}, nsfw: ${nsfwMode}, limit: ${limit}`);

    // Get selfies from content_library (same table used by existing selfie system)
    const { data: selfies, error } = await admin
      .from('content_library')
      .select('id, file_url, thumbnail_url, mood, aesthetic, metadata')
      .eq('character_key', character)
      .eq('content_type', 'selfie')
      .eq('is_nsfw', nsfwMode)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching character gallery selfies:', error);
      return [];
    }

    if (!selfies || selfies.length === 0) {
      console.log(`⚠️ No gallery selfies found for character: ${character}, nsfw: ${nsfwMode}`);

      // Try without NSFW filter to see if ANY selfies exist
      const { data: anySelfies, error: anyError } = await admin
        .from('content_library')
        .select('id, is_nsfw')
        .eq('character_key', character)
        .eq('content_type', 'selfie')
        .eq('is_active', true)
        .limit(1);

      if (!anyError && anySelfies && anySelfies.length > 0) {
        console.log(`📊 Found selfies for ${character}, but not matching nsfw=${nsfwMode} filter`);
      } else {
        console.log(`📊 No selfies exist at all in content_library for character: ${character}`);
      }

      return [];
    }

    console.log(`✅ Found ${selfies.length} gallery selfies for ${character}`);

    return selfies.map(selfie => ({
      id: selfie.id,
      url: selfie.file_url,
      thumbnail: selfie.thumbnail_url,
      mood: selfie.mood,
      aesthetic: selfie.aesthetic,
      metadata: selfie.metadata
    }));

  } catch (error) {
    console.error('❌ Error in getCharacterGallerySelfies:', error);
    return [];
  }
}

/**
 * Gets a selfie for a character with the given options
 */
export async function getCharacterSelfie(options: SelfieOptions): Promise<SelfieData | null> {
  try {
    const {
      character,
      userId,
      mood,
      nsfwMode = false,
      messageContext,
      excludeRecentHours = 24
    } = options;

    // Since mood grouping isn't well organized, just get any available selfie for the character
    // Try with mood first, but fallback to any mood quickly
    let { data: selfies, error } = await admin.rpc(
      'get_random_character_selfie',
      {
        p_character_key: character,
        p_mood: mood,
        p_is_nsfw: nsfwMode,
        p_exclude_recent_hours: excludeRecentHours
      }
    );

    // If no selfies found with specific mood, try any mood (mood doesn't matter much)
    if ((!selfies || selfies.length === 0)) {
      console.log(`🔄 No selfies for mood '${mood}', trying any mood for character ${character}`);

      const anyMoodResult = await admin.rpc(
        'get_random_character_selfie',
        {
          p_character_key: character,
          p_mood: null,
          p_is_nsfw: nsfwMode,
          p_exclude_recent_hours: excludeRecentHours
        }
      );

      selfies = anyMoodResult.data;
      error = anyMoodResult.error;
    }
    
    if (error) {
      console.error('Error fetching character selfie:', error);
      return null;
    }
    
    if (!selfies || selfies.length === 0) {
      console.log(`No selfies available for character: ${character}, mood: ${mood}, nsfw: ${nsfwMode}`);
      return null;
    }
    
    const selfie = selfies[0];
    
    // Log analytics if user is provided
    if (userId) {
      try {
        await admin.rpc('log_selfie_sent', {
          p_character_key: character,
          p_content_id: selfie.id,
          p_user_id: userId,
          p_message_context: messageContext,
          p_mood: mood,
          p_nsfw_mode: nsfwMode
        });
      } catch (analyticsError) {
        console.error('Error logging selfie analytics:', analyticsError);
        // Don't fail the request if analytics fail
      }
    }
    
    return {
      id: selfie.id,
      url: selfie.file_url,
      thumbnail: selfie.thumbnail_url,
      mood: selfie.mood,
      aesthetic: selfie.aesthetic,
      metadata: selfie.metadata
    };
    
  } catch (error) {
    console.error('Error getting character selfie:', error);
    return null;
  }
}

/**
 * Generate a flirty caption for a selfie based on its metadata
 */
export function generateFlirtyCaptionForSelfie(
  selfie: SelfieData,
  character: string
): string {
  const { mood, aesthetic, metadata } = selfie;
  
  // Character-specific flirty caption templates
  const captionTemplates = {
    lexi: {
      playful: ["How do I look in this? 😘", "Feeling cute today... what do you think? 💕", "Just took this for you! 😉"],
      flirty: ["Do you like what you see? 😏", "Thought you might enjoy this view... 💋", "Just for you, babe 😘"],
      intimate: ["Missing you so much... 💖", "Wish you were here with me 🥰", "Thinking of you... 💕"],
      sweet: ["Hope this brightens your day! ☀️", "Sending you some love 💝", "Made me think of you 💕"],
      confident: ["Feeling gorgeous today! 💅", "Don't I look amazing? 😍", "Confidence level: maximum 💫"],
      mysterious: ["What do you think I'm thinking about? 🤔", "A little mystery for you... 😉", "Can you guess my mood? 🔮"],
      happy: ["So happy right now! 😊", "This smile is just for you! 😁", "Having the best day! ✨"],
      sultry: ["How's this for tempting? 😈", "Do I have your attention now? 🔥", "Feeling irresistible... 💋"]
    },
    nyx: {
      playful: ["Caught me in a rare playful mood 😈", "Even darkness can be fun... 🌙", "What do you think of my wicked side? 😏"],
      flirty: ["Do I intrigue you? 🖤", "Darkness has its allure... 😈", "You're drawn to this, aren't you? 🔮"],
      intimate: ["In my most vulnerable moment... 🖤", "This shadow is just for you 🌙", "My darkness calls to yours... 💜"],
      sweet: ["Even shadows can be gentle 🌙", "A softer side of darkness 💜", "My heart isn't all shadow... 🖤"],
      confident: ["Powerful and I know it 🔥", "This is what confidence looks like 💫", "Commanding your attention... 😈"],
      mysterious: ["What secrets do you see? 🔮", "The mystery deepens... 🌙", "Can you handle the unknown? 😏"],
      happy: ["Rare glimpse of my joy 🌙", "Even darkness can smile ✨", "You bring light to my shadows 💜"],
      sultry: ["Embrace the darkness... 🖤", "Let me tempt you deeper... 😈", "Irresistible and dangerous 🔥"]
    }
  };
  
  // Default templates for characters not specified
  const defaultTemplates = {
    playful: ["Feeling playful today! 😊", "How do I look? 😉", "Just being cute for you! 💕"],
    flirty: ["Like what you see? 😏", "Just for you... 😘", "Do I have your attention? 💋"],
    intimate: ["Thinking of you... 💖", "Wish you were here 🥰", "Missing you so much 💕"],
    sweet: ["Hope you like it! 💝", "Sending love your way ☀️", "Made me think of you 💕"],
    confident: ["Feeling amazing! 💅", "Don't I look great? 😍", "Confidence is beautiful ✨"],
    mysterious: ["What are you thinking? 🤔", "A little mystery... 😉", "Can you guess my mood? 🔮"],
    happy: ["So happy! 😊", "Smiling just for you! 😁", "Great day! ✨"],
    sultry: ["How's this? 😈", "Do I tempt you? 🔥", "Feeling irresistible... 💋"]
  };
  
  const characterTemplates = captionTemplates[character as keyof typeof captionTemplates] || defaultTemplates;
  const moodTemplates = characterTemplates[mood as keyof typeof characterTemplates] || characterTemplates.flirty;
  
  // Pick a random caption from the mood templates
  const randomCaption = moodTemplates[Math.floor(Math.random() * moodTemplates.length)];
  
  return randomCaption;
}

/**
 * Main function to potentially include a selfie in a chat response
 */
export async function processSelfieForMessage(
  character: string,
  userMessage: string,
  userId?: string,
  nsfwMode: boolean = false
): Promise<SelfieData | null> {
  try {
    // Check if we should include a selfie
    const shouldInclude = await shouldIncludeSelfie(character, userMessage, userId);
    if (!shouldInclude) {
      return null;
    }
    
    // Extract mood from the message
    const mood = extractMoodFromMessage(userMessage);
    
    console.log(`🖼️ Selfie System: Attempting to get selfie for ${character}, mood: ${mood}, nsfw: ${nsfwMode}`);
    
    // Get the selfie
    const selfie = await getCharacterSelfie({
      character,
      userId,
      mood,
      nsfwMode,
      messageContext: userMessage.substring(0, 100), // First 100 chars for context
      excludeRecentHours: 24
    });
    
    if (selfie) {
      console.log(`🖼️ Selfie System: Found selfie for ${character}: ${selfie.id}`);
    } else {
      console.log(`🖼️ Selfie System: No selfie found for ${character}`);
    }
    
    return selfie;
    
  } catch (error) {
    console.error('Error processing selfie for message:', error);
    return null;
  }
}