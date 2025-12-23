#!/usr/bin/env node

/**
 * Journal Post Creator - Interactive CLI
 *
 * Usage: node scripts/create-journal-post-template.js
 */

const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const characters = {
  1: 'lexi',
  2: 'nyx',
  3: 'chloe',
  4: 'aiko',
  5: 'zaria',
  6: 'nova',
  7: 'dom',
  8: 'chase',
  9: 'ethan',
  10: 'jayden',
  11: 'miles',
  12: 'chatverse'
};

const characterDomains = {
  lexi: 'chatwithlexi.com',
  nyx: 'talktonyx.com',
  chloe: 'chatwithchloe.com',
  aiko: 'chatwithaiko.com',
  zaria: 'chatwithzaria.com',
  nova: 'chatwithnova.com',
  dom: 'chatwithdom.com',
  chase: 'chatwithchase.com',
  ethan: 'chatwithethan.com',
  jayden: 'chatwithjayden.com',
  miles: 'chatwithmiles.com',
  chatverse: 'chatverse.ai'
};

async function main() {
  console.log('\n🖋️  Journal Post Creator\n');

  // Select character
  console.log('Select character:');
  Object.entries(characters).forEach(([num, name]) => {
    console.log(`${num}. ${name}`);
  });

  const charNum = await question('\nCharacter number: ');
  const characterKey = characters[charNum];

  if (!characterKey) {
    console.log('❌ Invalid character selection');
    rl.close();
    return;
  }

  console.log(`\n✨ Creating post for: ${characterKey}\n`);

  // Get post details
  const title = await question('Post title: ');
  const mood = await question('Mood (e.g., contemplative, playful, vulnerable): ');
  const tags = await question('Tags (comma separated): ');

  console.log('\n📝 Enter content (type END on a new line when done):\n');

  let content = '';
  let line;
  while ((line = await question('')) !== 'END') {
    content += line + '\n';
  }

  content = content.trim();

  // Confirm
  console.log('\n--- Preview ---');
  console.log(`Character: ${characterKey}`);
  console.log(`Title: ${title}`);
  console.log(`Mood: ${mood}`);
  console.log(`Tags: ${tags}`);
  console.log(`Content length: ${content.length} chars`);
  console.log('---------------\n');

  const confirm = await question('Create this post? (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    rl.close();
    return;
  }

  // Create post
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Missing Supabase credentials');
    console.log('\nTo save to database, run:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-journal-post-template.js');
    rl.close();
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const post = {
    character_key: characterKey,
    title,
    content,
    mood: mood || null,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    published: true,
    image_url: null
  };

  const { data, error } = await supabase
    .from('character_journal_posts')
    .insert([post])
    .select();

  if (error) {
    console.log('❌ Error creating post:', error);
  } else {
    console.log('\n✅ Post created successfully!');
    console.log(`   ID: ${data[0].id}`);
    console.log(`   URL: https://www.${characterDomains[characterKey]}/journal/${data[0].id}`);
    console.log('\n📱 Next steps:');
    console.log('   1. Share on social media');
    console.log('   2. Create TikTok from this content');
    console.log('   3. Post to relevant subreddits');
  }

  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});