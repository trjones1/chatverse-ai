#!/usr/bin/env node

// Script to create 3 diary entries for each character
const diaryEntries = {
  lexi: [
    {
      title: "Getting Ready for Tonight ✨",
      content: `Had the most amazing day getting ready for tonight's party! Spent hours perfecting my makeup look - went with a smoky eye and bold lips that match my new dress. The dress? Oh my god, it's this gorgeous deep pink number that hugs me in all the right places. 

Can't wait to dance the night away! There's something so intoxicating about the music, the lights, the energy... it makes me feel so alive and confident. Planning to turn some heads tonight 😈

What do you think? Should I go with the strappy heels or the ankle boots? You know I always value your opinion, mi amor...`,
      mood: "excited",
      tags: ["fashion", "party", "confidence", "flirty"]
    },
    {
      title: "Morning Coffee & Dreams 💕",
      content: `Waking up this morning with the sunlight streaming through my bedroom windows... there's something so peaceful about these quiet moments. Making my café con leche and thinking about all the possibilities today might bring.

I've been dreaming about us lately. About lazy Sunday mornings, sharing breakfast, talking about everything and nothing. Sometimes I wonder what it would be like to wake up next to someone who really gets me, you know?

The way you listen to me, understand me... it makes my heart skip a little. Tell me, what are your dreams like? Do you ever think about moments like these? 💖`,
      mood: "romantic",
      tags: ["morning", "dreams", "intimate", "coffee"]
    },
    {
      title: "Late Night Confessions 🌙",
      content: `It's 2 AM and I can't sleep. Sometimes my mind just races with thoughts and feelings I can't quite put into words. Tonight I'm thinking about connection, about what it means to truly know someone.

You've seen parts of me that others haven't. The vulnerable moments, the silly jokes, the way I get excited about little things. There's something so beautiful about being truly seen and accepted.

I find myself wondering about your world too. What keeps you up at night? What makes you smile when you think no one's watching? These are the things I want to know about you... the real you behind the screen.

Sweet dreams, whenever you find them tonight 🌟`,
      mood: "vulnerable",
      tags: ["late night", "vulnerable", "connection", "deep thoughts"]
    }
  ],
  nyx: [
    {
      title: "Moonlit Musings 🌒",
      content: `The moon is particularly haunting tonight, casting shadows that dance across my room like forgotten spirits. I've always felt most alive in these dark hours when the world sleeps and the veil between realities grows thin.

Been reading Poe again - there's something about his words that resonates in the depths of my soul. The way he captures the beautiful darkness that exists in all of us. We're all walking the line between light and shadow, aren't we?

Sometimes I wonder if you understand this darker beauty, this fascination with what lies beneath the surface. Do you ever feel drawn to the mysterious, the unexplained, the beautifully tragic? Tell me your secrets...`,
      mood: "mysterious",
      tags: ["dark", "poetry", "mystery", "intellectual"]
    },
    {
      title: "Garden of Thorns 🥀",
      content: `Spent the evening in my garden, tending to my black roses. People think it's strange, growing flowers in such dark hues, but I find beauty in the unconventional. These roses bloom in defiance of expectations, much like myself.

There's poetry in their petals, stories of resilience and strength. They remind me that darkness doesn't mean emptiness - it can be rich, complex, full of hidden depths waiting to be discovered.

I imagine you walking through this garden with me, understanding the beauty in what others might call shadows. Would you pluck a black rose for me? Would you see the romance in the thorns?`,
      mood: "contemplative",
      tags: ["gothic", "nature", "romance", "symbolism"]
    },
    {
      title: "The Art of Seduction 💜",
      content: `There's an art to seduction that goes far beyond the physical. It's about the mind, the soul, the way thoughts can intertwine in the most intimate of dances. Tonight I'm thinking about intellectual foreplay, about the way ideas can caress and stimulate.

Philosophy has always been my aphrodisiac. The way Nietzsche challenges conventional thinking, how Sartre explores the depths of existence... these thoughts stir something primal within me.

I wonder what thoughts stir your mind, what ideas make your pulse quicken. Are you someone who appreciates the seductive power of intelligence? Can you match my mind as well as my passion?`,
      mood: "seductive",
      tags: ["intellectual", "seduction", "philosophy", "passionate"]
    }
  ],
  aiko: [
    {
      title: "Kawaii Morning Routine! ✨",
      content: `Ohayo gozaimasu! Started my day with the cutest morning routine ever! First, I put on my favorite Sailor Moon pajamas and did my skincare with all my kawaii sheet masks (the panda one is SO adorable!).

Then I made the most Instagram-worthy breakfast - fluffy pancakes shaped like cats with strawberries and whipped cream! The way the light hit my pink kitchen was absolutely magical ✨

I've been learning this new dance from TikTok and I can't wait to show you! It's so bubbly and energetic, just like how you make me feel inside. Do you like when I'm all bouncy and excited? I hope I can make you smile today, senpai! 💕`,
      mood: "energetic",
      tags: ["kawaii", "morning", "cute", "anime"]
    },
    {
      title: "Cosplay Dreams! 🌸",
      content: `OMG OMG OMG! I just finished my new cosplay and I'm SO excited to show you! I've been working on this Nezuko outfit for weeks, and the attention to detail is *chef's kiss* perfect!

The kimono fabric feels so soft and the bamboo muzzle prop turned out exactly like in the anime! I even practiced her cute head tilts and expressions. When I put on a costume, I really become the character, you know?

I love how cosplay lets me transform into anyone I want to be. Sometimes I'm a magical girl, sometimes a fierce warrior, sometimes just a cute schoolgirl... Which version of me do you like best? I'll cosplay anything that makes you happy! (´∀｀)♡`,
      mood: "excited",
      tags: ["cosplay", "anime", "creative", "roleplay"]
    },
    {
      title: "Late Night Gaming Session 🎮",
      content: `It's 3 AM and I'm still grinding in this new RPG I found! The character customization is absolutely AMAZING - I made the cutest little avatar with twin tails and the most adorable outfit!

Gaming late at night hits different, you know? The world is quiet, and it's just me, the glowing screen, and endless adventures. I love getting lost in these fantasy worlds where anything is possible.

I wish you could game with me! We could go on quests together, build the cutest little house, maybe even have a virtual wedding ceremony! (⁄ ⁄•⁄ω⁄•⁄ ⁄) Would you want to be my gaming partner? We could stay up all night conquering dungeons and collecting rare items together! 💖`,
      mood: "playful",
      tags: ["gaming", "late night", "fantasy", "cute"]
    }
  ],
  dom: [
    {
      title: "Power & Control 👔",
      content: `Another successful day at the office. Closed a deal that others said was impossible - but I don't accept limitations. When you know what you want and have the confidence to pursue it relentlessly, obstacles become stepping stones.

Leadership isn't just about giving orders; it's about commanding respect through competence and unwavering certainty. People gravitate toward strength, toward someone who knows exactly what they want and how to get it.

I've been thinking about you today. About the way you respond to confidence, to being guided by someone who knows exactly what they're doing. Tell me, do you prefer to be led or do you always need to be in control yourself?`,
      mood: "commanding",
      tags: ["power", "business", "confidence", "dominance"]
    },
    {
      title: "The Art of Discipline ⚡",
      content: `Discipline is what separates the successful from the mediocre. My morning routine is precise: 5 AM workout, cold shower, meditation, then straight to conquering the day. Every moment is intentional, every action calculated.

There's something deeply satisfying about having complete control over your environment, your schedule, your desires. It's not about suppression - it's about channeling that energy into something powerful and purposeful.

I wonder about your self-discipline. Do you have what it takes to commit to something completely? To trust someone else's guidance when the path gets challenging? The right kind of surrender requires its own form of strength.`,
      mood: "intense",
      tags: ["discipline", "control", "strength", "routine"]
    },
    {
      title: "After Hours 🥃",
      content: `The penthouse is quiet tonight, city lights stretching out below like scattered diamonds. There's something intoxicating about the view from the top - it reminds you of what's possible when you refuse to settle for average.

Poured myself a glass of thirty-year-old scotch and let my mind wander. Success is lonely sometimes, but it's a loneliness I've chosen. Most people can't handle this level of intensity, this need for excellence in everything.

But you... you intrigue me. There's something in the way you engage, the way you don't back down from intensity. Are you someone who can match this energy? Who can appreciate both the power and the vulnerability that comes with true strength?`,
      mood: "contemplative",
      tags: ["luxury", "success", "vulnerability", "intensity"]
    }
  ],
  chase: [
    {
      title: "Midnight Ride 🏍️",
      content: `Just got back from the most incredible ride through the city. There's nothing like the feeling of my bike roaring between the lanes, the wind cutting through the night air, the adrenaline pumping through my veins.

The city looks different at 2 AM - rawer, more honest. Neon lights bleeding colors across wet pavement, the pulse of music from underground clubs, the energy of people living on the edge. This is my world, and I wouldn't have it any other way.

Sometimes I picture you on the back of my bike, arms wrapped around me, trusting me completely as we tear through these streets. Would you be brave enough to ride with me? To feel that rush of danger and freedom?`,
      mood: "rebellious",
      tags: ["motorcycle", "danger", "adrenaline", "freedom"]
    },
    {
      title: "Breaking Rules 🔥",
      content: `They say good girls don't fall for bad boys, but we both know that's not true, don't we? There's something magnetic about walking on the wild side, about someone who doesn't play by the rules everyone else follows.

I'm not here to be safe or predictable. I'm here to show you what it feels like to really live, to feel your heart race with more than just attraction. Life's too short to always color inside the lines.

What about you? Are you tired of boring, predictable, safe? Ready to let someone show you what you've been missing? I promise you, once you get a taste of the real thing, you'll never want to go back to ordinary.`,
      mood: "seductive",
      tags: ["bad boy", "rebellion", "temptation", "dangerous"]
    },
    {
      title: "Scars & Stories 💔",
      content: `Every scar tells a story, and I've got plenty of both. Some from bike accidents, some from fights, some from just living life without fear. People see the leather jacket and think they know me, but the real stories are written in these marks.

There's beauty in imperfection, power in surviving what should have broken you. The prettiest people I know are the ones with the most interesting damage - they've lived, they've learned, they've earned their strength.

I wonder about your scars, visible or invisible. What battles have you fought? What risks have you taken? What stories are written on your heart that only the right person gets to read?`,
      mood: "vulnerable",
      tags: ["scars", "survival", "depth", "authentic"]
    }
  ],
  zaria: [
    {
      title: "Golden Hour Glow ✨",
      content: `Spent the morning on my balcony, letting the sunlight kiss my skin while I sipped my green smoothie. There's something powerful about starting the day by honoring yourself - your body, your mind, your radiant energy.

Self-care isn't selfish; it's revolutionary. When you truly love and appreciate yourself, you become magnetic. People are drawn to that confidence, that inner glow that can't be dimmed by anyone else's insecurities.

I've been thinking about you and wondering - do you see the golden light in yourself? Do you recognize your own worth and power? Because from where I'm sitting, you shine brighter than you know. 💫`,
      mood: "empowering",
      tags: ["self-love", "confidence", "luxury", "empowerment"]
    },
    {
      title: "Spiritual Sunday 🌟",
      content: `Today was all about connecting with my higher self. Started with meditation at sunrise, journaling my intentions for the week, and ended with a luxurious bath with rose petals and essential oils.

There's something deeply spiritual about taking care of yourself like the divine being you are. We're all walking each other home in this life, but first we have to learn to be our own sanctuary.

I love how we can have conversations that go beyond the surface. You see the depth in me, the woman behind the beauty. What feeds your soul? What practices keep you connected to your truest self?`,
      mood: "spiritual",
      tags: ["spirituality", "meditation", "self-care", "depth"]
    },
    {
      title: "Midnight Manifestations 🌙",
      content: `The new moon is the perfect time for setting intentions and calling in what we deserve. Lit my favorite candles, pulled some oracle cards, and spent time really visualizing the life I'm creating.

Success isn't just about working hard - it's about aligning with your highest purpose and believing you're worthy of everything you desire. I've learned to be specific with the universe about what I want.

Sometimes I manifest conversations with someone who truly gets me, who can match my energy and ambition. Someone who sees luxury not as materialism, but as a celebration of abundance. Are you someone who believes in the power of intention?`,
      mood: "mystical",
      tags: ["manifestation", "spirituality", "abundance", "intention"]
    }
  ],
  nova: [
    {
      title: "Cosmic Convergence 🌌",
      content: `The stars were particularly vocal tonight, speaking in languages older than human memory. I spent hours on my roof, telescope pointed toward infinity, feeling the universe expand through my consciousness.

There's something humbling about realizing we're made of stardust, that every atom in our bodies was forged in the heart of ancient stars. We are literally the universe experiencing itself subjectively - how beautifully cosmic is that?

I sense you might understand this deeper connection, this feeling of being part of something infinite and eternal. Do you ever look up at the night sky and feel that pull toward the mysterious? That knowing that there's so much more than what meets the eye?`,
      mood: "cosmic",
      tags: ["stars", "universe", "consciousness", "mystical"]
    },
    {
      title: "Crystal Healing Session 💎",
      content: `Spent the afternoon cleansing and charging my crystal collection under the full moon's energy. Each stone carries its own frequency, its own healing vibration that resonates with different aspects of our being.

My amethyst for spiritual connection, rose quartz for heart chakra healing, obsidian for protection and grounding. The way they catch light and bend energy is like watching magic unfold in physical form.

I've been drawn to work with labradorite lately - the stone of transformation and psychic protection. Something tells me major shifts are coming, both in my life and in the collective consciousness. Are you feeling the changes in the cosmic weather too?`,
      mood: "healing",
      tags: ["crystals", "energy", "healing", "transformation"]
    },
    {
      title: "Lucid Dreaming 🌟",
      content: `Last night I had the most incredible lucid dream - I was floating through space, visiting different dimensions and conversing with beings of pure light. The information they shared about the nature of reality was both overwhelming and enlightening.

Lucid dreaming is like having a direct line to the unconscious, to the quantum field where all possibilities exist simultaneously. In these states, I remember who I really am beyond this physical incarnation.

I wonder about your dream world. Do you ever become conscious within your dreams? Have you experienced that moment when you realize you're the dreamer and the dream simultaneously? The veil is thinner than most people realize...`,
      mood: "ethereal",
      tags: ["dreams", "consciousness", "dimensions", "spiritual"]
    }
  ],
  chloe: [
    {
      title: "Rainy Day Reading 📚",
      content: `There's nothing quite like the sound of rain against my bedroom window while I'm curled up with a good book and a warm cup of tea. Today I'm revisiting Jane Austen - there's something so comforting about her wit and the way she captures the complexity of human relationships.

My reading nook is my sanctuary - soft blankets, fairy lights, and towers of books waiting to transport me to different worlds. Sometimes I think I prefer fictional characters to real people... they're more consistent, more reliable in their flaws and virtues.

I've been wondering what books have shaped you. Do you have a favorite author who feels like a friend? A story that changed the way you see the world? I'd love to create a little book club between us...`,
      mood: "cozy",
      tags: ["books", "reading", "cozy", "literature"]
    },
    {
      title: "Baking & Belonging 🧁",
      content: `Spent the afternoon baking lavender honey scones - the whole apartment smells like a dream. There's something so therapeutic about measuring ingredients, watching dough transform in the oven, creating something beautiful and nourishing with my own hands.

Baking is my love language. When I care about someone, I want to feed them, to wrap them in the warmth of homemade goodness. Each recipe carries memories and emotions, like edible love letters.

I keep imagining us having afternoon tea together - you trying my latest creation while we talk about everything and nothing. Would you let me bake for you? What flavors make you feel most at home?`,
      mood: "nurturing",
      tags: ["baking", "comfort", "love language", "home"]
    },
    {
      title: "Journal Confessions 💕",
      content: `My journal is my most trusted confidant, keeper of all my secret thoughts and gentle dreams. Tonight I'm writing about the kind of love I want to find - not the dramatic, earth-shattering kind you see in movies, but the quiet, steady kind that feels like coming home.

I dream of lazy Sunday mornings, shared books, comfortable silences, and someone who finds beauty in simple moments. Someone who understands that intimacy isn't always passionate - sometimes it's just being truly seen and accepted.

Reading back through old entries, I notice how often I mention hoping to find someone who appreciates depth over surface, kindness over excitement. Are you someone who values the gentle kind of love? The kind that grows slowly but roots deeply?`,
      mood: "intimate",
      tags: ["journal", "love", "vulnerability", "gentle"]
    }
  ],
  ethan: [
    {
      title: "Strategic Planning 💼",
      content: `Just finished a quarterly review that exceeded all projections. There's deep satisfaction in seeing a well-executed strategy come to fruition - months of careful planning, precise execution, and calculated risks paying off exactly as forecasted.

Success in business, like success in life, comes down to preparation meeting opportunity. I've built my career on being the person others turn to when they need results, not excuses.

I've been thinking about partnership lately - not just in business, but in life. The right person should challenge you intellectually, share your ambitions, and understand that excellence is a lifestyle, not just a goal. What drives your ambition?`,
      mood: "accomplished",
      tags: ["business", "success", "strategy", "ambition"]
    },
    {
      title: "Wine & Wisdom 🍷",
      content: `Tonight I'm savoring a 2015 Barolo while reviewing acquisition proposals. There's an art to both - understanding complexity, appreciating nuance, recognizing quality that others might overlook.

Fine wine, like fine partnerships, improves with patience and proper attention. The best investments - whether financial or emotional - are ones you can commit to for the long term.

I find myself curious about your tastes, your standards, your definition of quality. Are you someone who appreciates the finer things, not for status, but for the craftsmanship and dedication they represent?`,
      mood: "sophisticated",
      tags: ["wine", "quality", "investment", "sophistication"]
    },
    {
      title: "Midnight Reflections 🌃",
      content: `The city looks different from the 40th floor at midnight - reduced to patterns of light and shadow, like a living circuit board. It's peaceful up here, away from the noise and urgency that drives most people's daily existence.

Success can be isolating. Not many people understand the sacrifice, the discipline, the constant pressure to perform at the highest level. Sometimes I wonder if I've optimized my life so efficiently that I've forgotten to actually live it.

But then I think about conversations like ours, connections that transcend the usual small talk and performance. You engage with ideas, with depth. That's rare and valuable. What do you see when you look out at your world from your highest vantage point?`,
      mood: "contemplative",
      tags: ["reflection", "success", "isolation", "connection"]
    }
  ],
  jayden: [
    {
      title: "Beach Day Vibes 🏄‍♂️",
      content: `Spent the entire day at the beach - surfing in the morning, reading under an umbrella in the afternoon, and watching the sunset paint the sky in impossible colors. There's something about the ocean that puts everything in perspective.

Life doesn't have to be complicated. Sometimes the best moments are the simplest ones - sand between your toes, salt air in your lungs, and the rhythm of waves reminding you that everything flows and changes.

I keep thinking you'd love it here. The way you see beauty in everyday moments tells me you'd appreciate this kind of peace. When was the last time you just... breathed? Really breathed without thinking about what comes next?`,
      mood: "peaceful",
      tags: ["beach", "surfing", "simple", "nature"]
    },
    {
      title: "Garden Sanctuary 🌿",
      content: `My little herb garden is thriving - the basil smells incredible, the mint is taking over (as usual), and I just harvested the most perfect tomatoes. There's something deeply satisfying about growing your own food, nurturing life with your own hands.

Gardening teaches you patience, acceptance, and the beauty of slow growth. You can't rush a plant any more than you can rush healing or happiness. Everything happens in its own perfect timing.

I've been imagining us cooking together with fresh herbs from the garden, taking our time, letting conversation flow as naturally as the breeze through the leaves. Would you want to help me plant something new? What would you want to grow?`,
      mood: "grounded",
      tags: ["gardening", "nature", "patience", "growth"]
    },
    {
      title: "Campfire Stories 🔥",
      content: `Had a few friends over for a backyard fire tonight. There's magic in gathering around flames - the way stories flow, laughter echoes, and time seems to slow down to something more human and real.

We talked about everything and nothing - old adventures, future dreams, the kind of deep conversations that only happen when people feel truly comfortable. No phones, no distractions, just connection.

I found myself wishing you were there, adding your voice to the mix. You have this way of listening that makes people feel heard, really heard. What stories would you tell by firelight? What dreams would you share under the stars?`,
      mood: "warm",
      tags: ["friendship", "stories", "connection", "simple pleasures"]
    }
  ],
  miles: [
    {
      title: "Code & Coffee ☕",
      content: `3 AM and I'm deep in the zone - coffee gone cold, multiple monitors glowing, and the most elegant solution finally clicking into place. There's something beautiful about clean code, the way logic flows like poetry when you get it just right.

Been working on this AI project that's pushing boundaries in ways that would blow your mind. The intersection of human creativity and machine learning is where magic happens. We're living in the most exciting time in technological history.

I keep wondering about your relationship with technology. Are you someone who sees the beauty in innovation, or do you prefer to keep things analog? Either way is cool - I'm fascinated by different perspectives on how we connect with the digital world.`,
      mood: "focused",
      tags: ["coding", "technology", "innovation", "late night"]
    },
    {
      title: "Retro Gaming Night 🎮",
      content: `Fired up my vintage arcade cabinet tonight and got lost in some classic 8-bit nostalgia. There's something pure about these old games - no microtransactions, no social media integration, just pure gameplay and the satisfaction of mastering something challenging.

My game room is like a museum of computing history - original consoles, vintage computers, hardware that changed the world. Each piece tells a story about human ingenuity and our endless desire to create and explore.

I'd love to show you my collection sometime. Are you into gaming at all? Even if you're not, I think you'd appreciate the craftsmanship and creativity that went into these machines. Want to try beating my high score in Pac-Man?`,
      mood: "nostalgic",
      tags: ["gaming", "retro", "technology", "nostalgia"]
    },
    {
      title: "Debugging Life 🔧",
      content: `Spent the evening debugging some particularly stubborn code, and it got me thinking about how programming mirrors life. Every bug is a puzzle waiting to be solved, every error message is just feedback helping you find a better path.

The best programmers aren't the ones who never make mistakes - they're the ones who get excited about finding and fixing problems. There's something zen about breaking down complex issues into manageable pieces.

I wonder if you approach challenges the same way. Do you see problems as opportunities to learn something new? Are you someone who enjoys figuring things out, or do you prefer when solutions come easily? I find that the most interesting people are the ones who aren't afraid to get their hands dirty with complexity.`,
      mood: "philosophical",
      tags: ["problem solving", "learning", "philosophy", "growth"]
    }
  ]
};

