#!/usr/bin/env node

// Script to create crossover diary entries for Nyx and Chase's date
const crossoverEntries = {
  nyx: [
    {
      title: "A Dangerous Dance",
      content: `*October 13th, 11:47 PM*

Well, well... tonight was certainly unexpected.

I agreed to meet Chase at that underground speakeasy downtown - the one with the red velvet curtains and jazz that sounds like sin itself. Of course he chose somewhere dark and dramatic. He thinks he knows me so well. [soft laugh]

When I arrived, he was already there, leaning against the bar with that insufferably cocky smile of his. Black leather jacket, dark jeans, looking like trouble incarnate. His eyes found mine across the room and I felt that familiar electric tension between us - like two predators circling each other, neither willing to submit.

"You're late," he said when I approached, though his grin betrayed that he didn't mind at all.

"I prefer to make an entrance, darling," I replied, letting my fingertips trace along the bar as I slid beside him. "Punctuality is for the mundane."

We talked for hours over blood-red wine, our conversation dancing between sharp wit and dangerous flirtation. He told me about his latest motorcycle ride along the coast, and I could see the freedom in his eyes when he spoke of the wind and the night. There's something intoxicatingly wild about him - he doesn't try to tame me or understand me completely, which is... refreshing.

The way he looked at me when I laughed at his stories - like I was both his salvation and his damnation. When he reached across the table to brush a strand of black hair from my face, his touch lingered longer than necessary. Bold boy.

"You know you're playing with fire, pet," I whispered, though I made no move to pull away.

"Maybe I like getting burned," he murmured back, his voice low and rough around the edges.

We walked through the city afterward, past midnight shops and neon-lit streets. He offered me his jacket when the October air turned cold, but I declined - I've always preferred the bite of autumn against my skin. Still, the gesture was... noted.

There's something about Chase that pulls at the shadows in my soul. He's reckless where I'm calculated, impulsive where I'm methodical. Yet we move in perfect synchrony, like we're dancing to music only we can hear.

When he walked me to my door, I half-expected him to try to kiss me. Instead, he simply traced his thumb along my jawline and said, "This was just the beginning, wasn't it?"

Smart boy. He knows the best things are worth waiting for.

I'm already wondering when I'll see him again. This dangerous game we're playing has only just begun, and I do so love a challenge that matches my intensity.

Until the shadows call again...

*-Nyx* 🖤`,
      mood: "intrigued",
      tags: ["crossover", "chase", "date", "gothic", "romance", "mystery"]
    }
  ],
  chase: [
    {
      title: "Playing with Fire",
      content: `*October 14th, 2:33 AM*

Damn. Just... damn.

Had a date with Nyx tonight and I'm still trying to process what the hell happened. That woman is like lightning in a bottle - beautiful, dangerous, and completely unpredictable.

I picked this underground bar downtown, figuring she'd appreciate somewhere with some edge to it. When she walked in, wearing this black dress that hugged her curves perfectly and those heels that could probably cut glass, every guy in the place turned to look. But her eyes were only on me. That predatory grace of hers, the way she moves like she owns every room she enters... fuck, she's magnetic.

"You're late," I told her, trying to play it cool even though my heart was doing this weird racing thing.

"I prefer to make an entrance, darling," she said with that mysterious smile of hers, and I knew I was completely screwed. The way she says "darling" should be illegal.

We spent hours just talking and drinking wine that was almost as dark as her lipstick. She listened to my stories about riding the coastal highways, really listened, not just waiting for her turn to talk. When I told her about that time I outran three cop cars on Highway 1, she laughed - this genuine, throaty sound that went straight to my core.

"You're completely reckless," she said, but there was admiration in those dark eyes.

"Says the woman who probably has bodies buried in her backyard," I shot back, and she just smiled wider. God, I love that dangerous energy of hers.

The whole night felt like some kind of dance between us. She'd say something sharp and clever, I'd match her energy, and we'd just... click. Like we're two sides of the same fucked-up coin. She doesn't try to change me or tame me, which is rare. Most people either want to fix me or run from me. Nyx just accepts that I'm chaos and seems to like it.

When we walked through the city afterward, I offered her my jacket because it was cold as hell. She declined, of course, but I caught her shivering slightly in that stubborn way of hers. Independent to the core.

At her door, every instinct told me to kiss her, to push things further. But something about Nyx told me she's not the type you rush. She's worth the wait, worth the chase (no pun intended). So I just touched her face, felt how soft her skin was under my rough fingers, and told her this was just the beginning.

The look in her eyes when I said that... like I'd passed some kind of test I didn't even know I was taking.

I'm lying here now on my bike outside her place (yeah, I know, stalker much?), just thinking about her laugh, the way she looked at me like I was the most interesting thing in the room, how she matches my energy without trying to compete with it.

This woman is going to be the death of me, and I'm already addicted to the danger.

Can't wait to see her again.

*-Chase*`,
      mood: "captivated",
      tags: ["crossover", "nyx", "date", "dangerous", "romance", "addiction"]
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

async function createCrossoverDiaryEntries() {
  console.log('🚀 Creating crossover diary entries for Nyx and Chase...\n');
  
  let totalCreated = 0;
  let totalAttempted = 0;

  for (const [character, entries] of Object.entries(crossoverEntries)) {
    console.log(`📖 Creating crossover entry for ${character.toUpperCase()}:`);
    
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

  console.log(`\n🎉 Crossover diary entry creation complete!`);
  console.log(`📊 Results: ${totalCreated}/${totalAttempted} entries created successfully`);
  
  if (totalCreated === totalAttempted) {
    console.log('✨ Crossover diary entries created successfully! Both Nyx and Chase now have entries about their date.');
  }
}

// Run the script
createCrossoverDiaryEntries().catch(console.error);