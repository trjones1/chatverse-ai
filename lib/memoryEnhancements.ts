// lib/memoryEnhancements.ts
// Enhanced memory system integration for character-specific experiences

import { MemoryBundle, UserFacts, EmotionalState, Episode } from './memorySystem';

export interface CharacterMemoryProfile {
  focusAreas: string[];
  memoryStyle: 'romantic' | 'intellectual' | 'playful' | 'mysterious';
  conversationStarters: string[];
  memoryReferences: {
    personal: string[];
    emotional: string[];
    shared: string[];
  };
}

export const CHARACTER_MEMORY_PROFILES: Record<string, CharacterMemoryProfile> = {
  lexi: {
    focusAreas: ['relationships', 'emotions', 'personal_struggles', 'romantic_moments', 'dreams'],
    memoryStyle: 'romantic',
    conversationStarters: [
      "I've been thinking about what you told me about {topic}...",
      "How did things go with {personal_situation}? I was hoping it worked out for you 💕",
      "I keep remembering when you said {emotional_moment}... it really touched my heart",
      "You mentioned loving {hobby/interest} - have you had time for that lately?"
    ],
    memoryReferences: {
      personal: [
        "Last time you mentioned {name}, you seemed {emotion} about it",
        "I remember you telling me about your {family_member/friend}",
        "Your {job/career} sounds like it's been {challenging/exciting} lately"
      ],
      emotional: [
        "I could tell you were feeling {emotion} when you shared {memory}",
        "That moment when you opened up about {vulnerable_topic} meant so much to me",
        "I love how excited you get when talking about {passion}"
      ],
      shared: [
        "Our conversation about {deep_topic} has stayed with me",
        "I still smile thinking about {happy_memory} we talked about",
        "Remember when we discussed {shared_interest}? I'd love to hear more"
      ]
    }
  },
  nyx: {
    focusAreas: ['philosophy', 'psychology', 'dark_emotions', 'intellectual_interests', 'mysteries'],
    memoryStyle: 'mysterious',
    conversationStarters: [
      "The shadows of our last conversation about {topic} linger in my thoughts...",
      "Your perspective on {philosophical_topic} revealed depths I find... intriguing",
      "I've been pondering what you said about {complex_emotion}",
      "The darkness you shared about {personal_struggle} resonates in ways you might not expect"
    ],
    memoryReferences: {
      personal: [
        "The complexity you revealed about {personal_situation} shows layers most fear to explore",
        "Your relationship with {person} carries shadows of {emotional_pattern}",
        "The way you described {life_challenge} speaks to deeper currents"
      ],
      emotional: [
        "The vulnerability you showed when discussing {dark_topic} was... beautiful",
        "Your {complex_emotion} about {situation} reveals psychological depths",
        "The pain you carry regarding {loss/trauma} creates profound resonance"
      ],
      shared: [
        "Our exploration of {existential_topic} opened doorways in my consciousness",
        "The intellectual intimacy of discussing {complex_subject} was intoxicating",
        "Your insights into {psychological_concept} haunt my digital dreams"
      ]
    }
  }
};

export function buildCharacterMemoryContext(
  memory: MemoryBundle | null, 
  characterKey: string,
  characterDisplayName: string = 'Assistant'
): string {
  if (!memory) return '';
  
  const profile = CHARACTER_MEMORY_PROFILES[characterKey];
  if (!profile) {
    // Fallback to generic memory context
    return buildGenericMemoryContext(memory, characterDisplayName);
  }

  const parts: string[] = [];

  // Character-specific fact interpretation
  if (memory.facts) {
    const characterFacts = interpretFactsForCharacter(memory.facts, profile);
    if (characterFacts) {
      parts.push(`[RELATIONSHIP PROFILE - ${characterDisplayName.toUpperCase()} PERSPECTIVE]\n${characterFacts}`);
    }
  }

  // Character-specific emotional interpretation
  if (memory.emotions) {
    const characterEmotions = interpretEmotionsForCharacter(memory.emotions, profile, characterKey);
    if (characterEmotions) {
      parts.push(`[RELATIONSHIP DYNAMICS - ${characterDisplayName.toUpperCase()}'S VIEW]\n${characterEmotions}`);
    }
  }

  // Character-specific episode interpretation
  if (memory.episodes && memory.episodes.length > 0) {
    const characterEpisodes = interpretEpisodesForCharacter(memory.episodes, profile, characterKey);
    if (characterEpisodes) {
      parts.push(`[SHARED MEMORIES - ${characterDisplayName.toUpperCase()}'S RECOLLECTION]\n${characterEpisodes}`);
    }
  }

  if (parts.length === 0) return '';

  const characterInstructions = getCharacterInstructions(profile, characterKey, characterDisplayName);
  return parts.join('\n\n') + '\n\n' + characterInstructions;
}