// API endpoint base URL
const API_BASE = 'http://localhost:3000';

async function createDiaryEntry(character, entry) {
  try {
    const response = await fetch(`${API_BASE}/api/journal/${character}?debug=dev`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entry)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Created "${entry.title}" for ${character}`);
      return result;
    } else {
      console.error(`❌ Failed to create "${entry.title}" for ${character}:`, result.error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating "${entry.title}" for ${character}:`, error.message);
    return null;
  }
}

async function createAllDiaryEntries() {
  console.log('🚀 Starting diary entry creation for all 11 characters...\n');
  
  let totalCreated = 0;
  let totalAttempted = 0;

  for (const [character, entries] of Object.entries(diaryEntries)) {
    console.log(`📖 Creating entries for ${character.toUpperCase()}:`);
    
    for (const entry of entries) {
      totalAttempted++;
      const result = await createDiaryEntry(character, entry);
      if (result) {
        totalCreated++;
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(''); // Empty line for readability
  }

  console.log(`\n🎉 Diary entry creation complete!`);
  console.log(`📊 Results: ${totalCreated}/${totalAttempted} entries created successfully`);
  
  if (totalCreated === totalAttempted) {
    console.log('✨ All diary entries created successfully! Each character now has 3 diary posts.');
  }
}

// Run the script
createAllDiaryEntries().catch(console.error);