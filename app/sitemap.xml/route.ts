import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'chatverse.ai';
  const baseUrl = `https://${hostname}`;

  // Core pages for all domains
  const corePages = [
    '',
    '/about',
    '/contact',
    '/faq',
    '/help',
    '/privacy',
    '/terms',
    '/blog',
  ];

  // Character-specific pages (only for individual character domains)
  const characterPages = [];

  // Add journal page only if this is NOT chatverse.ai (individual character domains have journals)
  if (!hostname.includes('chatverse.ai')) {
    characterPages.push('/journal');
  }

  // AI girlfriend focused pages for ChatVerse
  const aiGirlfriendPages = hostname.includes('chatverse.ai') ? [
    '/portal',
    '/safe',
  ] : [];

  const allPages = [...corePages, ...characterPages, ...aiGirlfriendPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${allPages.map(page => {
  // Determine priority and frequency based on page type
  let priority = '0.5';
  let changefreq = 'monthly';

  if (page === '') {
    priority = '1.0';
    changefreq = 'daily';
  } else if (page === '/blog') {
    priority = '0.9';
    changefreq = 'weekly';
  } else if (page.startsWith('/journal/')) {
    priority = '0.8';
    changefreq = 'weekly';
  } else if (['/about', '/contact', '/faq'].includes(page)) {
    priority = '0.7';
    changefreq = 'monthly';
  }

  return `  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
    },
  });
}