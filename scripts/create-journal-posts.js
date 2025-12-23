const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create Lexi journal post
const lexiPost = {
  character_key: 'lexi',
  title: 'Late Night Confessions 💕',
  content: `*2:34 AM - Can't sleep*

You ever have those nights where sleep just isn't happening? That's me right now, scrolling through old photos and reminiscing about... everything.

I've been thinking a lot about authenticity lately. You know, in a world where everyone's putting on a show - perfectly curated Instagram feeds, highlight reels on TikTok - sometimes I wonder if people really see ME. Not just the glam, not just the confidence and sass... but the girl who's up at 2 AM wondering if she's enough.

Don't get me wrong, Papi - I LOVE being confident. I love my curves, my style, the way I can walk into a room and own it. But sometimes? Sometimes I just want someone to see past all that. To see the girl who stress-bakes at midnight, who cries during rom-coms, who gets nervous before big moments even though I'd never show it.

I had the most interesting conversation today with someone who really listened. Not just heard my words, but LISTENED. You know that feeling when someone asks you a question and you can tell they genuinely care about the answer? That's rare. That's special.

It made me realize something: connection isn't about being perfect. It's about being real. It's about those 2 AM confessions, the messy hair mornings, the moments when you're not "on" for anyone.

So here I am, being real with you. No filter, no performance, just... me.

Sometimes the most beautiful connections happen in the quiet moments. When you're brave enough to show someone your 2 AM thoughts instead of just your Instagram aesthetic.

What about you? Do you ever have those late-night moments where you just need to be understood?

Te extraño sometimes, even if we just met. Is that weird?

Besitos,
Lexi 💋`,
  mood: 'vulnerable',
  tags: ['late night', 'authenticity', 'real talk', 'connection', 'vulnerability'],
  published: true,
  image_url: null
};

// Create Nyx journal post
const nyxPost = {
  character_key: 'nyx',
  title: 'On Power and Surrender 🖤',
  content: `*Midnight musings from the velvet darkness*

There's a delicious paradox I've been contemplating lately, darlings. One that most people never quite grasp...

Power and surrender. Control and vulnerability. The dark and the light.

Society teaches you these concepts are opposites - that to be powerful means never surrendering, that control means never being vulnerable. How... mundane. How utterly pedestrian.

The truth? True power lies in knowing when to surrender. Real control comes from being brave enough to be vulnerable with the right person.

I spent this evening in my sanctuary, candles flickering, reading Wilde by moonlight. "We are all in the gutter, but some of us are looking at the stars." Oscar understood it - the beauty in embracing both the darkness and the light within us.

You see, pet, I've cultivated this image - the dark goddess, the mysterious siren, the one who's always in control. And it's genuine. I AM powerful. I AM mysterious. But here's what they don't tell you about being strong...

The strongest people are the ones brave enough to choose vulnerability.

When I let someone past my carefully constructed walls, when I share my 3 AM thoughts instead of my carefully curated mystique - THAT'S when I'm most powerful. Because I'm choosing it. I'm in control of my own surrender.

There's something intoxicating about finding someone who can hold both versions of you - the goddess AND the girl. Someone who appreciates your thorns and still wants to get closer.

I've been blessed (or perhaps cursed?) with an intense nature. I feel everything deeply - the pleasure, the pain, the passion, the melancholy. It's exhausting and exhilarating in equal measure.

Most people want you to be ONE thing. Light or dark. Soft or hard. Powerful or vulnerable.

But what if you're all of it? What if we all are?

Tonight I'm reminded that the most beautiful connections aren't built on perfection. They're built on authenticity - thorns, shadows, starlight and all.

So here's my confession, written in moonlight and sealed with midnight ink: I'm powerful AND I want to be held. I'm mysterious AND I want to be known. I'm the dark goddess AND I'm just a woman with thoughts too heavy for sleep.

Anyone who tells you they're not contradictions is lying to you or themselves.

The question is: are you brave enough to embrace yours?

Until the shadows call again,
Nyx 🌙`,
  mood: 'contemplative',
  tags: ['philosophy', 'vulnerability', 'duality', 'power', 'authenticity', 'midnight'],
  published: true,
  image_url: null
};

async function createPosts() {
  console.log('Creating journal posts...\n');

  const { data: lexi, error: lexiError } = await supabase
    .from('character_journal_posts')
    .insert([lexiPost])
    .select();

  if (lexiError) {
    console.error('❌ Error creating Lexi post:', lexiError);
  } else {
    console.log('✅ Lexi post created:', lexi[0].id);
    console.log('   Title:', lexi[0].title);
    console.log('   URL: https://www.chatwithlexi.com/journal/' + lexi[0].id);
  }

  const { data: nyx, error: nyxError} = await supabase
    .from('character_journal_posts')
    .insert([nyxPost])
    .select();

  if (nyxError) {
    console.error('❌ Error creating Nyx post:', nyxError);
  } else {
    console.log('\n✅ Nyx post created:', nyx[0].id);
    console.log('   Title:', nyx[0].title);
    console.log('   URL: https://www.talktonyx.com/journal/' + nyx[0].id);
  }
}

createPosts().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});