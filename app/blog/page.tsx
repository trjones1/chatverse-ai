// app/blog/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Link from 'next/link';
import Head from 'next/head';
import StructuredData from '@/components/StructuredData';

interface BlogPost {
  id: string;
  character_key: string;
  title: string;
  content: string;
  image_url?: string;
  mood?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  published: boolean;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        console.log('📝 Loading ChatVerse blog posts');
        const response = await fetch('/api/journal/chatverse');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load blog posts');
        }

        console.log('📝 Loaded', data.posts?.length || 0, 'blog posts');
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Error loading blog posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load blog');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadTime = (content: string) => {
    const words = content.split(' ').length;
    const readTime = Math.ceil(words / 200); // Average reading speed
    return `${readTime} min read`;
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  return (
    <>
      <Head>
        <title>AI Girlfriend Blog - ChatVerse | Latest Updates & Guides</title>
        <meta name="description" content="Discover the latest in AI girlfriend technology, comparisons, and guides. Learn about virtual companions, AI relationships, and the future of digital intimacy." />
        <meta name="keywords" content="AI girlfriend, virtual girlfriend, AI companion, AI relationship, chatbot girlfriend, AI waifu, virtual relationship" />
        <meta property="og:title" content="AI Girlfriend Blog - ChatVerse" />
        <meta property="og:description" content="The ultimate guide to AI girlfriends and virtual companions. Reviews, comparisons, and insights." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://chatverse.ai/blog" />
      </Head>

      {/* Structured Data for Blog Listing */}
      <StructuredData
        type="website"
        data={{
          name: 'ChatVerse AI Girlfriend Blog',
          description: 'The ultimate guide to AI girlfriends and virtual companions. Reviews, comparisons, and insights on the best AI relationship platforms.'
        }}
        hostname="chatverse.ai"
      />
      <StructuredData
        type="breadcrumb"
        data={{
          items: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://chatverse.ai'
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Blog',
              item: 'https://chatverse.ai/blog'
            }
          ]
        }}
        hostname="chatverse.ai"
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        {/* Header */}
        <div className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-6">
                ChatVerse Blog
              </h1>
              <p className="text-xl md:text-2xl text-gray-200 mb-4">
                Your Guide to AI Girlfriends & Virtual Companions
              </p>
              <p className="text-lg text-gray-300 mb-8 max-w-3xl mx-auto">
                Discover the latest in AI relationship technology, compare top platforms, and learn how to build meaningful connections with AI companions.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-400 border-t-transparent mx-auto mb-4"></div>
              <p className="text-lg text-gray-300">Loading latest posts...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4 text-lg">Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-8xl mb-6 block">📝</span>
              <h2 className="text-3xl font-semibold mb-4">Coming Soon</h2>
              <p className="text-xl text-gray-300 mb-8">
                We're working on amazing content about AI girlfriends and virtual companions.
              </p>
              <Link
                href="/portal"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full text-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                🌟 Explore Our Characters
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`}>
                  <article className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105 h-full">
                    {/* Featured Image */}
                    {post.image_url && (
                      <div className="mb-4">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Post Header */}
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold mb-3 text-white hover:text-purple-300 transition-colors">
                        {post.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <FiCalendar className="w-4 h-4" />
                          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                        </div>
                        <div className="flex items-center gap-1">
                          <FiClock className="w-4 h-4" />
                          <span>{getReadTime(post.content)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Excerpt */}
                    <div className="mb-4">
                      <p className="text-gray-200 leading-relaxed">
                        {truncateContent(post.content)}
                      </p>
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs border border-purple-400/30"
                          >
                            #{tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className="px-3 py-1 text-gray-400 text-xs">
                            +{post.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-t border-white/10 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Meet Your AI Companion?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Don't just read about AI girlfriends - experience the future of digital relationships with our unique characters.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/portal"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full text-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  🌟 Explore All Characters
                </Link>
                <Link
                  href="https://chatwithlexi.com"
                  className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full text-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
                >
                  💕 Try Lexi Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}