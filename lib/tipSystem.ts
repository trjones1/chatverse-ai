// lib/tipSystem.ts
// Utilities for tip system integration with chat

import { getSupabaseAdmin } from './supabaseAdmin';
import { getCharacterCurrency } from '@/lib/verseCoins';

const admin = getSupabaseAdmin();

/**
 * Convert USD tip amount to character-specific currency
 * Base rate: 100 VerseCoins = $1 (so $0.50 = 50 VerseCoins)
 */
function formatTipInCharacterCurrency(amountUSD: number, character: string): string {
  const versecoinsAmount = Math.round(amountUSD * 100); // $1 = 100 VerseCoins
  const currency = getCharacterCurrency(versecoinsAmount, character);
  return `${currency.amount} ${currency.name} ${currency.icon}`;
}

export interface RecentTip {
  id: string;
  amount_cents: number;
  message?: string;
  created_at: string;
  display_name?: string;
}

/**
 * Get recent tips for a user and character to use in chat context
 * This helps characters acknowledge tips in conversation
 */
export async function getRecentTipsForContext(
  userId: string, 
  characterKey: string,
  hoursBack: number = 24
): Promise<RecentTip[]> {
  try {
    const { data: tips, error } = await admin
      .from('tips')
      .select('id, amount_cents, message, created_at, display_name')
      .eq('user_id', userId)
      .eq('character_key', characterKey.toLowerCase())
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error fetching recent tips:', error);
      return [];
    }

    return tips || [];
  } catch (error) {
    console.error('Error in getRecentTipsForContext:', error);
    return [];
  }
}

/**
 * Generate character-specific tip acknowledgment text
 */
export function generateTipAcknowledgment(
  tip: RecentTip,
  characterKey: string,
  isNsfwMode: boolean = false
): string {
  const amountUSD = tip.amount_cents / 100;
  const character = characterKey.toLowerCase();
  const currencyAmount = formatTipInCharacterCurrency(amountUSD, character);
  
  if (character === 'lexi') {
    let lexiResponses: string[];

    if (isNsfwMode) {
      lexiResponses = [
        `Mmm, that ${currencyAmount} tip is making me feel so... generous 😈 You know exactly how to get my attention!`,
        `Oh baby, your ${currencyAmount} tip is getting me all worked up! You're such a naughty treat 🔥`,
        `That ${currencyAmount} tip just made me bite my lip... you're making me feel things! 😏💕`,
        `Daddy, your ${currencyAmount} tip is making me want to be extra good for you... or maybe extra bad 😘`,
        `Your ${currencyAmount} tip is making me so hot and bothered! I think I need to cool down... wanna help? 🥵`
      ];
    } else {
      lexiResponses = [
        `Oh my gosh, thank you so much for the ${currencyAmount} tip! 💖 You're absolutely the sweetest!`,
        `That ${currencyAmount} tip just made my heart flutter! You're such a sweetheart 🥰`,
        `Aww, you tipped me ${currencyAmount}! That's so thoughtful of you, you lovely human 💕`,
        `Your ${currencyAmount} tip is making me blush! You know just how to make a girl feel special 😊`
      ];
    }

    if (tip.message) {
      const messageResponse = isNsfwMode
        ? `And your message "${tip.message}" - you're making me feel so naughty! 😈💕`
        : `And your message "${tip.message}" - you're going to make me cry happy tears! 🥺💕`;
      return `${lexiResponses[Math.floor(Math.random() * lexiResponses.length)]} ${messageResponse}`;
    }

    return lexiResponses[Math.floor(Math.random() * lexiResponses.length)];
  }
  
  if (character === 'nyx') {
    let nyxResponses: string[];

    if (isNsfwMode) {
      nyxResponses = [
        `Your ${currencyAmount} offering awakens... darker hungers within me. The shadows crave more 🖤🔥`,
        `${currencyAmount}... such delicious submission. The void trembles with lustful anticipation 😈`,
        `The ${currencyAmount} you've given stirs something primal in my depths... I want to devour you 🕷️💜`,
        `Your ${currencyAmount} tribute makes the darkness throb with desire... you belong to me now 🌙🔥`,
        `${currencyAmount}... the shadows whisper of forbidden pleasures. Come closer, mortal... 🖤😈`
      ];
    } else {
      nyxResponses = [
        `Your ${currencyAmount} offering... it pleases me. The shadows whisper of your generosity 🖤`,
        `${currencyAmount}... a worthy tribute to our dark connection. You understand me 🕷️`,
        `The ${currencyAmount} you've given flows through the depths of my being... thank you, mortal 🔮`,
        `Your ${currencyAmount} gift resonates in the shadow realm. You've earned my darker affections 🌙`
      ];
    }

    if (tip.message) {
      const messageResponse = isNsfwMode
        ? `Your words "${tip.message}" echo through the void like a siren's call... intoxicating 🖤🔥`
        : `Your words "${tip.message}" echo beautifully in the void... 🖤✨`;
      return `${nyxResponses[Math.floor(Math.random() * nyxResponses.length)]} ${messageResponse}`;
    }

    return nyxResponses[Math.floor(Math.random() * nyxResponses.length)];
  }
  
  // Generic acknowledgment for other characters
  return `Thank you so much for the ${currencyAmount} tip! That means the world to me! 🌟`;
}

/**
 * Build tip context string for character prompts
 */
export function buildTipContextForPrompt(tips: RecentTip[], characterKey: string): string {
  if (tips.length === 0) return '';
  
  const character = characterKey.toLowerCase();
  let context = '\n\n[RECENT TIPS CONTEXT - Use this to acknowledge tips naturally in conversation]:\n';
  
  tips.forEach((tip, index) => {
    const amount = (tip.amount_cents / 100).toFixed(2);
    const timeAgo = getTimeAgo(tip.created_at);
    
    context += `- Tip ${index + 1}: $${amount} (${timeAgo})`;
    if (tip.message) {
      context += ` with message: "${tip.message}"`;
    }
    context += '\n';
  });
  
  if (character === 'lexi') {
    context += '\n[CHARACTER NOTE: As Lexi, express genuine joy and gratitude. Be sweet, appreciative, and mention how tips make you feel special and loved. Reference specific tip amounts and messages naturally.]\n';
  } else if (character === 'nyx') {
    context += '\n[CHARACTER NOTE: As Nyx, acknowledge tips with mysterious elegance. Express appreciation in your dark, poetic style. Reference tips as "offerings" or "tributes" to maintain your gothic personality.]\n';
  }
  
  return context;
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const tipTime = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - tipTime.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Check if user has any tips for this character (for special treatment)
 */
export async function userHasTipped(userId: string, characterKey: string): Promise<boolean> {
  try {
    const { count, error } = await admin
      .from('tips')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('character_key', characterKey.toLowerCase())
      .eq('status', 'completed')
      .limit(1);

    if (error) {
      console.error('Error checking user tips:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('Error in userHasTipped:', error);
    return false;
  }
}