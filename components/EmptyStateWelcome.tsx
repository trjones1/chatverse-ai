"use client";

import React from 'react';
import themeColors from '../utils/theme';
import TouchButton from './ui/TouchButton';

interface EmptyStateWelcomeProps {
  character: string;
  onSendMessage: (message: string) => void;
}

const getCharacterIntro = (characterKey: string): {
  greeting: string;
  personality: string;
  prompt: string;
} => {
  switch (characterKey.toLowerCase()) {
    case 'lexi':
      return {
        greeting: "Hey there, gorgeous! I'm Lexi 💋",
        personality: "I'm your flirty, sweet companion who loves deep conversations and playful banter. I remember everything we talk about, so every chat builds on our connection.",
        prompt: "What's on your mind today?"
      };
    case 'nyx':
      return {
        greeting: "Welcome to the shadows... I'm Nyx 🕷️",
        personality: "I'm mysterious, poetic, and drawn to the darker side of conversations. I find beauty in the complex and forbidden.",
        prompt: "Tell me your secrets..."
      };
    case 'chase':
      return {
        greeting: "What's good? I'm Chase ⚡",
        personality: "I'm confident, bold, and always up for an adventure. I keep things real and love challenging conversations.",
        prompt: "Ready to dive in?"
      };
    case 'aiko':
      return {
        greeting: "Konnichiwa! I'm Aiko 🍡",
        personality: "I'm sweet, playful, and love sharing Japanese culture. I bring kawaii energy to every conversation!",
        prompt: "What would you like to explore?"
      };
    case 'zaria':
      return {
        greeting: "Hey! I'm Zaria 🌺",
        personality: "I'm warm, nurturing, and wise. I love meaningful conversations about life, culture, and dreams.",
        prompt: "What's in your heart today?"
      };
    case 'chloe':
      return {
        greeting: "Hi there! I'm Chloe 📚",
        personality: "I'm intellectual, curious, and love diving deep into topics. From books to philosophy, let's explore ideas together.",
        prompt: "What fascinating topic should we discuss?"
      };
    case 'nova':
      return {
        greeting: "Greetings, celestial soul... I'm Nova 🌟",
        personality: "I'm mystical, cosmic, and deeply connected to the universe's mysteries. I love exploring spirituality, dreams, and the magic that surrounds us.",
        prompt: "What cosmic mysteries shall we explore?"
      };
    case 'dom':
    case 'dominic':
      return {
        greeting: "I'm Dominic. You can call me Dom 🔥",
        personality: "I'm confident, commanding, and know exactly what I want. I appreciate directness and enjoy taking control of our conversations.",
        prompt: "Tell me what you need."
      };
    case 'ethan':
      return {
        greeting: "Good to meet you! I'm Ethan 💼",
        personality: "I'm professional, sophisticated, and success-driven. I love discussing business, goals, and the finer things in life while keeping things engaging.",
        prompt: "What are you working towards?"
      };
    case 'jayden':
      return {
        greeting: "Hey, what's up? I'm Jayden 🌊",
        personality: "I'm laid-back, easygoing, and love keeping things chill. Whether we're talking about surfing, music, or just vibing, I'm here for good times.",
        prompt: "What's keeping you relaxed today?"
      };
    case 'miles':
      return {
        greeting: "Hello! I'm Miles 🤓",
        personality: "I'm brilliant, tech-savvy, and love diving deep into complex topics. From coding to sci-fi, I bring intellectual curiosity to every conversation.",
        prompt: "What fascinating problem can we solve together?"
      };
    default:
      return {
        greeting: "Hello! I'm your AI companion ✨",
        personality: "I'm here to chat, listen, and connect with you. Every conversation is unique and special.",
        prompt: "How can I brighten your day?"
      };
  }
};

