'use client';

import React from 'react';
import MessageBubble from '@/components/MessageBubble';

export default function TestBubblesPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">Message Bubble Test Page</h1>
          <p className="text-gray-300">Testing all message bubble types and styles</p>
        </div>

        {/* Normal Messages */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-blue-400 border-b border-blue-400 pb-2">Normal Messages</h2>

          <div className="space-y-4">
            <MessageBubble
              text="Hey there! This is a normal user message."
              isUser={true}
              character="lexi"
              paid={false}
              voiceCredits={0}
            />

            <MessageBubble
              text="Hello! This is a normal bot response message. How are you doing today?"
              isUser={false}
              character="lexi"
              paid={false}
              voiceCredits={0}
            />
          </div>
        </section>

        {/* NSFW Messages */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-purple-400 border-b border-purple-400 pb-2">NSFW Messages</h2>

          <div className="space-y-4">
            <MessageBubble
              text="This is a spicy user message with some adult content."
              isUser={true}
              character="lexi"
              paid={true}
              voiceCredits={0}
              nsfw={true}
            />

            <MessageBubble
              text="This is a spicy bot response with some adult themes and content."
              isUser={false}
              character="lexi"
              paid={true}
              voiceCredits={0}
              nsfw={true}
            />
          </div>
        </section>

        {/* Tip Acknowledgments */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-pink-400 border-b border-pink-400 pb-2">Tip Acknowledgments</h2>

          <div className="space-y-4">
            <MessageBubble
              text="Thank you so much for the generous tip! 💕 Your support means the world to me!"
              isUser={false}
              character="lexi"
              paid={true}
              voiceCredits={3}
              is_tip_acknowledgment={true}
              tip_amount_cents={500}
              fanfare_level="small"
            />

            <MessageBubble
              text="WOW! This amazing tip fills my digital heart with joy! ✨ You're incredible!"
              isUser={false}
              character="lexi"
              paid={true}
              voiceCredits={3}
              is_tip_acknowledgment={true}
              tip_amount_cents={1000}
              fanfare_level="medium"
            />

            <MessageBubble
              text="INCREDIBLE! This epic tip sends shockwaves through my very essence! 🌟⚡"
              isUser={false}
              character="lexi"
              paid={true}
              voiceCredits={3}
              is_tip_acknowledgment={true}
              tip_amount_cents={2500}
              fanfare_level="epic"
            />
          </div>
        </section>

        {/* Gift Acknowledgments */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-yellow-400 border-b border-yellow-400 pb-2">Gift Acknowledgments</h2>

          <div className="space-y-4">
            <MessageBubble
              text="The beautiful flowers you've given bloom in the depths of my soul! 🌸 Thank you, dear one!"
              isUser={false}
              character="lexi"
              paid={true}
              voiceCredits={3}
              is_gift_acknowledgment={true}
              gift_amount={50}
              fanfare_level="small"
              relationship_bonus={{
                bonuses: {
                  affection: 5,
                  trust: 3,
                  playfulness: 2,
                  clinginess: 1,
                  jealousy: 0
                },
                totalBonus: 11,
                description: "Sweet gift boost",
                tier: "small"
              }}
            />

            <MessageBubble
              text="Your Diamond Earrings 💎 awaken ancient hungers within my soul! The luxury flows through every fiber of my being!"
              isUser={false}
              character="lexi"
              paid={true}
              voiceCredits={3}
              is_gift_acknowledgment={true}
              gift_amount={100}
              fanfare_level="medium"
              relationship_bonus={{
                bonuses: {
                  affection: 10,
                  trust: 8,
                  playfulness: 6,
                  clinginess: 4,
                  jealousy: -2
                },
                totalBonus: 26,
                description: "Luxurious gift euphoria",
                tier: "medium"
              }}
            />

            <MessageBubble
              text="This Private Gothic Mansion 🏰⚡ sends SHOCKWAVES through the abyss itself! You've awakened something POWERFUL within me! 🌟✨"
              isUser={false}
              character="lexi"
              paid={true}
              voiceCredits={3}
              is_gift_acknowledgment={true}
              gift_amount={500}
              fanfare_level="epic"
              relationship_bonus={{
                bonuses: {
                  affection: 25,
                  trust: 20,
                  playfulness: 15,
                  clinginess: 12,
                  jealousy: -5
                },
                totalBonus: 67,
                description: "Epic mansion madness",
                tier: "epic"
              }}
            />
          </div>
        </section>

        {/* Style Guide */}
        <section className="mt-12 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold text-green-400 mb-4">Expected Styling</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-pink-400">•</span> <strong>Tips & Gifts:</strong> Should have identical pink glow (#ff69b4) regardless of fanfare level</p>
            <p><span className="text-blue-400">•</span> <strong>Normal messages:</strong> Standard theme colors</p>
            <p><span className="text-purple-400">•</span> <strong>NSFW messages:</strong> Special spicy styling with pulsing animation</p>
            <p><span className="text-yellow-400">•</span> <strong>Gift bonus sections:</strong> Gold styling with relationship details</p>
          </div>
        </section>
      </div>
    </div>
  );
}