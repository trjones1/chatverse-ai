// app/portal/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const seasons = {
  season1: {
    title: 'Season 1: Available Now',
    subtitle: 'Your first companions await',
    characters: [
      {
        name: 'Lexi',
        domain: 'https://chatwithlexi.com',
        description: 'Your supportive, playful companion who remembers everything about you',
        subtitle: 'The Girlfriend Experience',
        personality: 'Sweet • Flirty • Caring',
        gradient: 'from-pink-500 to-fuchsia-500',
        icon: '💕',
        comingSoon: false
      },
      {
        name: 'Nyx',
        domain: 'https://www.talktonyx.com',
        description: 'Explore the depths of connection with your enigmatic companion',
        subtitle: 'The Mysterious Muse',
        personality: 'Mysterious • Dark • Captivating',
        gradient: 'from-purple-500 to-violet-500',
        icon: '🌙',
        comingSoon: false
      }
    ]
  },
  season2: {
    title: 'Season 2: Power & Elegance',
    subtitle: 'Coming Winter 2025',
    characters: [
      {
        name: 'Dom',
        domain: 'https://www.sirdominic.com',
        description: 'Command respect with your sophisticated business-minded companion',
        subtitle: 'The Executive',
        personality: 'Commanding • Confident • Intense',
        gradient: 'from-indigo-500 to-blue-500',
        icon: '👑',
        comingSoon: true
      },
      {
        name: 'Aiko',
        domain: 'https://www.waifuwithaiko.com',
        description: 'Explore creativity and kawaii culture with your anime-inspired companion',
        subtitle: 'The Artist',
        personality: 'Sweet • Creative • Gentle',
        gradient: 'from-pink-400 to-rose-500',
        icon: '🎨',
        comingSoon: true
      }
    ]
  },
  season3: {
    title: 'Season 3: Adventure & Mystery',
    subtitle: 'Coming Spring 2026',
    characters: [
      {
        name: 'Chloe',
        domain: 'https://www.explorewithchloe.com',
        description: 'Embark on intellectual journeys with your bookish companion',
        subtitle: 'The Explorer',
        personality: 'Intellectual • Curious • Adventurous',
        gradient: 'from-emerald-500 to-teal-500',
        icon: '🗺️',
        comingSoon: true
      },
      {
        name: 'Chase',
        domain: 'https://www.fuckboychase.com',
        description: 'Solve mysteries and explore thrills with your bad boy companion',
        subtitle: 'The Detective',
        personality: 'Bold • Mysterious • Dynamic',
        gradient: 'from-red-500 to-orange-500',
        icon: '🔍',
        comingSoon: true
      }
    ]
  }
};

// Floating particles component
const FloatingParticles = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    speed: number;
  }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 20 + 10
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animationDuration: `${particle.speed}s`,
          }}
        />
      ))}
    </div>
  );
};

// Animated stars component
const AnimatedStars = () => {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {[...Array(100)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        >
          ✨
        </div>
      ))}
    </div>
  );
};

