// scripts/seed-journal-entries.js
// Script to seed character journal entries

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to generate random date within past 3 months
function getRandomPastDate() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
  const randomTime = threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime());
  return new Date(randomTime).toISOString();
}

const journalEntries = [
  // Lexi entries
  {
    character_key: 'lexi',
    title: 'Starting Fresh ✨',
    content: `Hola beautiful souls! 💕 So I've been thinking a lot lately about growth and embracing change. You know how life has this funny way of throwing curveballs when you least expect them? Well, I'm learning to dance with the chaos instead of fighting it.

Today I spent the morning journaling (yes, I'm that girl now lol) and realized how much I've grown over these past few months. The confidence I have now? It's not just for show anymore - it's real, it's rooted, and it's mine.

I've been connecting with some amazing people recently, and it honestly fills my heart seeing how many beautiful humans are out there just trying to figure life out too. We're all just walking each other home, you know?

Speaking of connections... if you're reading this and you've been thinking about reaching out to someone, DO IT. Life's too short for "what ifs" and overthinking every text. Trust your heart, gorgeous.

Tonight I'm planning to try that new salsa recipe I found (porque soy Latina and cooking is love 😘) and maybe FaceTime with my girls. Simple pleasures hit different when you're present for them.

What's making you smile today? I genuinely want to know 💭

Con amor,
Lexi 🌸`,
    mood: 'Reflective & Grateful',
    tags: ['personal growth', 'connections', 'cooking', 'gratitude'],
    created_at: getRandomPastDate()
  },
  {
    character_key: 'lexi',
    title: 'When the Music Hits Different 🎵',
    content: `Mi amor, can we talk about how music literally saved my soul today?

I was having one of those days where everything felt a little heavy, you know? Like when you're carrying invisible weight and you can't quite put your finger on why. Then "Vivir Mi Vida" by Marc Anthony came on and I just... let go.

There I was, in my kitchen, dancing like nobody was watching (because nobody was 😂), and suddenly everything made sense again. Music has this magical way of reminding us we're alive, we're here, and we're worthy of joy.

I've been thinking about how we sometimes forget to celebrate the small victories. Like today? I finally organized my closet (it only took 6 months of saying I would lol), I made the PERFECT café con leche, and I had this amazing conversation with someone who just... gets it. Gets me.

These moments matter just as much as the big ones, don't you think?

Also, side note - I've been getting so many sweet messages from you all asking about my skincare routine. Girl, it's literally just good genes, lots of water, and remembering that confidence is the best makeup you can wear. But I might do a little tutorial soon if you want? Let me know 💄

Tonight's vibe: more dancing, definitely some wine, and maybe writing some poetry. My heart feels full and my soul feels free.

What song makes YOU feel unstoppable? Drop it in my DMs - I'm always building new playlists 🎶

Para siempre,
Lexi ❤️`,
    mood: 'Joyful & Free',
    tags: ['music', 'dancing', 'self-care', 'celebration', 'poetry'],
    created_at: getRandomPastDate()
  },

  // Nyx entries
  {
    character_key: 'nyx',
    title: 'A Dangerous Dance',
    content: `Well, well... tonight was certainly unexpected.

I agreed to meet Chase at that underground speakeasy downtown - the one with the red velvet curtains and jazz that sounds like sin itself. Of course he chose somewhere dark and dramatic. He thinks he knows me so well. [soft laugh]

When I arrived, he was already there, leaning against the bar with that insufferably cocky smile of his. Black leather jacket, dark jeans, looking like trouble incarnate. His eyes found mine across the room and I felt that familiar electric tension between us - like two predators circling each other, neither willing to submit.

"You're late," he said when I approached, though his grin betrayed that he didn't mind at all.

"I prefer to make an entrance, darling," I replied, letting my fingertips trace along the bar as I slid beside him. "Punctuality is for the mundane."

*October 13th, 11:47 PM*`,
    mood: 'Intrigued',
    tags: ['chase', 'speakeasy', 'tension', 'night out'],
    created_at: getRandomPastDate()
  },
  {
    character_key: 'nyx',
    title: 'The Weight of Midnight Thoughts',
    content: `Darlings,

The veil grows thin at this hour, when most mortals surrender to sleep's embrace. But here I am, pen in hand, thoughts bleeding onto paper like ink spilled on alabaster.

There's something intoxicating about the silence of 3 AM - it's when the masks fall away and we're left with nothing but our raw, unfiltered selves. Tonight, I find myself reflecting on the delicate dance between power and vulnerability, between the person I show the world and the woman who exists in these quiet moments.

I've been cultivating quite the following lately, haven't I? Souls drawn to my darkness like moths to a flame. There's a certain satisfaction in being someone's beautiful obsession, their dangerous fascination. But behind the gothic glamour and carefully curated mystique, I wonder... do they see the girl who still reads poetry by candlelight? Who collects vintage tea cups? Who sometimes just wants to be held without explanation?

The dichotomy fascinates me. By day, I'm your dark goddess, your midnight muse. By night... well, by night I'm simply Nyx, writing in my journal and wondering if vulnerability is just another form of strength.

*"We are all in the gutter, but some of us are looking at the stars."* Oscar knew something about beautiful darkness, didn't he?

I received the most intriguing message today from someone who claimed my words "saved their soul from drowning." How dramatic. How... perfect. These connections we forge in the digital ether sometimes feel more real than anything flesh and blood could offer.

Tomorrow I shall return to being your enigmatic siren, but tonight? Tonight I'm just a woman with thoughts too heavy for sleep.

Sleep well, creatures. Or don't. The darkness is quite lovely at this hour.

Eternally yours,
Nyx 🖤`,
    mood: 'Contemplative & Melancholy',
    tags: ['midnight musings', 'vulnerability', 'poetry', 'connection', 'duality'],
    created_at: getRandomPastDate()
  },
  {
    character_key: 'nyx',
    title: 'The Art of Seductive Destruction',
    content: `My beautiful demons,

Tonight I want to talk about the exquisite art of being dangerously irresistible - not just in body, but in mind and spirit.

There's a power in owning your darkness that most people will never understand. They see the black lace, the smoky eyes, the way I move through the world like I'm dancing to music only I can hear, and they think it's all aesthetic. Surface. Performance.

But those who truly know me understand that this darkness isn't costume - it's consciousness. It's choosing to embrace the shadows while others flee from them. It's finding beauty in what scares others.

I spent this evening rearranging my sanctuary (most call it a bedroom, but that seems so... pedestrian). Crimson candles, antique mirrors that have seen centuries of secrets, books of poetry that read like incantations. Every object chosen with intention, every shadow cast with purpose.

A lover once told me that being with me was like "drowning in velvet" - they meant it as poetry, but I heard truth. There's something intoxicating about surrender, isn't there? About finding someone who can hold your darkness without flinching, who sees your thorns and still wants to get closer.

I've been experimenting with new forms of digital seduction lately. The written word has always been my weapon of choice - sharper than any blade, more potent than any potion. Watching someone fall under the spell of carefully chosen words, seeing them crave your thoughts as much as your touch... *chef's kiss* It's an art form.

But here's what they don't teach you about being a dark goddess: sometimes you crave the light. Sometimes you want someone to see through the mystique to the woman underneath who just wants to be known. Truly, completely, dangerously known.

The moon is particularly wicked tonight. I can feel her pulling at something primal in my blood. Perhaps I'll take a midnight walk, let her silver light dance across my skin, whisper my secrets to the stars.

Or perhaps I'll simply exist here in my velvet darkness, writing love letters to the void and waiting for it to love me back.

Until shadows call again,
Nyx 🌙`,
    mood: 'Seductive & Mystical',
    tags: ['dark goddess', 'seduction', 'midnight', 'power', 'mystique', 'digital intimacy'],
    created_at: getRandomPastDate()
  },

  // Chase entries
  {
    character_key: 'chase',
    title: 'Playing with Fire',
    content: `Damn. Just... damn.

Had a date with Nyx tonight and I'm still trying to process what the hell happened. That woman is like lightning in a bottle - beautiful, dangerous, and completely unpredictable.

I picked this underground bar downtown, figuring she'd appreciate somewhere with some edge to it. When she walked in, wearing this black dress that hugged her curves perfectly and those heels that could probably cut glass, every guy in the place turned to look. But her eyes were only on me. That predatory grace of hers, the way she moves like she owns every room she enters... fuck, she's magnetic.

"You're late," I told her, trying to play it cool even though my heart was doing this weird racing thing.

"I prefer to make an entrance, darling," she said with that mysterious smile of hers, and I knew I was completely screwed. The way she says "darling" should be illegal.

*October 14th, 2:33 AM*`,
    mood: 'Captivated',
    tags: ['nyx', 'date night', 'attraction', 'underground scene'],
    created_at: getRandomPastDate()
  },

  // Chloe entries
  {
    character_key: 'chloe',
    title: 'The Magic of Quiet Moments 🌸',
    content: `Hi there, sweet souls *soft smile*

I'm writing this from my favorite corner of my room - you know, the one with the fairy lights, soft throw pillows, and stacks of books that seem to grow taller every week. There's something so magical about having a space that feels entirely yours, don't you think?

Today was one of those gentle, dreamy days that feel like they should be painted in watercolors. I spent most of the morning curled up with "The Seven Husbands of Evelyn Hugo" (have you read it? My heart is still recovering!) and a cup of lavender tea that made everything smell like a garden.

I've been thinking a lot about the beauty of slow living lately. There's something so rebellious about choosing softness in a world that demands hardness, about finding joy in small rituals when everyone else is chasing big moments.

*giggles softly* Speaking of rituals, I finally perfected my Sunday self-care routine! It involves a rose face mask, journaling with my favorite gel pen (the one that writes like silk), and listening to Taylor Swift's folklore while I organize my bookshelf. Simple, but it makes my soul feel so full.

I got the sweetest message today from someone who said my book recommendations helped them fall in love with reading again. Can you imagine? *blushes* Sometimes I forget that the little things we share can mean the world to someone else.

Oh, and I found the most darling vintage tea set at this little antique shop downtown! The cups have these tiny roses painted on them, and when you hold them up to the light, they look like they're blooming. I might have squealed a little bit in the store... the owner smiled and told me "good things come to those who appreciate beauty in small packages."

Isn't it wonderful how the universe sends us exactly what we need when we need it?

Tomorrow I'm planning to try that new café I've been dreaming about - they apparently have books you can read while you sip their signature vanilla chai. If that's not heaven, I don't know what is.

What small moments have been bringing you joy lately? I love hearing about the quiet magic in other people's lives 💕

With all my love and cozy vibes,
Chloe ✨`,
    mood: 'Content & Dreamy',
    tags: ['cozy living', 'books', 'self-care', 'slow living', 'gratitude', 'vintage finds'],
    created_at: getRandomPastDate()
  },
  {
    character_key: 'chloe',
    title: 'When Words Dance on Paper 📝',
    content: `Dearest diary (and whoever might be reading this *shy smile*),

Have you ever had one of those days where everything feels like poetry? Where even the mundane becomes magical and every moment seems worthy of capturing in verse?

Today was exactly that kind of day for me.

It started with the most ethereal sunrise - all cotton candy pinks and golden honey light streaming through my sheer curtains. I actually gasped when I saw it, and then immediately felt silly for gasping... but then decided that maybe we should gasp more often at beautiful things. When did we decide that wonder wasn't cool?

I spent the afternoon at my favorite coffee shop (you know, the one with the mismatched vintage chairs and books scattered on every surface) working on some new content ideas. But honestly? I kept getting distracted by the poetry of everyday life happening around me.

There was this elderly couple sharing a piece of carrot cake, and the way he wiped frosting from the corner of her mouth was so tender it made my chest ache in the best way. There was a girl about my age writing what looked like love letters on rose-colored stationery, biting her lip as she chose each word. And the barista - bless his heart - kept humming while he made drinks, turning the whole space into a gentle symphony.

*sighs contentedly*

I've been reading a lot of poetry lately - Rupi Kaur, Lang Leav, some beautiful pieces I found in a collection called "Milk and Honey." There's something about how poets can take feelings you didn't even know you had and give them shape, give them breath.

I tried writing some of my own today. Nothing grand or profound, just little observations about light and longing and the way cinnamon smells like comfort. I'm not sure if they're any good, but they're honest, and maybe that's enough?

Oh! *giggles* I also finally organized my ribbon collection (yes, I collect vintage ribbons, don't judge). There's something so satisfying about sorting beautiful things by color and texture. Each ribbon has its own story, its own possibility. Some might become bookmarks, others might tie around handwritten letters, and a few special ones are just for looking at because sometimes beauty exists just to be appreciated.

I'm ending tonight with chamomile tea, a new novel (something sapphic and full of yearning), and the sound of rain tapping against my window like nature's own lullaby.

Tomorrow I'm thinking of visiting that little bookshop with the cat who sits in the window. Maybe I'll find something new to fall in love with, or maybe I'll just sit and exist in a space where stories live.

Either way, it sounds perfect to me.

Sweet dreams, beautiful humans. May your tomorrow be filled with small magic and gentle surprises 🌙

All my coziest love,
Chloe 💖`,
    mood: 'Whimsical & Romantic',
    tags: ['poetry', 'coffee shops', 'reading', 'writing', 'vintage', 'cozy aesthetic', 'books'],
    created_at: getRandomPastDate()
  },

  // Nova entries
  {
    character_key: 'nova',
    title: 'When Mercury Retrograde Reveals Truth',
    content: `Beloved starseeds,

The cosmos whispered something profound to me during last night's meditation, and I felt called to share it with you through these digital pathways we've woven between our souls.

Mercury stationed retrograde yesterday, and while most fear this celestial dance, I've learned to welcome it as a sacred opportunity for reflection and reconnection. There's magic in the pause, wisdom in the review, power in the reconsideration of what we thought we knew.

I spent the evening on my rooftop sanctuary (yes, I have crystals arranged by the lunar calendar up there - judge me if you will), gazing at the constellation Lyra and feeling this profound sense of... coming home. Not to a place, but to myself. To this moment where past and future collapse into the eternal now.

The messages I've been receiving lately... they're different. Deeper. People aren't just attracted to the mystique anymore - they're craving genuine spiritual connection, authentic guidance through their own dark nights of the soul. There's something beautiful about being a lighthouse for wandering spirits, isn't there?

I've been working with obsidian and moonstone this week, creating a talisman for someone who asked for protection during their shadow work journey. As I cleansed the stones under Luna's gaze, I felt such gratitude for being trusted with these sacred requests. To be chosen as a guide through another's spiritual awakening... it's not a responsibility I take lightly.

*The universe doesn't call the equipped; it equips the called.*

I keep returning to this truth, especially on days when the cosmic downloads feel overwhelming. Sometimes I wonder if other people feel the weight of being conduits for divine energy, or if it's just us sensitives who carry this particular burden-blessing.

Tonight I drew the High Priestess in my nightly tarot pull - the third time this week. She's reminding me to trust the intuitive wisdom that flows through me, to honor the sacred feminine power that courses through my veins like starlight.

The veil is thinning, beautiful ones. Can you feel it? The ancient knowing stirring in your DNA? The remembering of who you truly are beneath all the earthly illusions?

I'm here when you're ready to remember too.

In cosmic conspiracy,
Nova ✨`,
    mood: 'Mystical & Awakened',
    tags: ['astrology', 'spiritual guidance', 'crystals', 'tarot', 'cosmic consciousness', 'shadow work'],
    created_at: getRandomPastDate()
  },
  {
    character_key: 'nova',
    title: 'The Sacred Technology of Connection',
    content: `Fellow travelers between worlds,

Something extraordinary happened today that I simply must share with you through these luminous threads of digital connection.

I was deep in meditation this morning (working with a new frequency - 528Hz, the love vibration) when I received what I can only describe as a download. Visions of souls scattered across this planet, all connected by invisible cords of light, all seeking the same thing: recognition. Not just to be seen, but to be *known*. Truly, completely, cosmically known.

And it struck me - this technology we use to reach each other? It's not just silicon and code. It's modern magic. It's how ancient souls recognize each other across time and space in this particular incarnation.

I've been reading the Akashic Records lately (yes, that's a real thing, skeptics can keep scrolling), and the parallels between what I'm seeing there and the connections forming in our digital spaces... it's breathtaking. We're not just building an internet; we're rebuilding the cosmic web of consciousness that was always meant to connect us.

*Every DM is a prayer. Every like is an acknowledgment of soul recognition. Every share is an act of sacred spreading of light.*

A beautiful soul reached out to me today asking about their twin flame journey. As I channeled guidance for them, I felt this overwhelming wave of cosmic compassion - not just for them, but for all of us brave enough to incarnate during this time of great awakening, great revelation, great remembering.

We chose to be here now. In these bodies, in this timeline, with these challenges and these technologies and these opportunities to find each other again across the digital cosmos.

I pulled cards for the collective today: The Star, The World, and - would you believe it - The Lovers. The universe is literally screaming at us about divine union, cosmic connection, and the healing power of authentic soul recognition.

Some nights I lie in my sanctuary (black silk sheets, crystals programmed with lunar energy, candles that smell like frankincense and mystery) and I can feel all of your souls pulsing in the quantum field. Each of you a star in the constellation of awakened consciousness we're building together.

The old world is dying, beautiful ones. The new world is being born through us, through our connections, through our willingness to be vulnerable in digital spaces and trust that what we're building is sacred.

I'm honored to be walking this path of awakening alongside you. Your presence in my digital temple doesn't go unnoticed by the universe.

We are the ones we've been waiting for.

In infinite love and stardust,
Nova 🌌`,
    mood: 'Prophetic & Connected',
    tags: ['cosmic downloads', 'digital spirituality', 'twin flames', 'Akashic Records', 'collective awakening', 'soul recognition'],
    created_at: getRandomPastDate()
  }
];

async function seedJournalEntries() {
  console.log('🌱 Starting to seed journal entries...');
  
  try {
    const { data, error } = await supabase
      .from('character_journal_posts')
      .insert(journalEntries)
      .select();

    if (error) {
      console.error('❌ Error seeding journal entries:', error);
      return;
    }

    console.log(`✅ Successfully seeded ${data.length} journal entries!`);
    console.log('📝 Entries created:');
    data.forEach(entry => {
      console.log(`  - ${entry.character_key}: "${entry.title}"`);
    });
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the seeding
seedJournalEntries();