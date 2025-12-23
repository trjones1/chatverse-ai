// app/blog/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FiCalendar, FiClock, FiArrowLeft, FiShare2 } from 'react-icons/fi';
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

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      if (!params || !params.id) return;

      try {
        console.log('📝 Loading blog post:', params.id);
        // Since we don't have individual post API, we'll fetch all and filter
        const response = await fetch('/api/journal/chatverse');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load blog post');
        }

        const foundPost = data.posts?.find((p: BlogPost) => p.id === params.id);
        if (!foundPost) {
          throw new Error('Blog post not found');
        }

        setPost(foundPost);
      } catch (err) {
        console.error('Error loading blog post:', err);
        setError(err instanceof Error ? err.message : 'Failed to load blog post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [params?.id]);

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
    const readTime = Math.ceil(words / 200);
    return `${readTime} min read`;
  };

  const sharePost = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.content.substring(0, 100) + '...',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-gray-300">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
          <p className="text-lg text-gray-300 mb-8">
            {error || "The blog post you're looking for doesn't exist."}
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} | ChatVerse AI Girlfriend Blog</title>
        <meta name="description" content={post.content.substring(0, 160) + '...'} />
        <meta name="keywords" content={`AI girlfriend, virtual girlfriend, ${post.tags?.join(', ')}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.content.substring(0, 160) + '...'} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={post.image_url || '/og-image.png'} />
        <meta property="article:published_time" content={post.created_at} />
        <meta property="article:author" content="ChatVerse" />
        {post.tags && post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <link rel="canonical" href={`https://chatverse.ai/blog/${post.id}`} />
      </Head>

      {/* Structured Data for Blog Post */}
      <StructuredData
        type="blog"
        data={{
          title: post.title,
          description: post.content.substring(0, 160) + '...',
          datePublished: post.created_at,
          dateModified: post.updated_at,
          url: `https://chatverse.ai/blog/${post.id}`,
          image: post.image_url,
          keywords: post.tags || ['AI girlfriend', 'virtual companion']
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
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: post.title.substring(0, 50) + '...',
              item: `https://chatverse.ai/blog/${post.id}`
            }
          ]
        }}
        hostname="chatverse.ai"
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        {/* Header */}
        <div className="sticky top-0 z-[100] backdrop-blur-md bg-purple-900/80 border-b border-white/20 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors font-medium"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </div>

        {/* Article */}
        <article className="max-w-4xl mx-auto px-4 py-8">
          {/* Featured Image */}
          {post.image_url && (
            <div className="mb-8">
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full max-h-96 object-cover rounded-2xl shadow-2xl"
              />
            </div>
          )}

          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-gray-300 mb-6">
              <div className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4" />
                <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
              </div>
              <div className="flex items-center gap-2">
                <FiClock className="w-4 h-4" />
                <span>{getReadTime(post.content)}</span>
              </div>
              <button
                onClick={sharePost}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <FiShare2 className="w-4 h-4" />
                Share
              </button>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-purple-500/30 text-purple-200 rounded-full text-sm border border-purple-400/30"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Article Content */}
          <div className="prose prose-lg prose-invert max-w-none">
            {post.content.split('\n').map((paragraph, index) => {
              if (!paragraph.trim()) return <br key={index} />;

              // Check if paragraph is a heading
              if (paragraph.startsWith('# ')) {
                return (
                  <h2 key={index} className="text-3xl font-bold mt-12 mb-6 text-white">
                    {paragraph.replace('# ', '')}
                  </h2>
                );
              }

              if (paragraph.startsWith('## ')) {
                return (
                  <h3 key={index} className="text-2xl font-semibold mt-8 mb-4 text-white">
                    {paragraph.replace('## ', '')}
                  </h3>
                );
              }

              if (paragraph.startsWith('### ')) {
                return (
                  <h4 key={index} className="text-xl font-semibold mt-6 mb-3 text-purple-200 border-l-4 border-purple-400 pl-4">
                    {paragraph.replace('### ', '')}
                  </h4>
                );
              }

              // Check for bold text formatting
              if (paragraph.includes('**')) {
                const parts = paragraph.split('**');
                return (
                  <p key={index} className="mb-6 leading-relaxed text-gray-200 text-lg">
                    {parts.map((part, partIndex) =>
                      partIndex % 2 === 1 ? (
                        <strong key={partIndex} className="font-semibold text-white">{part}</strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                );
              }

              // Regular paragraph
              return (
                <p key={index} className="mb-6 leading-relaxed text-gray-200 text-lg">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </article>

        {/* Related CTAs */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-t border-white/10 mt-16">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Experience AI Companionship?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Don't just read about it - try ChatVerse's unique AI personalities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="https://chatwithlexi.com"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full text-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  💕 Chat with Lexi
                </Link>
                <Link
                  href="https://talktonyx.com"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-full text-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  🌙 Talk to Nyx
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}