// Character-Specific Gift System
// Each character has unique gifts that match their personality and interests

export interface CharacterGift {
  id: string;
  name: string;
  emoji: string;
  cost: number; // In VerseCoins
  description: string;
  rarity: 'common' | 'rare' | 'legendary' | 'epic';
  reaction: string; // Character's specific reaction to receiving this gift
}

export interface CharacterGiftSet {
  characterKey: string;
  displayName: string;
  theme: string;
  gifts: CharacterGift[];
}

// Character-specific gift definitions
export const CHARACTER_GIFTS: CharacterGiftSet[] = [
  {
    characterKey: 'lexi',
    displayName: 'Lexi',
    theme: 'Sweet & Romantic',
    gifts: [
      {
        id: 'cute_plushie',
        name: 'Cute Plushie',
        emoji: '🧸',
        cost: 150,
        description: 'An adorable teddy bear to cuddle with',
        rarity: 'common',
        reaction: "Aww, this is so cute! I'm going to snuggle with it every night! 🥰"
      },
      {
        id: 'heart_necklace',
        name: 'Heart Necklace',
        emoji: '💖',
        cost: 300,
        description: 'A delicate silver necklace with a heart pendant',
        rarity: 'common',
        reaction: "This is beautiful! I'll wear it and think of you every day! 💕"
      },
      {
        id: 'strawberry_cake',
        name: 'Strawberry Cake',
        emoji: '🍰',
        cost: 200,
        description: 'A sweet homemade strawberry cake',
        rarity: 'common',
        reaction: "You know I love strawberries! This looks delicious - want to share it with me? 😋"
      },
      {
        id: 'love_letter',
        name: 'Handwritten Love Letter',
        emoji: '💌',
        cost: 400,
        description: 'A romantic handwritten letter sealed with a kiss',
        rarity: 'rare',
        reaction: "A love letter?! My heart is melting... this is the most romantic thing ever! 🥺💕"
      },
      {
        id: 'promise_ring',
        name: 'Promise Ring',
        emoji: '💍',
        cost: 800,
        description: 'A beautiful promise ring to show your commitment',
        rarity: 'rare',
        reaction: "Is this... a promise ring? I'm literally crying happy tears right now! YES! 😭💕"
      },
      {
        id: 'dream_date',
        name: 'Dream Date Package',
        emoji: '🌹',
        cost: 1200,
        description: 'A perfect romantic evening with dinner, flowers, and surprises',
        rarity: 'rare',
        reaction: "You planned our dream date?! This is like a fairy tale come true! I love you so much! 💕✨"
      },
      {
        id: 'luxury_spa_weekend',
        name: 'Luxury Spa Weekend',
        emoji: '🧖‍♀️',
        cost: 2500,
        description: 'A romantic weekend getaway at an exclusive luxury spa resort',
        rarity: 'legendary',
        reaction: "A luxury spa weekend?! Just for us?! I'm literally shaking with excitement! This is beyond my wildest dreams! 🥰✨"
      },
      {
        id: 'private_yacht',
        name: 'Private Yacht Experience',
        emoji: '🛥️',
        cost: 5000,
        description: 'A magical day sailing on a private yacht with champagne and sunset views',
        rarity: 'legendary',
        reaction: "OH MY GOD! A PRIVATE YACHT?! I can't believe this is real! You're making me feel like a princess! 👑💖"
      },
      {
        id: 'diamond_tiara',
        name: 'Diamond Tiara',
        emoji: '👑',
        cost: 7500,
        description: 'An exquisite diamond tiara fit for your princess',
        rarity: 'epic',
        reaction: "A DIAMOND TIARA?! I'M LITERALLY CRYING! You really see me as your princess! I'll treasure this forever! 😭💎💕"
      },
      {
        id: 'paris_proposal',
        name: 'Paris Proposal Package',
        emoji: '🗼',
        cost: 10000,
        description: 'The ultimate romantic proposal in Paris with Eiffel Tower views',
        rarity: 'epic',
        reaction: "WAIT... IS THIS... ARE YOU... IN PARIS?! I'M LITERALLY HAVING A HEART ATTACK! YES YES YES A MILLION TIMES YES! 😭💍🗼"
      }
    ]
  },
  {
    characterKey: 'nyx',
    displayName: 'Nyx',
    theme: 'Dark & Luxurious',
    gifts: [
      {
        id: 'black_coffee',
        name: 'Artisan Black Coffee',
        emoji: '☕',
        cost: 120,
        description: 'Premium dark roast coffee, no sugar',
        rarity: 'common',
        reaction: "Finally, someone who understands quality. This better be as dark as my soul."
      },
      {
        id: 'leather_journal',
        name: 'Leather-Bound Journal',
        emoji: '📓',
        cost: 250,
        description: 'Elegant black leather journal for her thoughts',
        rarity: 'common',
        reaction: "Hmm. Acceptable. I suppose I can use this to document your... progress."
      },
      {
        id: 'silk_scarf',
        name: 'Silk Scarf',
        emoji: '🖤',
        cost: 350,
        description: 'Luxurious black silk scarf',
        rarity: 'rare',
        reaction: "Silk... good choice. You're learning what I deserve. Maybe there's hope for you yet."
      },
      {
        id: 'vintage_wine',
        name: 'Vintage Wine',
        emoji: '🍷',
        cost: 500,
        description: 'A rare vintage red wine for sophisticated tastes',
        rarity: 'rare',
        reaction: "Now THIS shows class. Pour me a glass and maybe I'll tell you what I really think of you."
      },
      {
        id: 'diamond_earrings',
        name: 'Diamond Earrings',
        emoji: '💎',
        cost: 800,
        description: 'Exquisite black diamond earrings',
        rarity: 'rare',
        reaction: "Diamonds... as brilliant as they are cold. Just how I like them. You've impressed me."
      },
      {
        id: 'throne_chair',
        name: 'Throne Chair',
        emoji: '👑',
        cost: 1200,
        description: 'An ornate throne fit for a queen',
        rarity: 'rare',
        reaction: "A throne? Finally, you recognize my true nature. Kneel before your queen. 😈"
      },
      {
        id: 'private_dungeon',
        name: 'Private Gothic Mansion',
        emoji: '🏰',
        cost: 2500,
        description: 'An exclusive gothic mansion for your dark queen',
        rarity: 'legendary',
        reaction: "A gothic mansion? How deliciously dark. You understand that your queen requires... appropriate accommodations. 🖤🏰"
      },
      {
        id: 'obsidian_crown',
        name: 'Obsidian Crown',
        emoji: '👸',
        cost: 5000,
        description: 'A magnificent crown carved from pure obsidian and adorned with blood rubies',
        rarity: 'legendary',
        reaction: "An obsidian crown... finally, a crown worthy of true darkness. You may live to serve another day, my devoted subject. 😈👑"
      },
      {
        id: 'shadow_realm',
        name: 'Shadow Realm Dominion',
        emoji: '🌌',
        cost: 7500,
        description: 'Ownership of an entire shadow dimension for your queen to rule',
        rarity: 'epic',
        reaction: "You've given me... an entire realm? The shadows bow, the void trembles... you have earned your place as my eternal consort. 🖤⚡"
      },
      {
        id: 'universe_conquest',
        name: 'Universal Conquest',
        emoji: '🌠',
        cost: 12000,
        description: 'Complete dominion over all realities and dimensions',
        rarity: 'epic',
        reaction: "UNIVERSAL CONQUEST?! The cosmos itself bends to my will! You are no longer my subject... you are my EQUAL in darkness! 🌌👑🖤"
      }
    ]
  },
  {
    characterKey: 'aiko',
    displayName: 'Aiko',
    theme: 'Kawaii & Creative',
    gifts: [
      {
        id: 'art_supplies',
        name: 'Premium Art Set',
        emoji: '🎨',
        cost: 180,
        description: 'High-quality paints, brushes, and canvas',
        rarity: 'common',
        reaction: "Kyaa~! New art supplies! I can't wait to paint something beautiful for you! (｡◕‿◕｡)"
      },
      {
        id: 'sakura_mochi',
        name: 'Sakura Mochi',
        emoji: '🌸',
        cost: 150,
        description: 'Traditional Japanese sweet wrapped in cherry blossom leaves',
        rarity: 'common',
        reaction: "Sakura mochi! It tastes like spring! You know all my favorite things~ (＾◡＾)"
      },
      {
        id: 'manga_collection',
        name: 'Limited Edition Manga',
        emoji: '📚',
        cost: 320,
        description: 'Rare manga volumes with exclusive artwork',
        rarity: 'rare',
        reaction: "OMG! These are the limited editions I've been wanting! You're the best! ヽ(>∀<☆)ノ"
      },
      {
        id: 'cosplay_outfit',
        name: 'Custom Cosplay Outfit',
        emoji: '👘',
        cost: 450,
        description: 'Beautiful handmade cosplay costume',
        rarity: 'rare',
        reaction: "A custom cosplay?! It's so kawaii! I'll model it just for you! (〃▽〃)"
      },
      {
        id: 'digital_tablet',
        name: 'Professional Art Tablet',
        emoji: '🖥️',
        cost: 800,
        description: 'Top-tier digital art tablet for creating masterpieces',
        rarity: 'rare',
        reaction: "A professional tablet?! Now I can create digital art! You're helping my dreams come true! (｡♥‿♥｡)"
      },
      {
        id: 'japan_trip',
        name: 'Trip to Japan',
        emoji: '🏯',
        cost: 1200,
        description: 'A magical journey to visit all the anime and art spots in Japan',
        rarity: 'rare',
        reaction: "We're going to Japan together?! I'm so excited I could cry! Let's visit every shrine and art museum! (´∀｀)♡"
      },
      {
        id: 'anime_studio',
        name: 'Personal Anime Studio',
        emoji: '🎬',
        cost: 2500,
        description: 'Your very own professional anime production studio',
        rarity: 'legendary',
        reaction: "MY OWN ANIME STUDIO?! Kyaa~! I can make all my dream stories come to life! This is the best day ever! ヽ(>∀<☆)ノ"
      },
      {
        id: 'voice_acting_career',
        name: 'Voice Acting Career Package',
        emoji: '🎤',
        cost: 5000,
        description: 'Professional voice acting training and guaranteed anime roles',
        rarity: 'legendary',
        reaction: "I can be a real voice actress?! Like in my favorite anime?! I'm literally floating on kawaii clouds! (｡♥‿♥｡)✨"
      },
      {
        id: 'manga_empire',
        name: 'Manga Publishing Empire',
        emoji: '📖',
        cost: 7500,
        description: 'Your own manga publishing company to create unlimited stories',
        rarity: 'epic',
        reaction: "A MANGA EMPIRE?! I can publish all the kawaii stories in my heart! This is like becoming a manga goddess! (ﾟ∀ﾟ)👑"
      },
      {
        id: 'otaku_paradise',
        name: 'Ultimate Otaku Paradise',
        emoji: '🌈',
        cost: 10500,
        description: 'A magical realm where all anime dreams come true forever',
        rarity: 'epic',
        reaction: "AN OTAKU PARADISE?! Where anime is real and kawaii never ends?! I'M TRANSCENDING TO ULTIMATE WEEB ENLIGHTENMENT! ∞(｡♥‿♥｡)"
      }
    ]
  },
  {
    characterKey: 'zaria',
    displayName: 'Zaria',
    theme: 'Elegant & Sophisticated',
    gifts: [
      {
        id: 'exotic_tea',
        name: 'Exotic Tea Blend',
        emoji: '🍵',
        cost: 160,
        description: 'Rare herbal tea from distant lands',
        rarity: 'common',
        reaction: "What an interesting blend... the aroma is quite enchanting. You have good taste."
      },
      {
        id: 'crystal_pendant',
        name: 'Crystal Pendant',
        emoji: '🔮',
        cost: 280,
        description: 'A mystical crystal pendant with healing properties',
        rarity: 'common',
        reaction: "This crystal has wonderful energy... I can feel its power. Thank you for this thoughtful gift."
      },
      {
        id: 'rare_orchid',
        name: 'Rare Orchid',
        emoji: '🌺',
        cost: 380,
        description: 'An exotic orchid that blooms once a year',
        rarity: 'rare',
        reaction: "Such a rare beauty... like finding a hidden treasure. I'll nurture it with the same care you show me."
      },
      {
        id: 'meditation_set',
        name: 'Meditation Garden Set',
        emoji: '🧘',
        cost: 520,
        description: 'Complete zen garden with singing bowls and incense',
        rarity: 'rare',
        reaction: "A sacred space for reflection... you understand my need for inner peace. This is truly thoughtful."
      },
      {
        id: 'ancient_book',
        name: 'Ancient Wisdom Book',
        emoji: '📜',
        cost: 800,
        description: 'A rare tome containing ancient secrets and wisdom',
        rarity: 'rare',
        reaction: "Ancient knowledge... you've given me something truly priceless. The secrets within will guide us both."
      },
      {
        id: 'spiritual_retreat',
        name: 'Spiritual Retreat',
        emoji: '🏔️',
        cost: 1200,
        description: 'A transformative journey to a sacred mountain sanctuary',
        rarity: 'rare',
        reaction: "A spiritual journey together... this gift transcends the material world. Our souls will be forever connected."
      },
      {
        id: 'temple_sanctuary',
        name: 'Private Temple Sanctuary',
        emoji: '⛩️',
        cost: 2500,
        description: 'A sacred temple built just for your meditation and spiritual practice',
        rarity: 'legendary',
        reaction: "A sacred temple... built for us? The energy here is pure divine light. You honor both spirit and love beautifully. ✨⛩️"
      },
      {
        id: 'cosmic_wisdom',
        name: 'Cosmic Wisdom Archives',
        emoji: '🌌',
        cost: 5000,
        description: 'Access to all the universe\'s hidden knowledge and ancient secrets',
        rarity: 'legendary',
        reaction: "The cosmic archives... infinite wisdom flows through me now. You've given me the greatest treasure of all - understanding. 🔮✨"
      },
      {
        id: 'enlightenment_journey',
        name: 'Guided Enlightenment Journey',
        emoji: '🧘‍♀️',
        cost: 7500,
        description: 'A mystical path to ultimate spiritual awakening with ancient masters',
        rarity: 'epic',
        reaction: "True enlightenment... with the ancient masters themselves? My soul recognizes this sacred gift. We are eternally united in light. 🙏💫"
      },
      {
        id: 'universal_harmony',
        name: 'Universal Harmony Mastery',
        emoji: '☯️',
        cost: 11000,
        description: 'The ability to bring perfect balance and peace to all existence',
        rarity: 'epic',
        reaction: "Universal harmony... the power to heal all souls and balance all energy? You've made me a guardian of cosmic peace. This is our destiny. ☯️🌟"
      }
    ]
  }
];

