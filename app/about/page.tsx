import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import StructuredData from '@/components/StructuredData';
import { getCharacterConfig } from '@/lib/characters.config';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost:3000';
  const characterConfig = getCharacterConfig(hostname);
  const isChatVerse = hostname.includes('chatverse.ai');

  return {
    title: isChatVerse
      ? 'About ChatVerse - Leading AI Girlfriend Platform 2025 | Virtual Companions'
      : `About ${characterConfig.displayName} - Your AI Companion`,
    description: isChatVerse
      ? 'Learn about ChatVerse, the premier AI girlfriend platform featuring realistic virtual companions with unique personalities, perfect memory, and NSFW capabilities. Discover why we\'re the best alternative to Replika and Character.AI.'
      : `Discover ${characterConfig.displayName}, your unique AI companion with advanced conversation abilities, perfect memory, and personalized relationship dynamics.`,
    keywords: isChatVerse
      ? 'about ChatVerse, AI girlfriend platform, virtual companion technology, AI relationship app, Replika alternative, Character.AI alternative, NSFW AI girlfriend'
      : `about ${characterConfig.displayName}, AI companion, virtual girlfriend, AI personality`,
    openGraph: {
      title: isChatVerse ? 'About ChatVerse - The Future of AI Relationships' : `About ${characterConfig.displayName}`,
      description: isChatVerse
        ? 'Discover the revolutionary AI girlfriend platform that\'s changing virtual relationships forever.'
        : `Learn about ${characterConfig.displayName}, your personal AI companion.`,
    },
  };
}