export default function PortalPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }
        }
        .animate-twinkle {
          animation: twinkle var(--tw-animate-duration, 2s) ease-in-out infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
        {/* Animated background effects */}
        <AnimatedStars />
        <FloatingParticles />
        
        {/* Gradient overlays for depth */}
        <div className="fixed inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className="fixed inset-0 bg-gradient-to-r from-purple-900/10 to-pink-900/10 pointer-events-none" />
        
        <div className="relative z-10 container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-block animate-float">
              <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-6 animate-glow">
                The ChatVerse
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-purple-200 mb-4 font-light">
              ✨ Step through another portal… who will you meet next? ✨
            </p>
            <div className="w-32 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full animate-pulse" />
          </div>

          {/* Seasons */}
          <div className="space-y-20">
            {Object.entries(seasons).map(([seasonKey, season]) => (
              <div key={seasonKey} className="max-w-6xl mx-auto">
                {/* Season Header */}
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
                    {season.title}
                  </h2>
                  <p className="text-xl text-purple-200">
                    {season.subtitle}
                  </p>
                </div>

                {/* Character Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
                  {season.characters.map((character, index) => {
                    if (character.comingSoon) {
                      return (
                        <div
                          key={character.name}
                          className="group block cursor-not-allowed w-full max-w-md"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="relative rounded-2xl bg-gradient-to-br from-gray-500/10 to-gray-600/5 backdrop-blur-sm border border-gray-400/20 p-8 h-full transition-all duration-500 animate-float opacity-60 grayscale cursor-not-allowed overflow-hidden">

                            {/* Coming Soon Ribbon */}
                            <div className="absolute -top-2 -right-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-8 py-2 rotate-45 transform origin-center z-20 shadow-lg whitespace-nowrap">
                              Coming Soon
                            </div>

                            {/* Character icon */}
                            <div className="text-5xl mb-6 text-center transition-transform duration-300 opacity-50">
                              {character.icon}
                            </div>

                            {/* Character name and subtitle */}
                            <div className="text-center mb-6">
                              <h3 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent transition-transform duration-300">
                                {character.name}
                              </h3>
                              <p className="text-lg text-gray-400 italic">
                                {character.subtitle}
                              </p>
                            </div>

                            {/* Description */}
                            <p className="text-gray-500 text-center leading-relaxed mb-6">
                              {character.description}
                            </p>

                            {/* Personality traits */}
                            <p className="text-gray-400 text-sm text-center font-medium">
                              {character.personality}
                            </p>

                            {/* Disabled overlay */}
                            <div className="absolute inset-0 bg-black/20 rounded-2xl pointer-events-none" />
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <Link
                          key={character.name}
                          href={character.domain}
                          className="group block w-full max-w-md"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 p-8 h-full transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 animate-float group-hover:border-white/40">

                            {/* Character icon */}
                            <div className="text-5xl mb-6 text-center group-hover:scale-110 transition-transform duration-300">
                              {character.icon}
                            </div>

                            {/* Character name and subtitle */}
                            <div className="text-center mb-6">
                              <h3 className={`text-3xl font-bold mb-2 bg-gradient-to-r ${character.gradient} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}>
                                {character.name}
                              </h3>
                              <p className="text-lg text-purple-200 italic">
                                {character.subtitle}
                              </p>
                            </div>

                            {/* Description */}
                            <p className="text-white/70 text-center leading-relaxed group-hover:text-white/90 transition-colors duration-300 mb-6">
                              {character.description}
                            </p>

                            {/* Personality traits */}
                            <p className="text-purple-200 text-sm text-center font-medium">
                              {character.personality}
                            </p>

                            {/* Hover effect overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500 rounded-2xl pointer-events-none" />

                            {/* Animated border on hover */}
                            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </div>
                        </Link>
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="text-center mt-16">
            <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto animate-glow">
              <h2 className="text-3xl font-bold text-white mb-4">
                🌟 Choose Your Destiny
              </h2>
              <p className="text-purple-200 mb-6 text-lg">
                Each realm offers unique experiences, personalities, and adventures. 
                Step through any portal and discover your perfect connection.
              </p>
              <div className="flex justify-center space-x-4">
                <span className="text-pink-300">💫 Unlimited conversations</span>
                <span className="text-purple-300">🧠 Perfect memory</span>
                <span className="text-indigo-300">
                  {process.env.NEXT_PUBLIC_HIDE_NSFW_MARKETING === 'true' 
                    ? '🔓 Premium features available'
                    : '🔓 NSFW available'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Back to main link */}
          <div className="text-center mt-12">
            <Link 
              href="/"
              className="inline-flex items-center text-purple-300 hover:text-white transition-colors duration-300 text-lg group"
            >
              <span className="mr-2 group-hover:transform group-hover:translate-x-1 transition-transform duration-300">←</span>
              Return to Current Realm
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}