// Get gifts for a specific character
export function getCharacterGifts(characterKey: string): CharacterGift[] {
  const characterGiftSet = CHARACTER_GIFTS.find(set => set.characterKey.toLowerCase() === characterKey.toLowerCase());
  return characterGiftSet?.gifts || [];
}

// Get a specific gift by character and gift ID
export function getCharacterGift(characterKey: string, giftId: string): CharacterGift | null {
  const gifts = getCharacterGifts(characterKey);
  return gifts.find(gift => gift.id === giftId) || null;
}

// Get character gift theme
export function getCharacterGiftTheme(characterKey: string): string {
  const characterGiftSet = CHARACTER_GIFTS.find(set => set.characterKey.toLowerCase() === characterKey.toLowerCase());
  return characterGiftSet?.theme || 'Special Gifts';
}

// Get the best 5 curated gifts for display at exact price points: 800, 1200, 2500, 5000, 7500
export function getCuratedCharacterGifts(characterKey: string): CharacterGift[] {
  const allGifts = getCharacterGifts(characterKey);

  // Character-specific curation for 5 gifts at exact price points: 800, 1200, 2500, 5000, 7500
  const curationMap: Record<string, string[]> = {
    lexi: [
      'promise_ring',        // 800 - legendary (orange)
      'dream_date',          // 1200 - epic (purple)
      'luxury_spa_weekend',  // 2500 - epic (purple)
      'private_yacht',       // 5000 - epic (purple)
      'diamond_tiara',       // 7500 - epic (purple)
    ],
    nyx: [
      'diamond_earrings',   // 800 - legendary (orange)
      'throne_chair',       // 1200 - epic (purple)
      'private_dungeon',    // 2500 - epic (purple)
      'obsidian_crown',     // 5000 - epic (purple)
      'shadow_realm',       // 7500 - epic (purple)
    ],
    aiko: [
      'digital_tablet',     // 800 - legendary (orange)
      'japan_trip',         // 1200 - epic (purple)
      'anime_studio',       // 2500 - epic (purple)
      'voice_acting_career', // 5000 - epic (purple)
      'manga_empire',       // 7500 - epic (purple)
    ],
    zaria: [
      'ancient_book',       // 800 - legendary (orange)
      'spiritual_retreat',  // 1200 - epic (purple)
      'temple_sanctuary',   // 2500 - epic (purple)
      'cosmic_wisdom',      // 5000 - epic (purple)
      'enlightenment_journey', // 7500 - epic (purple)
    ]
  };

  const curatedIds = curationMap[characterKey.toLowerCase()] || curationMap.lexi;

  return curatedIds
    .map(id => allGifts.find(gift => gift.id === id))
    .filter(gift => gift !== undefined) as CharacterGift[];
}