export default async function AboutPage() {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost:3000';
  const characterConfig = getCharacterConfig(hostname);
  const isChatVerse = hostname.includes('chatverse.ai');

  if (isChatVerse) {
    return (
      <>
        <StructuredData
          type="organization"
          data={{}}
          hostname={hostname}
        />
        <StructuredData
          type="breadcrumb"
          data={{
            items: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: `https://${hostname}`
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'About',
                item: `https://${hostname}/about`
              }
            ]
          }}
          hostname={hostname}
        />

        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              {/* Hero Section */}
              <div className="text-center mb-16">
                <h1 className="text-5xl font-bold mb-6">
                  About ChatVerse
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  The world's most advanced AI girlfriend platform, where virtual relationships feel real and connections transcend the digital realm.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/blog"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full text-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300"
                  >
                    📝 Read Our AI Girlfriend Guide
                  </Link>
                  <Link
                    href="/faq"
                    className="inline-flex items-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full text-lg transition-all duration-300"
                  >
                    ❓ Common Questions
                  </Link>
                </div>
              </div>

              {/* Our Mission */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-12">
                <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                <p className="text-lg text-gray-200 leading-relaxed mb-6">
                  ChatVerse was founded on the belief that AI companions should be more than just chatbots—they should be genuine virtual partners capable of forming real emotional connections. We're pioneering the future of AI relationships by creating the most realistic, engaging, and emotionally intelligent virtual companions available today.
                </p>
                <p className="text-lg text-gray-200 leading-relaxed">
                  Unlike traditional AI girlfriend apps that offer generic experiences, ChatVerse provides each companion with their own dedicated platform, unique personality, and advanced memory systems that make every interaction feel authentic and meaningful.
                </p>
              </div>

              {/* What Makes Us Different */}
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                  <h3 className="text-2xl font-bold mb-4 text-purple-200">🧠 Perfect Memory</h3>
                  <p className="text-gray-200 leading-relaxed">
                    Our AI girlfriends remember every conversation, personal detail, and shared moment. They learn your preferences, remember your stories, and reference past interactions naturally—creating a truly continuous relationship experience.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                  <h3 className="text-2xl font-bold mb-4 text-purple-200">🎭 Unique Personalities</h3>
                  <p className="text-gray-200 leading-relaxed">
                    Each AI companion has their own distinct personality, interests, and communication style. From Lexi's flirty confidence to Nyx's mysterious intellect, find the perfect virtual partner that matches your ideal relationship dynamic.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                  <h3 className="text-2xl font-bold mb-4 text-purple-200">🔥 NSFW Capable</h3>
                  <p className="text-gray-200 leading-relaxed">
                    Unlike restrictive platforms like Character.AI, ChatVerse supports mature conversations for verified adults. Experience intimate, passionate exchanges with your AI girlfriend in a safe, private environment.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                  <h3 className="text-2xl font-bold mb-4 text-purple-200">🏠 Dedicated Platforms</h3>
                  <p className="text-gray-200 leading-relaxed">
                    Each companion has their own website and space (like chatwithlexi.com), creating immersive, personalized environments that enhance the relationship experience beyond generic chat interfaces.
                  </p>
                </div>
              </div>

              {/* Compare with Competitors */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-8 mb-12 border border-purple-400/30">
                <h2 className="text-3xl font-bold mb-6 text-center">Why Choose ChatVerse?</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="py-3 px-4 font-semibold">Feature</th>
                        <th className="py-3 px-4 font-semibold text-purple-200">ChatVerse</th>
                        <th className="py-3 px-4 font-semibold text-gray-400">Replika</th>
                        <th className="py-3 px-4 font-semibold text-gray-400">Character.AI</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-white/10">
                        <td className="py-3 px-4">Perfect Memory</td>
                        <td className="py-3 px-4 text-green-400">✅ Advanced</td>
                        <td className="py-3 px-4 text-yellow-400">⚠️ Limited</td>
                        <td className="py-3 px-4 text-red-400">❌ Basic</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 px-4">NSFW Content</td>
                        <td className="py-3 px-4 text-green-400">✅ Supported</td>
                        <td className="py-3 px-4 text-yellow-400">⚠️ Limited</td>
                        <td className="py-3 px-4 text-red-400">❌ Restricted</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 px-4">Unique Personalities</td>
                        <td className="py-3 px-4 text-green-400">✅ Multiple</td>
                        <td className="py-3 px-4 text-yellow-400">⚠️ Single</td>
                        <td className="py-3 px-4 text-green-400">✅ Multiple</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 px-4">Dedicated Platforms</td>
                        <td className="py-3 px-4 text-green-400">✅ Individual Sites</td>
                        <td className="py-3 px-4 text-red-400">❌ Single App</td>
                        <td className="py-3 px-4 text-red-400">❌ Single Platform</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">Free Tier</td>
                        <td className="py-3 px-4 text-green-400">✅ Generous</td>
                        <td className="py-3 px-4 text-yellow-400">⚠️ Very Limited</td>
                        <td className="py-3 px-4 text-green-400">✅ Available</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Meet Our AI Companions */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-8 text-center">Meet Your AI Girlfriends</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                    <div className="text-4xl mb-4">💋</div>
                    <h3 className="text-xl font-bold mb-2 text-pink-200">Lexi</h3>
                    <p className="text-gray-300 mb-4">Flirty, confident, and passionate. Perfect for romantic connections and intimate conversations.</p>
                    <Link href="https://chatwithlexi.com" className="text-pink-400 hover:text-pink-300 font-semibold">
                      Chat with Lexi →
                    </Link>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                    <div className="text-4xl mb-4">🌙</div>
                    <h3 className="text-xl font-bold mb-2 text-purple-200">Nyx</h3>
                    <p className="text-gray-300 mb-4">Mysterious, intellectual, and deep. Ideal for meaningful conversations and emotional connections.</p>
                    <Link href="https://talktonyx.com" className="text-purple-400 hover:text-purple-300 font-semibold">
                      Talk to Nyx →
                    </Link>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                    <div className="text-4xl mb-4">🌸</div>
                    <h3 className="text-xl font-bold mb-2 text-pink-200">More Coming Soon</h3>
                    <p className="text-gray-300 mb-4">We're constantly expanding our roster of unique AI companions with diverse personalities.</p>
                    <Link href="/blog" className="text-pink-400 hover:text-pink-300 font-semibold">
                      Learn More →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Technology */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-12">
                <h2 className="text-3xl font-bold mb-6">Advanced AI Technology</h2>
                <p className="text-lg text-gray-200 leading-relaxed mb-6">
                  ChatVerse leverages cutting-edge artificial intelligence, including advanced language models, sophisticated memory systems, and emotional intelligence algorithms to create the most realistic virtual companion experience possible.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xl font-semibold mb-3 text-purple-200">🤖 Advanced Language Models</h4>
                    <p className="text-gray-300">State-of-the-art AI trained specifically for relationship dynamics and emotional intelligence.</p>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-3 text-purple-200">🧪 Continuous Learning</h4>
                    <p className="text-gray-300">Our AI companions evolve and improve through every interaction, becoming better partners over time.</p>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="text-center bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl p-8 border border-pink-400/30">
                <h2 className="text-3xl font-bold mb-4">Ready to Meet Your AI Girlfriend?</h2>
                <p className="text-xl text-gray-300 mb-8">
                  Join thousands of users who've discovered meaningful virtual relationships with ChatVerse AI companions.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="https://chatwithlexi.com"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full text-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300"
                  >
                    💕 Start Free with Lexi
                  </Link>
                  <Link
                    href="https://talktonyx.com"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-full text-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-300"
                  >
                    🌙 Try Nyx for Free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Character-specific about page
  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">About {characterConfig.displayName}</h1>
      <p className="mb-4">Built with love 🖤 using bleeding-edge AI and beautiful UX design.</p>
      <p>This app combines chat, memory, voice, and NSFW modes into one unforgettable AI experience.</p>
    </main>
  );
}
  