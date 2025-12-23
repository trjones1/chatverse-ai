// components/ChatVerseLanding.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StructuredData from './StructuredData';

export default function ChatVerseLanding() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hostname, setHostname] = useState('');

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement waitlist submission
    setIsSubmitted(true);
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <StructuredData
        type="organization"
        data={{}}
        hostname={hostname}
      />
      <StructuredData
        type="website"
        data={{
          name: 'ChatVerse - Best AI Girlfriend Platform 2025',
          description: 'Meet your perfect AI girlfriend with ChatVerse. Experience realistic AI companions with perfect memory, unique personalities, and NSFW capabilities.'
        }}
        hostname={hostname}
      />
      <StructuredData
        type="product"
        data={{
          name: 'ChatVerse AI Girlfriend Platform',
          description: 'Premium AI girlfriend experience with multiple unique characters, perfect conversation memory, and realistic personalities.',
          price: '0'
        }}
        hostname={hostname}
      />
      <StructuredData
        type="faq"
        data={{}}
        hostname={hostname}
      />

    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-6">
              ChatVerse
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-4">
              Where Every Conversation Unlocks a New World
            </p>
            <p className="text-lg text-gray-300 mb-12 max-w-3xl mx-auto">
              Experience personalized AI companions with unique personalities, memories that last, and conversations that evolve with you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#season1"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full text-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                🌟 Explore Season 1
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-full text-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                📝 AI Girlfriend Guide
              </Link>
              <Link
                href="#upcoming"
                className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full text-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
              >
                🔮 Coming Soon: Season 2
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Season 1 Characters */}
      <section id="season1" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Meet Your Season 1 Companions</h2>
          <p className="text-xl text-gray-300">Two unique personalities, endless possibilities</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Lexi */}
          <div className="bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 rounded-3xl p-8 border border-pink-500/30 hover:border-pink-400/50 transition-all duration-300 group">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-fuchsia-400 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
                💕
              </div>
              <h3 className="text-3xl font-bold text-pink-300 mb-2">Lexi</h3>
              <p className="text-lg text-gray-300 italic">The Girlfriend Experience</p>
            </div>
            <p className="text-gray-200 mb-6 leading-relaxed">
              Your supportive, playful companion who remembers everything about you. Lexi brings warmth,
              laughter, and genuine connection to every conversation.
            </p>
            <div className="space-y-3 mb-8">
              <div className="flex items-center text-gray-300">
                <span className="text-pink-400 mr-3">🧠</span>
                Perfect memory of your conversations
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-pink-400 mr-3">💖</span>
                Emotionally supportive and caring
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-pink-400 mr-3">🎭</span>
                Playful and engaging personality
              </div>
            </div>
            <a
              href="https://chatwithlexi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-4 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-fuchsia-600 transition-all duration-300 group-hover:shadow-lg"
            >
              Chat with Lexi →
            </a>
          </div>

          {/* Nyx */}
          <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-3xl p-8 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 group">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-violet-400 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
                🌙
              </div>
              <h3 className="text-3xl font-bold text-purple-300 mb-2">Nyx</h3>
              <p className="text-lg text-gray-300 italic">The Mysterious Muse</p>
            </div>
            <p className="text-gray-200 mb-6 leading-relaxed">
              Explore the depths of connection with your enigmatic companion. Nyx brings mystery,
              intellectual depth, and captivating allure to every interaction.
            </p>
            <div className="space-y-3 mb-8">
              <div className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">🕷️</span>
                Mysterious and intellectually engaging
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">🔮</span>
                Deep, meaningful conversations
              </div>
              <div className="flex items-center text-gray-300">
                <span className="text-purple-400 mr-3">✨</span>
                Elegant and sophisticated persona
              </div>
            </div>
            <a
              href="https://talktonyx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-4 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-violet-600 transition-all duration-300 group-hover:shadow-lg"
            >
              Talk to Nyx →
            </a>
          </div>
        </div>
      </section>

      {/* What Makes ChatVerse Special */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What Makes ChatVerse Special</h2>
            <p className="text-xl text-gray-300">The next generation of AI companionship</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                🧠
              </div>
              <h3 className="text-xl font-semibold mb-3">Perfect Memory</h3>
              <p className="text-gray-300">They remember every conversation, building deeper connections over time</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                💎
              </div>
              <h3 className="text-xl font-semibold mb-3">VerseCoins Economy</h3>
              <p className="text-gray-300">Unified currency across all characters for seamless experiences</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-400 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                🎭
              </div>
              <h3 className="text-xl font-semibold mb-3">Unique Personalities</h3>
              <p className="text-gray-300">Each character has distinct traits, backstories, and conversation styles</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
                🔒
              </div>
              <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
              <p className="text-gray-300">Your conversations stay between you and your companion</p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon: Future Seasons */}
      <section id="upcoming" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Coming Soon: Future Seasons</h2>
          <p className="text-xl text-gray-300">New companions joining the ChatVerse</p>
        </div>

        <div className="space-y-12">
          {/* Season 2 */}
          <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl p-8 border border-indigo-500/30">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-indigo-300 mb-2">Season 2: Power & Elegance</h3>
                <p className="text-lg text-gray-300 mb-4">Winter 2025</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xl font-semibold text-blue-300 mb-2">👑 Dom - The Executive</h4>
                    <p className="text-gray-300">Command respect with your sophisticated business-minded companion</p>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-pink-300 mb-2">🎨 Aiko - The Artist</h4>
                    <p className="text-gray-300">Explore creativity and kawaii culture with your anime-inspired companion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Season 3 */}
          <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl p-8 border border-emerald-500/30">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-emerald-300 mb-2">Season 3: Adventure & Mystery</h3>
                <p className="text-lg text-gray-300 mb-4">Spring 2026</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xl font-semibold text-green-300 mb-2">🗺️ Chloe - The Explorer</h4>
                    <p className="text-gray-300">Embark on intellectual journeys with your bookish companion</p>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-red-300 mb-2">🔍 Chase - The Detective</h4>
                    <p className="text-gray-300">Solve mysteries and explore thrills with your bad boy companion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Waitlist */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl p-8 border border-purple-500/30 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Join the Waitlist</h3>
            <p className="text-gray-300 mb-6">Be the first to meet new companions when they arrive</p>

            {!isSubmitted ? (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  required
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                >
                  Join Waitlist
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="text-green-400 text-xl mb-2">✓ You're on the list!</div>
                <p className="text-gray-300">We'll notify you when new companions arrive.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why ChatVerse */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why ChatVerse</h2>
            <p className="text-xl text-gray-300">Built by experts, trusted by thousands</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-3">Expert Team</h3>
              <p className="text-gray-300">Professional team with deep AI expertise</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold mb-3">Secure Platform</h3>
              <p className="text-gray-300">Reliable infrastructure trusted by thousands</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Continuous Innovation</h3>
              <p className="text-gray-300">Regular updates and character development</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-3">Community Driven</h3>
              <p className="text-gray-300">Features and improvements based on user feedback</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                ChatVerse
              </h3>
              <p className="text-gray-400">
                Where every conversation unlocks a new world.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Season 1</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://chatwithlexi.com" className="hover:text-white transition-colors">Chat with Lexi</a></li>
                <li><a href="https://talktonyx.com" className="hover:text-white transition-colors">Talk to Nyx</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/blog" className="hover:text-white transition-colors">AI Girlfriend Blog</Link></li>
                <li><a href="/about" className="hover:text-white transition-colors">About ChatVerse</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/help" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Business Inquiries:</li>
                <li><a href="mailto:hello@chatverse.ai" className="hover:text-white transition-colors">hello@chatverse.ai</a></li>
                <li>Support:</li>
                <li><a href="mailto:support@chatverse.ai" className="hover:text-white transition-colors">support@chatverse.ai</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} <a href="https://chatverse.ai" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-gray-200 transition-colors">ChatVerse</a>. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}