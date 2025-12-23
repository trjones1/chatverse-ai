const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create realistic publication dates spread over the last 30 days
const generateRealisticDates = () => {
  const now = new Date();
  const dates = [];

  // Post 1: ChatVerse vs Replika (most important, published 5 days ago)
  const date1 = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));
  dates.push(date1.toISOString());

  // Post 2: Best AI Girlfriend Apps (published 12 days ago)
  const date2 = new Date(now.getTime() - (12 * 24 * 60 * 60 * 1000));
  dates.push(date2.toISOString());

  // Post 3: How to Build Perfect Relationship (published 18 days ago)
  const date3 = new Date(now.getTime() - (18 * 24 * 60 * 60 * 1000));
  dates.push(date3.toISOString());

  // Post 4: AI vs Real Girlfriend (published 25 days ago)
  const date4 = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000));
  dates.push(date4.toISOString());

  return dates;
};

async function updateBlogDates() {
  console.log('Updating blog post dates for organic appearance...');

  try {
    // First, get all ChatVerse blog posts
    const { data: posts, error: fetchError } = await supabase
      .from('character_journal_posts')
      .select('*')
      .eq('character_key', 'chatverse')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      return;
    }

    if (!posts || posts.length === 0) {
      console.log('No ChatVerse blog posts found');
      return;
    }

    console.log(`Found ${posts.length} blog posts to update`);

    const dates = generateRealisticDates();

    // Update each post with a realistic date
    for (let i = 0; i < posts.length && i < dates.length; i++) {
      const post = posts[i];
      const newDate = dates[i];

      console.log(`Updating "${post.title.substring(0, 50)}..." to ${newDate}`);

      const { error: updateError } = await supabase
        .from('character_journal_posts')
        .update({
          created_at: newDate,
          updated_at: newDate
        })
        .eq('id', post.id);

      if (updateError) {
        console.error(`Error updating post ${post.id}:`, updateError);
      } else {
        console.log(`✅ Updated: ${post.title.substring(0, 50)}...`);
      }
    }

    console.log('Blog date updates complete!');
  } catch (error) {
    console.error('Script failed:', error);
  }

  process.exit(0);
}

updateBlogDates().catch(console.error);