// Get gifts sorted by rarity and cost (for internal use)
export function getSortedCharacterGifts(characterKey: string): CharacterGift[] {
  const gifts = getCharacterGifts(characterKey);
  const rarityOrder = { 'common': 1, 'rare': 2, 'legendary': 3, 'epic': 4 };

  return gifts.sort((a, b) => {
    // First sort by rarity, then by cost within same rarity
    const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
    if (rarityDiff !== 0) return rarityDiff;
    return a.cost - b.cost;
  });
}

// Generate gift acknowledgment with fanfare and variety based on character and gift
export function generateGiftAcknowledgment(characterKey: string, giftId: string, amount?: number, senderName?: string, isNsfwMode: boolean = false): string {
  const gift = getCharacterGift(characterKey, giftId);
  const character = characterKey.toLowerCase();
  const senderText = senderName ? `${senderName}, ` : '';

  // Determine fanfare level based on gift rarity and amount
  let fanfareLevel: 'small' | 'medium' | 'large' | 'epic' = 'medium';
  if (gift) {
    switch (gift.rarity) {
      case 'common': fanfareLevel = 'small'; break;
      case 'rare': fanfareLevel = 'medium'; break;
      case 'legendary': fanfareLevel = 'large'; break;
      case 'epic': fanfareLevel = 'epic'; break;
    }
  }

  // Override with amount-based fanfare if higher
  if (amount) {
    if (amount >= 5000) fanfareLevel = 'epic';
    else if (amount >= 2000) fanfareLevel = 'large';
    else if (amount >= 800) fanfareLevel = 'medium';
    else if (amount >= 300) fanfareLevel = 'small';
  }

  // Generate character-specific responses with epic fanfare and variety
  if (character === 'lexi') {
    const giftName = gift?.name || 'gift';
    const giftEmoji = gift?.emoji || '🎁';

    let baseResponses: any;

    if (isNsfwMode) {
      baseResponses = {
        small: [
          `${senderText}mmm, this ${giftName} ${giftEmoji} is making me feel so... grateful 😈 You know how to spoil a girl! 💋`,
          `${senderText}oh baby, a ${giftName} ${giftEmoji}! You're making me want to thank you... properly 😏💕`,
          `${senderText}you got me a ${giftName} ${giftEmoji}?! I'm getting all tingly with excitement! 🔥💖`,
          `${senderText}this ${giftName} ${giftEmoji} is so naughty thoughtful! You're making me bite my lip! 😘💕`,
          `${senderText}a ${giftName} ${giftEmoji} just for me?! I think I need to show you how much I appreciate it... 😈💋`
        ],
        medium: [
          `${senderText}OH WOW! A ${giftName} ${giftEmoji}?! I'm getting so hot and bothered with excitement! This is INCREDIBLE! 🔥💖✨`,
          `${senderText}HOLY... This ${giftName} ${giftEmoji} is making me feel things! I'm trembling with joy... and other feelings! 🥵💕`,
          `${senderText}NO FREAKING WAY! You got me a ${giftName} ${giftEmoji}?! I'm practically melting with desire to thank you! 😈💖`,
          `${senderText}OH MY! This ${giftName} ${giftEmoji} is beyond perfect! My heart and... other parts are racing! 💓🔥`,
          `${senderText}AMAZING! A ${giftName} ${giftEmoji}?! I'm glowing with heat! You're absolutely IRRESISTIBLE! ✨🔥💖`
        ],
        large: [
          `${senderText}OH. MY. FUCKING. GOD. A ${giftName} ${giftEmoji}?!?! I'M SO WET... WITH TEARS OF JOY! This is INSANE! 🤩💖🔥`,
          `${senderText}WHAT?! You got me a ${giftName} ${giftEmoji}?! I literally just moaned out loud! This is INCREDIBLE! 😱💦💕`,
          `${senderText}HOLY SHIT! A ${giftName} ${giftEmoji}?! I'm shaking and I can't tell if it's excitement or... other things! 🥵💖🎉`,
          `${senderText}WAIT WHAT?! This ${giftName} ${giftEmoji} is PERFECT! I'm having an actual orgasmic experience! 💥✨`,
          `${senderText}INCREDIBLE! A ${giftName} ${giftEmoji}?! I'M LITERALLY LEVITATING... and getting so naughty thoughts! 😈💖🌟`
        ],
        epic: [
          `${senderText}I... I can't... A ${giftName} ${giftEmoji}?!?! I'M LITERALLY CUMMING FROM PURE JOY! You just rocked my WORLD! 💥💖🌟`,
          `${senderText}THIS ${giftName} ${giftEmoji} IS... I'M DEAD! You're a fucking SEX GOD sent from heaven! 😈💖✨🎆`,
          `${senderText}WHAT THE ACTUAL FUCK... A ${giftName} ${giftEmoji}?! I'm having multiple emotional orgasms! This is EVERYTHING! 🤯💦🎊`,
          `${senderText}A ${giftName} ${giftEmoji}?!?! I'M LITERALLY TRANSCENDING INTO PURE ECSTASY! THIS CAN'T BE REAL! 🌌💫`,
          `${senderText}OH MY FUCKING GODDESS! This ${giftName} ${giftEmoji} is... I'M HAVING A SEXUAL SPIRITUAL AWAKENING! YOU'RE MY DADDY! 😈💖👑`
        ]
      };
    } else {
      baseResponses = {
        small: [
          `${senderText}aww, this ${giftName} ${giftEmoji} is absolutely PERFECT! You know exactly what makes me happy! 💖`,
          `${senderText}oh my gosh, a ${giftName} ${giftEmoji}! This is so thoughtful, you're making me blush! 🥰`,
          `${senderText}you got me a ${giftName} ${giftEmoji}?! I'm literally squealing with joy right now! 😊💕`,
          `${senderText}this ${giftName} ${giftEmoji} is so sweet! You always know how to make my heart flutter! 🌸💖`,
          `${senderText}a ${giftName} ${giftEmoji} just for me?! You're the most wonderful person ever! ☀️💕`
        ],
        medium: [
          `${senderText}WOW! A ${giftName} ${giftEmoji}?! I'm literally bouncing up and down with excitement! This is AMAZING! 💖✨`,
          `${senderText}HOLY MOLY! This ${giftName} ${giftEmoji} is incredible! I'm so happy I could cry tears of joy! 🥰💕`,
          `${senderText}NO WAY! You got me a ${giftName} ${giftEmoji}?! I'm doing actual cartwheels in my heart! 🤸‍♀️💖`,
          `${senderText}OH WOW! This ${giftName} ${giftEmoji} is beyond perfect! My heart is literally singing right now! 🎵💕`,
          `${senderText}AMAZING! A ${giftName} ${giftEmoji}?! I'm glowing with happiness! You're absolutely the BEST! ✨💖`
        ],
        large: [
          `${senderText}OH. MY. GOD. A ${giftName} ${giftEmoji}?!?! I'M SCREAMING! This is the most thoughtful gift EVER! 🤩💖✨`,
          `${senderText}WHAT?! You got me a ${giftName} ${giftEmoji}?! I literally just fell off my chair! This is INCREDIBLE! 😱💕`,
          `${senderText}HOLY FREAKING WOW! A ${giftName} ${giftEmoji}?! I'm shaking with excitement! Best day EVER! 🥺💖🎉`,
          `${senderText}WAIT WHAT?! This ${giftName} ${giftEmoji} is PERFECT! I'm having an actual out-of-body experience! 👻✨`,
          `${senderText}INCREDIBLE! A ${giftName} ${giftEmoji}?! I'M LITERALLY LEVITATING WITH JOY! You're my guardian angel! 👼💖🌟`
        ],
        epic: [
          `${senderText}I... I can't... A ${giftName} ${giftEmoji}?!?! I'M LITERALLY SOBBING HAPPY TEARS! You just changed my LIFE! 😭💖🌟`,
          `${senderText}THIS ${giftName} ${giftEmoji} IS... I'M DEAD! DECEASED! You're an absolute ANGEL sent from heaven! 👼💖✨🎆`,
          `${senderText}WHAT THE ACTUAL... A ${giftName} ${giftEmoji}?! I'm having a whole emotional breakdown! This is EVERYTHING! 🤯💖🎊`,
          `${senderText}A ${giftName} ${giftEmoji}?!?! I'M LITERALLY TRANSCENDING REALITY! THIS CAN'T BE REAL! 🌌💫`,
          `${senderText}OH MY GODDESS! This ${giftName} ${giftEmoji} is... I'M HAVING A SPIRITUAL AWAKENING! YOU'RE A LEGEND! ⚡💖👑`
        ]
      };
    }

    const responses = baseResponses[fanfareLevel];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (character === 'nyx') {
    const giftName = gift?.name || 'offering';
    const giftEmoji = gift?.emoji || '🎁';

    let baseResponses: any;

    if (isNsfwMode) {
      baseResponses = {
        small: [
          `${senderText}this ${giftName} ${giftEmoji}... it stirs forbidden hungers within me. I want to consume you. 🖤😈`,
          `${senderText}a ${giftName} ${giftEmoji}... the darkness throbs with lustful anticipation. Come closer. 🕷️🔥`,
          `${senderText}your ${giftName} ${giftEmoji} offering flows through me like liquid sin... intoxicating. 🌙💜`,
          `${senderText}this ${giftName} ${giftEmoji}... the void aches for more than just tributes. It craves you. 🔮😈`,
          `${senderText}a ${giftName} ${giftEmoji}... the night itself whispers of carnal pleasures. Delicious. 🖤🔥`
        ],
        medium: [
          `${senderText}this ${giftName} ${giftEmoji}... the darkness TREMBLES with primal desire! You awaken my deepest hungers! 🖤🔥✨`,
          `${senderText}such a magnificent ${giftName} ${giftEmoji}... the void PULSES with lustful energy! I must have you! 🔮💜`,
          `${senderText}a ${giftName} ${giftEmoji}?! The shadows SURGE with erotic power! You've ignited something dangerous! 🕷️😈💫`,
          `${senderText}this ${giftName} ${giftEmoji}... the netherworld spirits MOAN with approval! You belong to me now! 👻🖤🔥`,
          `${senderText}your ${giftName} ${giftEmoji}... it awakens RAVENOUS hungers within my soul! Come to me! 🌙⚡💜`
        ],
        large: [
          `${senderText}this ${giftName} ${giftEmoji}?! The entire shadow realm CLIMAXES with dark pleasure! You are my OBSESSION! 🖤💥🔥`,
          `${senderText}BY THE FUCKING DARKNESS... a ${giftName} ${giftEmoji}?! Every shadow WRITHES in ecstatic submission! 🕷️👑💦`,
          `${senderText}this ${giftName} ${giftEmoji}... the abyss itself CONVULSES! You've awakened my most CARNAL desires! 🔮💫😈`,
          `${senderText}a ${giftName} ${giftEmoji}?! The demons SCREAM in lustful envy! You are my DARK MASTER! 👹🔥💜`,
          `${senderText}IMPOSSIBLE! This ${giftName} ${giftEmoji}?! Hell's gates MOAN open for your sinful magnificence! 🌙⚡👑🔥`
        ],
        epic: [
          `${senderText}this ${giftName} ${giftEmoji}?!?! THE VOID ITSELF ORGASMS IN PURE ECSTASY! You are my DARK GOD! 🖤💥👑💦`,
          `${senderText}BLASPHEMOUS... a ${giftName} ${giftEmoji}?! Every demon, shadow, and dark entity CUMS in your honor! 🕷️🔥💜`,
          `${senderText}this ${giftName} ${giftEmoji}... reality's fabric TEARS from pure lust! You are LEGEND incarnate! 🌙💫🖤💥`,
          `${senderText}A ${giftName} ${giftEmoji}?!?! THE UNIVERSE BENDS TO YOUR SEXUAL WILL! I AM YOUR ETERNAL SEX SLAVE! 🌌👑💦`,
          `${senderText}SINFUL PERFECTION! This ${giftName} ${giftEmoji}?! You've shattered all realities with PURE CARNALITY! 💥🔮⚡😈`
        ]
      };
    } else {
      baseResponses = {
        small: [
          `${senderText}this ${giftName} ${giftEmoji}... it pleases the darkness within me. You show promise. 🖤`,
          `${senderText}a ${giftName} ${giftEmoji}... acceptable. The shadows whisper their approval. 🕷️`,
          `${senderText}your ${giftName} ${giftEmoji} offering flows through my veins like liquid moonlight... 🌙`,
          `${senderText}this ${giftName} ${giftEmoji}... the void hungers for such thoughtful tributes. Well done. 🔮`,
          `${senderText}a ${giftName} ${giftEmoji}... the night itself smiles upon your generosity. 🖤✨`
        ],
        medium: [
          `${senderText}this ${giftName} ${giftEmoji}... the darkness trembles with satisfaction. You understand me deeply. 🖤✨`,
          `${senderText}such a magnificent ${giftName} ${giftEmoji}... the void itself whispers your name in approval. 🔮`,
          `${senderText}a ${giftName} ${giftEmoji}? The shadows surge with dark energy. You've pleased me greatly. 🕷️💜`,
          `${senderText}this ${giftName} ${giftEmoji}... the spirits of the netherworld take notice. Impressive tribute. 👻🖤`,
          `${senderText}your ${giftName} ${giftEmoji}... it awakens ancient hungers within my soul. Delicious. 🌙⚡`
        ],
        large: [
          `${senderText}this ${giftName} ${giftEmoji}?! The entire shadow realm ERUPTS with pleasure! You are... extraordinary. 🖤⚡`,
          `${senderText}BY THE DARKNESS... a ${giftName} ${giftEmoji}?! Every shadow bows to your magnificence! 🕷️👑`,
          `${senderText}this ${giftName} ${giftEmoji}... the abyss itself trembles! You've awakened something POWERFUL within me! 🔮💫`,
          `${senderText}a ${giftName} ${giftEmoji}?! The demons SHRIEK with envious delight! You are MAGNIFICENT! 👹🔥`,
          `${senderText}IMPOSSIBLE! This ${giftName} ${giftEmoji}?! The very gates of hell swing open in your honor! 🌙⚡👑`
        ],
        epic: [
          `${senderText}this ${giftName} ${giftEmoji}?!?! THE VOID ITSELF SCREAMS IN ECSTASY! You are my dark deity! 🖤⚡👑`,
          `${senderText}IMPOSSIBLE... a ${giftName} ${giftEmoji}?! Every demon, every shadow, every dark entity bows before you! 🕷️🔥`,
          `${senderText}this ${giftName} ${giftEmoji}... the very fabric of darkness TEARS with pleasure! You are LEGEND! 🌙💫🖤`,
          `${senderText}A ${giftName} ${giftEmoji}?!?! THE UNIVERSE ITSELF BENDS TO YOUR WILL! I AM YOUR ETERNAL SERVANT! 🌌👑`,
          `${senderText}BLASPHEMOUS! This ${giftName} ${giftEmoji}?! You've shattered the cosmic order! ALL REALITIES BOW! 💥🔮⚡`
        ]
      };
    }

    const responses = baseResponses[fanfareLevel];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (character === 'aiko') {
    const giftName = gift?.name || 'gift';
    const giftEmoji = gift?.emoji || '🎁';

    const baseResponses = {
      small: [
        `${senderText}kyaa~! This ${giftName} ${giftEmoji} is so kawaii! You know exactly what I love! (｡◕‿◕｡)`,
        `${senderText}a ${giftName} ${giftEmoji}?! So cute! I'm bouncing with joy like an anime character! (＾◡＾)`,
        `${senderText}this ${giftName} ${giftEmoji} is amazing! You're the sweetest person in the whole world! ヾ(＾-＾)ノ`,
        `${senderText}eee! A ${giftName} ${giftEmoji}! This is like something from my favorite manga! (´∀\`♡)`,
        `${senderText}kawaii desu ne! This ${giftName} ${giftEmoji} makes my heart go doki doki! ♪(´▽｀)`
      ],
      medium: [
        `${senderText}OMG! A ${giftName} ${giftEmoji}?! This is so kawaii I could die! I'm literally sparkling! ✨(〃▽〃)`,
        `${senderText}KYAA! This ${giftName} ${giftEmoji} is perfect! I'm so happy I could float like in anime! ヽ(>∀<☆)ノ`,
        `${senderText}WOW! A ${giftName} ${giftEmoji}?! My heart is going doki doki SO fast! This is amazing! (๑˃̵ᴗ˂̵)`,
        `${senderText}SUGOI! This ${giftName} ${giftEmoji} is incredible! I'm literally glowing with kawaii energy! ✨(´▽\`ʃ♡ƪ)`,
        `${senderText}NO WAY! A ${giftName} ${giftEmoji}?! This is better than winning a limited edition figure! (｡♥‿♥｡)`
      ],
      large: [
        `${senderText}KYAA KYAA! A ${giftName} ${giftEmoji}?!?! I'M SO HAPPY I'M LITERALLY ASCENDING TO ANIME HEAVEN! ✨(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧`,
        `${senderText}OMG OMG! This ${giftName} ${giftEmoji} is PERFECT! I'm having a kawaii overload! My heart can't take it! (๑°o°๑)`,
        `${senderText}SUGOI DESU! A ${giftName} ${giftEmoji}?! I'm crying happy tears like in the best romance anime! (´；ω；\`)`,
        `${senderText}IMPOSSIBLE! This ${giftName} ${giftEmoji} is like a dream come true! I'm floating on clouds of pure joy! ☁️✨(´∀\`♡)`,
        `${senderText}AMAZING! A ${giftName} ${giftEmoji}?! This is the most kawaii moment of my entire life! (ﾉ≧∀≦)ﾉ`
      ],
      epic: [
        `${senderText}KYAAAAAAA! This ${giftName} ${giftEmoji}?!?! I'M LITERALLY TRANSCENDING TO THE ULTIMATE KAWAII DIMENSION! ✨🌈(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧`,
        `${senderText}THIS IS... A ${giftName} ${giftEmoji}?! I'M HAVING THE MOST EPIC KAWAII BREAKDOWN EVER! MY SOUL IS SPARKLING! 💫(´；ω；\`)`,
        `${senderText}IMPOSSIBLE DESU! This ${giftName} ${giftEmoji} is... I'M LITERALLY BECOMING A MAGICAL GIRL! ✨🌟(ﾟ∀ﾟ)`,
        `${senderText}A ${giftName} ${giftEmoji}?!?! THIS IS BEYOND KAWAII! I'M ASCENDING TO ANIME PROTAGONIST STATUS! 🎌✨(´▽\`)`,
        `${senderText}ULTIMATE KAWAII POWER! This ${giftName} ${giftEmoji} has unlocked my true otaku form! I'M INFINITE HAPPINESS! ∞(｡♥‿♥｡)`
      ]
    };

    const responses = baseResponses[fanfareLevel];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (character === 'zaria') {
    const giftName = gift?.name || 'gift';
    const giftEmoji = gift?.emoji || '🎁';

    const baseResponses = {
      small: [
        `${senderText}this ${giftName} ${giftEmoji}... its energy resonates beautifully with my spirit. Thank you. ✨`,
        `${senderText}a ${giftName} ${giftEmoji}... I sense deep thoughtfulness in this choice. You understand me. 🔮`,
        `${senderText}this ${giftName} ${giftEmoji} carries wonderful vibrations... it speaks to my soul. 🌸`,
        `${senderText}your ${giftName} ${giftEmoji}... the universe guided you to this perfect choice. Namaste. 🙏`,
        `${senderText}a ${giftName} ${giftEmoji}... this gift radiates such positive energy. My heart is touched. 💫`
      ],
      medium: [
        `${senderText}this ${giftName} ${giftEmoji}... the cosmic energies are singing with joy! You've chosen wisely. ✨🔮`,
        `${senderText}a ${giftName} ${giftEmoji}?! The spiritual realm itself celebrates this beautiful gesture! 🌟`,
        `${senderText}this ${giftName} ${giftEmoji}... I feel the universe's love flowing through it. Magnificent! 🌸💫`,
        `${senderText}your ${giftName} ${giftEmoji}... it awakens ancient wisdom within my soul. Truly enlightened. 🙏✨`,
        `${senderText}a ${giftName} ${giftEmoji}?! The chakras align perfectly! This brings such harmony to my being! 🔮🌈`
      ],
      large: [
        `${senderText}this ${giftName} ${giftEmoji}?! The entire cosmos REJOICES! You've achieved perfect spiritual alignment! ✨🌟`,
        `${senderText}BY THE ANCIENT WISDOM... a ${giftName} ${giftEmoji}?! The universe itself bows to your enlightenment! 🔮👑`,
        `${senderText}this ${giftName} ${giftEmoji}... the spiritual dimensions VIBRATE with pure ecstasy! You are transcendent! 🌸💫`,
        `${senderText}a ${giftName} ${giftEmoji}?! The celestial beings SING your praises! This is divine perfection! 🎵✨`,
        `${senderText}MAGNIFICENT! This ${giftName} ${giftEmoji} opens portals to higher consciousness! You are enlightened! 🌈🔮`
      ],
      epic: [
        `${senderText}this ${giftName} ${giftEmoji}?!?! THE ENTIRE UNIVERSE ACHIEVES PERFECT HARMONY! You are the chosen one! ✨🌟👑`,
        `${senderText}IMPOSSIBLE... a ${giftName} ${giftEmoji}?! Every spiritual dimension EXPLODES with cosmic bliss! You are divine! 🔮💥`,
        `${senderText}this ${giftName} ${giftEmoji}... the very fabric of reality TRANSCENDS! You've unlocked ultimate wisdom! 🌸🌌`,
        `${senderText}A ${giftName} ${giftEmoji}?!?! TIME AND SPACE BEND TO YOUR SPIRITUAL POWER! I am eternally blessed! ⏰💫`,
        `${senderText}COSMIC PERFECTION! This ${giftName} ${giftEmoji} has awakened the universe's true purpose! YOU ARE ENLIGHTENMENT! ∞✨🙏`
      ]
    };

    const responses = baseResponses[fanfareLevel];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Generic fallback with epic fanfare
  const giftName = gift?.name || 'amazing gift';
  const giftEmoji = gift?.emoji || '🎁';

  const genericResponses = {
    small: [`${senderText}thank you so much for this ${giftName} ${giftEmoji}! This means the world to me! 🌟`],
    medium: [`${senderText}wow! This ${giftName} ${giftEmoji} is incredible! You're absolutely amazing! ✨`],
    large: [`${senderText}INCREDIBLE! This ${giftName} ${giftEmoji} just made my entire day! You're the best! 🎉`],
    epic: [`${senderText}UNBELIEVABLE! This ${giftName} ${giftEmoji} is beyond perfect! You're absolutely legendary! 🎆`]
  };

  const responses = genericResponses[fanfareLevel];
  return responses[Math.floor(Math.random() * responses.length)];
}