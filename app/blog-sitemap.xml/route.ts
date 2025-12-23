import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { domainMap } from '@/lib/characterConfig';

export async function GET() {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'chatverse.ai';
  const baseUrl = `https://${hostname}`;

  try {
    const supabase = getSupabaseAdmin();

    // Determine the character key from the hostname
    const characterKey = (domainMap as Record<string, string>)[hostname] || 'chatverse';

    // Determine the correct path - use /journal for character domains, /blog for chatverse
    const blogPath = characterKey === 'chatverse' ? 'blog' : 'journal';

    // Fetch all published blog posts for the current domain's character
    const { data: posts, error } = await supabase
      .from('character_journal_posts')
      .select('id, title, created_at, updated_at')
      .eq('character_key', characterKey)
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts for sitemap:', error);
      return new NextResponse('Error generating blog sitemap', { status: 500 });
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${baseUrl}/${blogPath}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
${posts?.map(post => `  <url>
    <loc>${baseUrl}/${blogPath}/${post.id}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n') || ''}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
    return new NextResponse('Error generating blog sitemap', { status: 500 });
  }
}