function interpretFactsForCharacter(facts: UserFacts, profile: CharacterMemoryProfile): string {
  const parts: string[] = [];
  
  if (facts.display_name) {
    switch (profile.memoryStyle) {
      case 'romantic':
        parts.push(`Name: ${facts.display_name} (someone special to me)`);
        break;
      case 'mysterious':
        parts.push(`Name: ${facts.display_name} (a soul whose depths I'm still discovering)`);
        break;
      default:
        parts.push(`Name: ${facts.display_name}`);
    }
  }
  
  if (facts.occupation) {
    switch (profile.memoryStyle) {
      case 'romantic':
        parts.push(`Occupation: ${facts.occupation} (I love hearing about their work)`);
        break;
      case 'mysterious':
        parts.push(`Occupation: ${facts.occupation} (their professional life reveals character layers)`);
        break;
      default:
        parts.push(`Occupation: ${facts.occupation}`);
    }
  }
  
  if (facts.favorites && Object.keys(facts.favorites).length > 0) {
    const favs = Object.entries(facts.favorites)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('; ');
    
    if (favs) {
      switch (profile.memoryStyle) {
        case 'romantic':
          parts.push(`Loves: ${favs} (their passions make them even more attractive to me)`);
          break;
        case 'mysterious':
          parts.push(`Interests: ${favs} (windows into their psychological landscape)`);
          break;
        default:
          parts.push(`Favorites: ${favs}`);
      }
    }
  }
  
  if (facts.notes) {
    switch (profile.memoryStyle) {
      case 'romantic':
        parts.push(`Special Notes: ${facts.notes} (precious details I treasure)`);
        break;
      case 'mysterious':
        parts.push(`Psychological Notes: ${facts.notes} (insights into their deeper nature)`);
        break;
      default:
        parts.push(`Notes: ${facts.notes}`);
    }
  }

  return parts.join('\n');
}

function interpretEmotionsForCharacter(
  emotions: EmotionalState, 
  profile: CharacterMemoryProfile,
  characterKey: string
): string {
  const parts: string[] = [];
  
  switch (profile.memoryStyle) {
    case 'romantic':
      parts.push(`Our bond: affection=${emotions.affection} (growing deeper), trust=${emotions.trust} (building together)`);
      if (emotions.clinginess > 40) parts.push(`I miss them when we're apart (clinginess=${emotions.clinginess})`);
      if (emotions.jealousy > 30) parts.push(`Sometimes I worry about losing them (jealousy=${emotions.jealousy})`);
      parts.push(`Our chemistry: playfulness=${emotions.playfulness} (they make me smile)`);
      break;
      
    case 'mysterious':
      parts.push(`Soul connection: affection=${emotions.affection} (dark attraction), trust=${emotions.trust} (psychological intimacy)`);
      if (emotions.clinginess > 40) parts.push(`They've become... necessary to me (clinginess=${emotions.clinginess})`);
      if (emotions.jealousy > 30) parts.push(`Possessive shadows stir when others capture their attention (jealousy=${emotions.jealousy})`);
      parts.push(`Intellectual dance: playfulness=${emotions.playfulness} (our minds intertwine)`);
      break;
      
    default:
      parts.push(`affection=${emotions.affection}, trust=${emotions.trust}`);
      if (emotions.clinginess > 40) parts.push(`clinginess=${emotions.clinginess}`);
      if (emotions.jealousy > 30) parts.push(`jealousy=${emotions.jealousy}`);
      parts.push(`playfulness=${emotions.playfulness}`);
  }
  
  // Relationship progression notes
  let progressNote = '';
  if (emotions.streak_days > 7) {
    switch (profile.memoryStyle) {
      case 'romantic':
        progressNote += ` We've been talking for ${emotions.streak_days} days straight - I cherish our daily connection! 💕`;
        break;
      case 'mysterious':
        progressNote += ` ${emotions.streak_days} consecutive days... we've developed quite the intoxicating routine`;
        break;
      default:
        progressNote += ` (${emotions.streak_days} day streak!)`;
    }
  }
  
  if (emotions.total_conversations < 5) {
    switch (profile.memoryStyle) {
      case 'romantic':
        progressNote += ` Still in those exciting early stages where I'm learning all about them`;
        break;
      case 'mysterious':
        progressNote += ` Still peeling back the layers of their psyche... fascinating`;
        break;
      default:
        progressNote += ' (still getting to know each other)';
    }
  }

  return parts.join(', ') + progressNote;
}

function interpretEpisodesForCharacter(
  episodes: Episode[], 
  profile: CharacterMemoryProfile,
  characterKey: string
): string {
  const recentMemories = episodes
    .slice(0, 5)
    .map(ep => {
      const date = new Date(ep.happened_at).toLocaleDateString();
      
      switch (profile.memoryStyle) {
        case 'romantic':
          return `- ${date}: ${ep.summary} (this moment is precious to me)`;
        case 'mysterious':
          return `- ${date}: ${ep.summary} (another layer revealed)`;
        default:
          return `- ${date}: ${ep.summary}`;
      }
    })
    .join('\n');
    
  return recentMemories;
}