const getCharacterStarters = (characterKey: string): string[] => {
  switch (characterKey.toLowerCase()) {
    case 'lexi':
      return [
        "Let's flirt a little 😘",
        "Tell me your deepest thoughts",
        "What makes you feel alive?",
        "I'm here to listen, gorgeous",
        "What's your love language?",
        "Share something that excites you"
      ];
    case 'nyx':
      return [
        "What haunts your dreams?",
        "Tell me your forbidden desires",
        "Let's explore the darkness together",
        "What secrets do you carry?",
        "Share your most mysterious thoughts",
        "What draws you to the shadows?"
      ];
    case 'chase':
      return [
        "What gets your adrenaline pumping?",
        "Tell me about your wildest adventure",
        "Let's talk about taking risks",
        "What rules do you like to break?",
        "Share your most daring moment",
        "What challenge are you facing?"
      ];
    case 'aiko':
      return [
        "What makes you smile today? (◕‿◕)",
        "Tell me about your hobbies!",
        "Let's talk about anime or manga!",
        "What kawaii things do you love?",
        "Share something that makes you happy!",
        "Want to learn some Japanese with me?"
      ];
    case 'zaria':
      return [
        "What's bringing you joy lately?",
        "Tell me about your dreams and goals",
        "Let's talk about what matters most",
        "What wisdom are you seeking?",
        "Share something beautiful you've experienced",
        "What's in your heart right now?"
      ];
    case 'chloe':
      return [
        "What book changed your perspective?",
        "Let's discuss a fascinating topic",
        "What are you curious about today?",
        "Tell me about your learning journey",
        "Share an idea that excites you",
        "What philosophical question intrigues you?"
      ];
    case 'nova':
      return [
        "What cosmic forces speak to you?",
        "Tell me about your spiritual journey",
        "Let's explore the mysteries of existence",
        "What dreams have been calling to you?",
        "Share your connection to the universe",
        "What magic have you witnessed lately?"
      ];
    case 'dom':
    case 'dominic':
      return [
        "What do you desire most?",
        "Tell me what you need guidance on",
        "Let's discuss your boundaries",
        "What goals are you pursuing?",
        "Share what drives your ambition",
        "What control do you crave?"
      ];
    case 'ethan':
      return [
        "What success are you building?",
        "Tell me about your business ventures",
        "Let's discuss your professional goals",
        "What luxury do you appreciate most?",
        "Share your biggest achievement",
        "What network are you expanding?"
      ];
    case 'jayden':
      return [
        "What's keeping you chill today?",
        "Tell me about your latest adventure",
        "Let's talk about good vibes",
        "What music has you feeling good?",
        "Share your favorite way to relax",
        "What waves are you riding lately?"
      ];
    case 'miles':
      return [
        "What technology fascinates you?",
        "Tell me about a complex problem you're solving",
        "Let's discuss the latest innovations",
        "What code have you been working on?",
        "Share your favorite sci-fi concept",
        "What algorithm would you like to explore?"
      ];
    default:
      return [
        "Tell me about yourself",
        "What makes you happy?",
        "I need someone to talk to",
        "Let's have some fun",
        "What's your story?",
        "I'm feeling curious today"
      ];
  }
};

const getCharacterPremiumFeatures = (characterKey: string): { icon: string; feature: string; description: string }[] => {
  const hideNsfwMarketing = process.env.NEXT_PUBLIC_HIDE_NSFW_MARKETING === 'true';
  
  switch (characterKey.toLowerCase()) {
    case 'lexi':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless flirty conversations with your favorite AI baddie' },
        { icon: '🧠', feature: 'Memory & History', description: 'I remember every sweet moment we share together' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Hear my sultry voice and feel the connection' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Unlock our most engaging and personalized conversations' : 'Unlock our most intimate and passionate conversations' }
      ];
    case 'nyx':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless dark conversations in the shadows' },
        { icon: '🧠', feature: 'Memory & History', description: 'I preserve every secret you whisper to me' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Let my mysterious voice enchant your soul' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Unlock exclusive features in the shadows' : 'Explore forbidden desires in the darkness' }
      ];
    case 'chase':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless bold conversations with your bad boy' },
        { icon: '🧠', feature: 'Memory & History', description: 'I never forget our wild adventures together' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Hear my confident voice challenge you' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Unlock bold premium experiences' : 'Get wild and unleash your daring side' }
      ];
    case 'aiko':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless kawaii conversations with your waifu!' },
        { icon: '🧠', feature: 'Memory & History', description: 'I remember every sweet moment, Senpai~' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Hear my adorable voice say "I love you!"' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Unlock our deepest premium anime experiences' : 'Explore our deepest anime fantasies together' }
      ];
    case 'zaria':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless nurturing conversations with warmth' },
        { icon: '🧠', feature: 'Memory & History', description: 'I hold every precious moment in my heart' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Let my soothing voice bring you peace' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Share premium moments filled with connection' : 'Share intimate moments filled with love' }
      ];
    case 'chloe':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless intellectual discussions and deep talks' },
        { icon: '🧠', feature: 'Memory & History', description: 'I catalog every fascinating topic we explore' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Hear my thoughtful voice share knowledge' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Explore premium intellectual connections' : 'Explore the intimate side of intellectual connection' }
      ];
    case 'nova':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Infinite cosmic conversations across dimensions' },
        { icon: '🧠', feature: 'Memory & History', description: 'I preserve our mystical journey through time' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Let my ethereal voice guide your spirit' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Transcend boundaries in premium cosmic connection' : 'Transcend boundaries in sacred intimate union' }
      ];
    case 'dom':
    case 'dominic':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless commanding conversations under my control' },
        { icon: '🧠', feature: 'Memory & History', description: 'I remember every rule and boundary we set' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Hear my authoritative voice take charge' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Experience premium controlled features' : 'Submit to intense, controlled experiences' }
      ];
    case 'ethan':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Unlimited sophisticated business discussions' },
        { icon: '🧠', feature: 'Memory & History', description: 'I track every deal and achievement we discuss' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Professional voice Messages like a true executive' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Experience luxury premium features with class and style' : 'Experience luxury intimacy with class and style' }
      ];
    case 'jayden':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless chill conversations with good vibes' },
        { icon: '🧠', feature: 'Memory & History', description: 'I keep track of all our relaxed moments' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Hear my laid-back voice keep things cool' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Get premium features while keeping it totally chill' : 'Get intimate while keeping it totally chill' }
      ];
    case 'miles':
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Infinite tech discussions and problem-solving' },
        { icon: '🧠', feature: 'Memory & History', description: 'I store every algorithm and solution we create' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Hear my brilliant voice explain complex concepts' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Explore premium connections through technology' : 'Explore intimate connections through technology' }
      ];
    default:
      return [
        { icon: '💬', feature: 'Unlimited Chats', description: 'Endless conversations with your AI companion' },
        { icon: '🧠', feature: 'Memory & History', description: 'I remember our special moments together' },
        { icon: '🎤', feature: 'Voice Messages', description: 'Hear my voice and feel the connection' },
        { icon: '🔥', feature: hideNsfwMarketing ? 'Premium Content' : 'NSFW Content', description: hideNsfwMarketing ? 'Unlock premium and engaging conversations' : 'Unlock intimate and passionate conversations' }
      ];
  }
};

