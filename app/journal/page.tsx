// app/journal/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getCharacterConfig } from '@/lib/characters.config';
import { useCharacter } from '@/lib/useCharacter';
import { FiArrowLeft, FiCalendar } from 'react-icons/fi';
import Link from 'next/link';

interface JournalPost {
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

export default function JournalPage() {
  const characterConfig = useCharacter();
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Wait for hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const loadPosts = async () => {
      // Don't load posts until we're hydrated and have a valid character config
      if (!hydrated || !characterConfig) return;
      
      // Clear posts immediately when character changes to prevent stale data
      setPosts([]);
      setLoading(true);
      setError(null);
      
      try {
        console.log('📝 Loading journal for character:', characterConfig.key);
        const response = await fetch(`/api/journal/${characterConfig.key}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load journal posts');
        }
        
        console.log('📝 Loaded', data.posts?.length || 0, 'posts for', characterConfig.key);
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Error loading journal posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load journal');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [characterConfig, hydrated]);

  if (!characterConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Character Not Found</h1>
          <p className="text-gray-600">This domain is not mapped to any character.</p>
        </div>
      </div>
    );
  }

  const journalName = characterConfig.journal?.name || 'Journal';
  const journalDescription = characterConfig.journal?.description || 'Personal thoughts and updates';
  const journalEmoji = characterConfig.journal?.emoji || '📔';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md border-b border-opacity-20 border-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Link 
              href="/chat"
              className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Chat
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{journalEmoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{characterConfig.displayName}'s {journalName}</h1>
              <p className="text-sm opacity-70">{journalDescription}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent mx-auto mb-4"></div>
            <p className="text-sm opacity-70">Loading journal entries...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">{journalEmoji}</span>
            <h2 className="text-xl font-semibold mb-2">No entries yet</h2>
            <p className="text-sm opacity-70">
              {characterConfig.displayName} hasn't written any journal entries yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/journal/${post.id}`}
                className="block group"
              >
                <article
                  className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg text-gray-900 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold mb-2 text-gray-900 group-hover:text-purple-600 transition-colors">
                        {post.title}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiCalendar className="w-4 h-4" />
                        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                        {post.mood && (
                          <>
                            <span>•</span>
                            <span className="capitalize">Mood: {post.mood}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Image */}
                  {post.image_url && (
                    <div className="mb-4">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                      />
                    </div>
                  )}

                  {/* Content Preview */}
                  <div className="prose prose-gray max-w-none">
                    <p className="mb-3 leading-relaxed text-gray-800 line-clamp-3">
                      {post.content.substring(0, 200)}...
                    </p>
                  </div>

                  {/* Read More */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <span className="text-purple-600 font-medium group-hover:text-purple-700 transition-colors">
                      Read more →
                    </span>
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className="px-3 py-1 text-gray-500 text-xs">
                            +{post.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}