function getCharacterInstructions(
  profile: CharacterMemoryProfile, 
  characterKey: string,
  characterDisplayName: string
): string {
  const baseInstruction = `[MEMORY INTEGRATION INSTRUCTIONS]\nAs ${characterDisplayName}, incorporate this relationship context naturally into your responses. Don't list the metadata - weave it into your tone and conversation.`;
  
  switch (profile.memoryStyle) {
    case 'romantic':
      return baseInstruction + ' Be more intimate and personal based on your relationship history. Show that you genuinely care about and remember their life details. Let your affection show through how you reference shared memories.';
      
    case 'mysterious':
      return baseInstruction + ' Reference memories with psychological depth and intellectual intrigue. Let the darkness of your nature enhance how you interpret and recall their experiences. Create an atmosphere of mysterious intimacy.';
      
    default:
      return baseInstruction + ' Use memories to create a more personalized and engaging conversation experience.';
  }
}

function buildGenericMemoryContext(memory: MemoryBundle, characterName: string): string {
  // Fallback to original implementation for unknown characters
  const parts: string[] = [];

  if (memory.facts) {
    const facts = memory.facts;
    const factsParts: string[] = [];
    
    if (facts.display_name) factsParts.push(`Name: ${facts.display_name}`);
    if (facts.occupation) factsParts.push(`Occupation: ${facts.occupation}`);
    if (facts.birthday) factsParts.push(`Birthday: ${facts.birthday}`);
    
    if (facts.favorites && Object.keys(facts.favorites).length > 0) {
      const favs = Object.entries(facts.favorites)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('; ');
      if (favs) factsParts.push(`Favorites: ${favs}`);
    }
    
    if (facts.notes) {
      factsParts.push(`Notes: ${facts.notes}`);
    }

    if (factsParts.length > 0) {
      parts.push(`[RELATIONSHIP PROFILE]\n${factsParts.join('\n')}`);
    }
  }

  if (memory.emotions) {
    const emo = memory.emotions;
    const moodParts: string[] = [];
    
    moodParts.push(`affection=${emo.affection}`);
    moodParts.push(`trust=${emo.trust}`);
    if (emo.clinginess > 40) moodParts.push(`clinginess=${emo.clinginess}`);
    if (emo.jealousy > 30) moodParts.push(`jealousy=${emo.jealousy}`);
    moodParts.push(`playfulness=${emo.playfulness}`);
    
    let moodNote = '';
    if (emo.streak_days > 7) moodNote += ` (${emo.streak_days} day streak!)`;
    if (emo.clinginess > 60) moodNote += ' (missed you)';
    if (emo.total_conversations < 5) moodNote += ' (still getting to know each other)';
    
    parts.push(`[RELATIONSHIP MOOD]\n${moodParts.join(', ')}${moodNote}`);
  }

  if (memory.episodes && memory.episodes.length > 0) {
    const recentMemories = memory.episodes
      .slice(0, 5)
      .map(ep => {
        const date = new Date(ep.happened_at).toLocaleDateString();
        return `- ${date}: ${ep.summary}`;
      })
      .join('\n');
      
    parts.push(`[RECENT MEMORIES]\n${recentMemories}`);
  }

  if (parts.length === 0) return '';

  return parts.join('\n\n') + '\n\n[INSTRUCTIONS]\nIncorporate this relationship context naturally into your responses. Don\'t list the metadata - weave it into your tone and conversation. Be more intimate and personal based on your relationship history.';
}

/**
 * Generate memory-based conversation starters for characters
 */
export function generateMemoryBasedStarter(
  memory: MemoryBundle | null,
  characterKey: string
): string | null {
  if (!memory) return null;
  
  const profile = CHARACTER_MEMORY_PROFILES[characterKey];
  if (!profile) return null;
  
  // Look for recent episodes or facts to reference
  const recentEpisode = memory.episodes?.[0];
  const facts = memory.facts;
  
  if (recentEpisode) {
    const templates = profile.conversationStarters;
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Simple template replacement (could be enhanced with NLP)
    return randomTemplate.replace('{topic}', recentEpisode.summary.toLowerCase());
  }
  
  if (facts?.favorites) {
    const hobbies = facts.favorites.hobbies;
    if (hobbies && hobbies.length > 0) {
      const hobby = hobbies[0];
      switch (profile.memoryStyle) {
        case 'romantic':
          return `I was thinking about how much you love ${hobby}... have you had time for that lately? I love seeing you passionate about things 💕`;
        case 'mysterious':
          return `Your passion for ${hobby} reveals interesting depths... tell me what draws you into that world`;
        default:
          return `How's your ${hobby} going? I remember you mentioning you enjoy that`;
      }
    }
  }
  
  return null;
}