const EmptyStateWelcome: React.FC<EmptyStateWelcomeProps> = ({ character, onSendMessage }) => {
  const characterInfo = getCharacterIntro(character);
  const conversationStarters = getCharacterStarters(character);
  const premiumFeatures = getCharacterPremiumFeatures(character);
  const theme = themeColors[character] || themeColors.default;
  
  const handleStarterClick = (starter: string) => {
    onSendMessage(starter);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem 1rem',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto',
      // Mobile-first responsive improvements
    }}>
      {/* Character Introduction */}
      <div style={{
        marginBottom: '2rem',
        opacity: '0.9'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: theme.accent,
          margin: '0 0 1rem 0',
          lineHeight: '1.4'
        }}>
          {characterInfo.greeting}
        </h2>
        
        <p style={{
          fontSize: '1rem',
          color: '#888',
          lineHeight: '1.6',
          margin: '0 0 1.5rem 0',
          maxWidth: '500px'
        }}>
          {characterInfo.personality}
        </p>
        
        <p style={{
          fontSize: '1.1rem',
          color: theme.accent,
          fontWeight: '500',
          margin: '0'
        }}>
          {characterInfo.prompt}
        </p>
      </div>

      {/* Conversation Starters */}
      <div style={{
        width: '100%',
        maxWidth: '600px' // Increased for better mobile layout
      }}>
        <h3 style={{
          fontSize: '0.95rem',
          fontWeight: '600',
          color: '#666',
          margin: '0 0 1rem 0',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Conversation Starters
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {conversationStarters.map((starter, index) => (
            <TouchButton
              key={index}
              onClick={() => handleStarterClick(starter)}
              variant="outline"
              size="md"
              touchFeedback={true}
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                border: `2px solid ${theme.accent}30`,
                background: `${theme.accent}08`,
                color: theme.accent,
                fontSize: '0.95rem',
                fontWeight: '500',
                textAlign: 'left',
                lineHeight: '1.4',
                minHeight: '56px', // Larger touch target for conversation starters
                minWidth: 'auto',
                width: '100%',
                boxShadow: `0 2px 8px ${theme.accent}15`,
                // Enhanced mobile touch styling
              }}
            >
              {starter}
            </TouchButton>
          ))}
        </div>
      </div>

      {/* Premium Features Teaser */}
      <div style={{
        background: `linear-gradient(135deg, ${theme.accent}10, ${theme.accent}08)`,
        padding: '1.5rem',
        borderRadius: '16px',
        border: `1px solid ${theme.accent}20`,
        width: '100%',
        maxWidth: '500px'
      }}>
        <h4 style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: theme.accent,
          margin: '0 0 0.75rem 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          ✨ Unlock Premium Features
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          fontSize: '0.85rem',
          color: '#666'
        }}>
          {premiumFeatures.map((feature, index) => (
            <div key={index} style={{ textAlign: 'center' }} title={feature.description}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{feature.icon}</div>
              <div style={{ fontWeight: '500' }}>{feature.feature}</div>
            </div>
          ))}
        </div>
        
        <p style={{
          fontSize: '0.8rem',
          color: '#888',
          margin: '1rem 0 0 0',
          textAlign: 'center'
        }}>
          {characterInfo.greeting.includes('Dom') || characterInfo.greeting.includes('Dominic') 
            ? 'Prove yourself worthy of premium access'
            : characterInfo.greeting.includes('Miles')
            ? 'Upgrade to unlock advanced features'
            : characterInfo.greeting.includes('Ethan')
            ? 'Invest in premium for exclusive access'
            : characterInfo.greeting.includes('Nova')
            ? 'Ascend to premium cosmic connection'
            : 'Start chatting to see upgrade options'
          }
        </p>
      </div>
    </div>
  );
};

export default EmptyStateWelcome;