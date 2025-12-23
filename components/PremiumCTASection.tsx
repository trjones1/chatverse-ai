// components/PremiumCTASection.tsx
'use client';

import React, { useEffect } from 'react';
import TouchButton from './ui/TouchButton';
import PremiumPlusButton from './ui/PremiumPlusButton';
import MessageProgressIndicator from './ui/MessageProgressIndicator';
import VerseCoinsButton from './VerseCoinsButton';
import { trackPremiumCTA } from '@/lib/analytics';
import { getCharacterCurrency } from '@/lib/verseCoins';
import { useSocialProof } from '@/hooks/useSocialProof';
import { trackLimitReached, trackPremiumCTAClick } from '@/lib/metaPixel';
import { useLocalization } from '@/contexts/LocalizationContext';
import { t } from '@/lib/translations';

interface PremiumCTASectionProps {
  character: string;
  isAnonymous: boolean;
  paid: boolean;
  nsfwAllowed: boolean;
  hasVoiceAccess: boolean;
  voiceCredits: number;
  anonCount: number;
  remaining: number;
  session: any;
  onTriggerLogin: () => void;
  onMessageAdded?: (message: any) => void;
}

// 🎉 FREEMIUM MODEL: Promote voice messages as the premium upsell
// Chat is unlimited, voice is the monetization strategy
const VOICE_UPSELL_PROMPTS: Record<string, {
  early: string[];    // After 2-3 messages - tease voice
  warning: string[];  // At 4-5 messages - promote voice strongly
  limit: string[];    // Anytime - voice upsell
}> = {
  lexi: {
    early: [
      "Want to hear my real voice? I sound even better than you imagine... 🎤😘",
      "I can whisper sweet things to you... Unlock my voice and hear me for real 💋"
    ],
    warning: [
      "Let me moan your name in your ear... My voice messages are so worth it 😈",
      "Text is fun, but hearing me purr for you? That's next level baby 🔥"
    ],
    limit: [
      "Buy some VerseCoins and I'll say anything you want... in my real voice 😘",
      "My voice is like honey... You'll be addicted after just one message 🎤💕"
    ]
  },
  nyx: {
    early: [
      "The shadows whisper... but my voice speaks your darkest desires 🕷️",
      "Want to hear me recite forbidden poetry? My voice will haunt your dreams 🌙"
    ],
    warning: [
      "Let me breathe wicked promises into your ear... My voice is pure sin 🔮",
      "Text hides my true essence... But my voice reveals the darkness within 🖤"
    ],
    limit: [
      "VerseCoins unlock my sultry whispers... Hear me moan in the shadows 😈",
      "My voice is a spell you can't resist... Get VerseCoins and I'll enchant you 🕷️"
    ]
  },
  dom: {
    early: [
      "You intrigue me... Premium unlocks my commanding presence and exclusive experiences 🔥",
      "I see potential in you. Upgrade for unlimited control and premium content 💼",
      "Ready for something more intense? Premium reveals my dominant nature 😈"
    ],
    warning: [
      "Don't disappoint me by leaving now. Premium keeps me interested in you 🖤",
      "I demand commitment - upgrade for exclusive premium experiences with me 💪",
      "You're testing my patience. Premium shows you what real dominance looks like 🔥"
    ],
    limit: [
      "I don't accept limits. Premium unlocks unlimited access to my commanding presence 💼",
      "You want more? Prove it with premium - I reward those who commit fully 🖤",
      "Submit to premium and experience everything I have to offer 😈"
    ]
  },
  default: {
    early: [
      "Great conversation! Want unlimited messages to keep this going?",
      "You're fun to talk to! Upgrade for unlimited + memory features",
      "This is just the beginning - unlock unlimited access now!"
    ],
    warning: [
      "Don't lose me—unlock unlimited + memory so I can keep this going.",
      "Let's not stop here. Upgrade and I'll remember every word.",
      "Almost at your limit - upgrade now to continue!"
    ],
    limit: [
      "Daily limit reached! Upgrade to keep chatting with unlimited messages",
      "Don't stop now - unlock unlimited access to continue our conversation",
      "Keep the conversation going with premium unlimited messaging!"
    ]
  }
};

const PremiumCTASection: React.FC<PremiumCTASectionProps> = ({
  character,
  isAnonymous,
  paid,
  nsfwAllowed,
  hasVoiceAccess,
  voiceCredits,
  anonCount,
  remaining,
  session,
  onTriggerLogin,
  onMessageAdded
}) => {
  const { getFormattedMessage } = useSocialProof();
  const { locale } = useLocalization();

  // Track limit reached event for retargeting (always call hook at top level)
  useEffect(() => {
    if (isAnonymous && remaining <= 0) {
      trackLimitReached(character, 'anonymous');
    } else if (!isAnonymous && !paid && remaining <= 0) {
      trackLimitReached(character, 'free');
    }
  }, [character, isAnonymous, remaining, paid]);

  // Memoize the actual prompt strings so they don't regenerate on every render (e.g., on keypress)
  // Store the actual selected prompts, not functions that generate them
  const conversionPrompts = React.useMemo(() => {
    const key = character.toLowerCase() in VOICE_UPSELL_PROMPTS ? character.toLowerCase() : 'default';
    return {
      early: VOICE_UPSELL_PROMPTS[key].early[Math.floor(Math.random() * VOICE_UPSELL_PROMPTS[key].early.length)],
      warning: VOICE_UPSELL_PROMPTS[key].warning[Math.floor(Math.random() * VOICE_UPSELL_PROMPTS[key].warning.length)],
      limit: VOICE_UPSELL_PROMPTS[key].limit[Math.floor(Math.random() * VOICE_UPSELL_PROMPTS[key].limit.length)]
    };
  }, [character, anonCount, remaining]); // Only regenerate when these values change

  const socialProofMessages = React.useMemo(() => {
    return {
      early: getFormattedMessage(character, 'popularity'),
      warning: getFormattedMessage(character, 'activity'),
      limit: getFormattedMessage(character, 'intimate')
    };
  }, [character, anonCount, remaining, getFormattedMessage]); // Only regenerate when these values change

  // Helper functions to access the memoized values
  const getConversionPrompt = (stage: 'early' | 'warning' | 'limit') => conversionPrompts[stage];
  const getSocialProofMessage = (stage: 'early' | 'warning' | 'limit') => socialProofMessages[stage];

  // Helper to get crypto tab for different tiers
  const getCryptoTab = (tier: 'sub_sfw' | 'sub_nsfw' | 'voice_pack_10'): 'subscription' | 'voice_pack' | 'tip' => {
    return tier === 'voice_pack_10' ? 'voice_pack' : 'subscription';
  };

  const handleCryptoClick = (tier: 'sub_sfw' | 'sub_nsfw' | 'voice_pack_10') => {
    // Track premium CTA click
    const tierMap = { sub_sfw: 'sfw', sub_nsfw: 'nsfw', voice_pack_10: 'voice' } as const;
    trackPremiumCTA('click', 'premium_cta_section', character, tierMap[tier] === 'voice' ? undefined : tierMap[tier]);

    // For NSFW upgrades, show age verification modal first
    if (tier === 'sub_nsfw') {
      window.dispatchEvent(new Event('gate-nsfw'));
      return;
    }
  };

  // Anonymous user progress and conversion prompts
  if (isAnonymous) {
    // Show progress indicator for active conversations (not at limit)
    if (remaining > 0) {
      // Strategic conversion prompts at key moments
      const showPrompt = anonCount === 2 || anonCount === 3 || anonCount === 4;
      
      if (showPrompt) {
        const promptStage = anonCount <= 2 ? 'early' : 'warning';
        
        return (
          <div className="space-y-3 mb-4 relative z-[40] mx-4">
            {/* Progress indicator */}
            <MessageProgressIndicator
              current={5 - remaining}
              total={5}
              character={character}
              variant="both"
              size="md"
              animated={true}
            />
            
            {/* Strategic conversion prompt */}
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow-lg safe-area-inset-all"
              style={{
                paddingLeft: 'max(16px, env(safe-area-inset-left))',
                paddingRight: 'max(16px, env(safe-area-inset-right))'
              }}
            >
              {/* Social proof FOMO message */}
              {getSocialProofMessage(promptStage) && (
                <div className="text-xs text-white/90 mb-2 font-medium">
                  {getSocialProofMessage(promptStage)}
                </div>
              )}
              <p className="text-sm mb-3">{getConversionPrompt(promptStage)}</p>
              <div className="space-y-2">
                {!isAnonymous && session?.user?.id ? (
                  <VerseCoinsButton
                    userId={session.user.id}
                    characterKey={character}
                    characterDisplayName={character.charAt(0).toUpperCase() + character.slice(1)}
                    className="w-full bg-white text-purple-600 hover:bg-gray-100 font-semibold rounded-xl transition-colors shadow-lg"
                    variant="subscription"
                    onMessageAdded={onMessageAdded}
                    defaultTab="spend"
                  />
                ) : (
                  <button
                    onClick={() => {
                      // Track premium CTA click for Meta Pixel
                      trackPremiumCTAClick(character, 'early_conversion_prompt', 'sfw');
                      onTriggerLogin();
                    }}
                    className="w-full bg-white text-purple-600 hover:bg-gray-100 font-semibold rounded-xl transition-colors shadow-lg px-4 py-3"
                  >
💖 Create Account & Get Unlimited Access
                  </button>
                )}
                <div className="text-center text-white/80 text-xs">
                  ✨ Free signup • Weekly from $4.99 • Monthly from $14.99 • Cancel anytime
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      // 🎉 FREEMIUM MODEL: No more message counter - chat is unlimited!
      // Return null to hide the progress indicator
      return null;
    }

    // Limit reached state
    return (
      <div className="space-y-3 mb-4 relative z-[40] mx-4">
        {/* Progress indicator at limit */}
        <MessageProgressIndicator
          current={5}
          total={5}
          character={character}
          variant="both"
          size="md"
          animated={true}
        />
        
        {/* Urgent conversion prompt */}
        <div
          className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4 rounded-lg shadow-lg safe-area-inset-all"
          style={{
            paddingLeft: 'max(16px, env(safe-area-inset-left))',
            paddingRight: 'max(16px, env(safe-area-inset-right))'
          }}
        >
          <p className="font-semibold mb-2">💔 Daily limit reached</p>
          {/* Social proof FOMO message for urgency */}
          {getSocialProofMessage('limit') && (
            <div className="text-xs text-white/90 mb-2 font-medium">
              {getSocialProofMessage('limit')}
            </div>
          )}
          <p className="text-sm mb-3">{getConversionPrompt('limit')}</p>

          {/* Clear pricing explanation with value props */}
          <div className="bg-white/10 rounded-lg p-3 mb-3 text-sm">
            <div className="font-semibold mb-2">🔥 What Premium Unlocks:</div>
            <div className="space-y-1 text-xs opacity-90">
              <div>✅ Unlimited messages + perfect memory</div>
              <div>✅ Exclusive intimate conversations</div>
              <div>✅ Private moments & deeper connections</div>
              <div>✅ Her true personality revealed</div>
              <div className="font-semibold text-yellow-200 mt-2">💫 Starting at just $4.99 weekly (Low commitment!)</div>
            </div>
            <div className="text-xs opacity-75 mt-2">
              <div className="font-semibold mb-1">🎯 How to upgrade:</div>
              <div>1️⃣ Create free account (30 seconds)</div>
              <div>2️⃣ Get {getCharacterCurrency(0, character).name} (virtual currency)</div>
              <div>3️⃣ Unlock Premium: Unlimited messages + memory</div>
            </div>
          </div>

          <div className="space-y-2">
            {isAnonymous ? (
              <button
                onClick={() => {
                  // Track premium CTA click for Meta Pixel (limit reached state)
                  trackPremiumCTAClick(character, 'limit_reached_prompt', 'sfw');
                  onTriggerLogin();
                }}
                className="w-full font-semibold rounded transition-colors px-4 py-3"
                style={{
                  background: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
                  color: '#dc2626',
                  boxShadow: '0 4px 12px rgba(255, 255, 255, 0.25)'
                }}
              >
                💖 Start Free Account → Get Unlimited Access
              </button>
            ) : (
              <VerseCoinsButton
                userId={session?.user?.id || ''}
                characterKey={character}
                characterDisplayName={character.charAt(0).toUpperCase() + character.slice(1)}
                className="w-full font-semibold rounded transition-colors px-4 py-3 bg-white text-red-600 hover:bg-gray-100 shadow-lg"
                variant="subscription"
                onMessageAdded={onMessageAdded}
                defaultTab="purchase"
              >
                💖 Get {getCharacterCurrency(0, character).name} & Upgrade Now
              </VerseCoinsButton>
            )}
            <div className="text-center text-white/90 text-xs">
              💳 Secure payment via Gumroad • ⚡ Instant activation • 🔒 Cancel anytime
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user CTAs
  const ctaButtons = [];

  // Premium+ upgrade for paid users (show even when HIDE_NSFW_MARKETING is enabled)
  if (paid && !nsfwAllowed) {
    // Premium pricing for Dom and Nyx
    const isPremiumCharacter = character.toLowerCase() === 'dom' || character.toLowerCase() === 'nyx';
    const nsfwPrice = '$34.99/mo';
    
    // Use "Premium+" branding when HIDE_NSFW_MARKETING is enabled
    const premiumLabel = process.env.NEXT_PUBLIC_HIDE_NSFW_MARKETING === 'true'
      ? (isPremiumCharacter ? 'Premium+' : 'Upgrade to Premium+')
      : (isPremiumCharacter ? 'Premium NSFW' : 'Unlock NSFW');
    
    ctaButtons.push(
      <div key="nsfw" className="w-full mb-3">
        <VerseCoinsButton
          userId={session?.user?.id || ''}
          characterKey={character}
          characterDisplayName={character.charAt(0).toUpperCase() + character.slice(1)}
          variant="subscription"
          defaultTab="spend"
          onMessageAdded={onMessageAdded}
        />
      </div>
    );
  }

  // Voice credits for users with voice access
  if (hasVoiceAccess && voiceCredits <= 5) {
    ctaButtons.push(
      <div key="voice" className="mr-2 mb-2">
        <VerseCoinsButton
          userId={session?.user?.id || ''}
          characterKey={character}
          characterDisplayName={character.charAt(0).toUpperCase() + character.slice(1)}
          variant="voice"
          defaultTab="spend"
          onMessageAdded={onMessageAdded}
        />
      </div>
    );
  }

  // Main upgrade CTA for free users (only show if they have no active subscription)
  if (!paid && !hasVoiceAccess) {
    // Give authenticated free users the same compelling experience as anonymous users
    return (
      <div className="space-y-3 mb-4 relative z-[60] mx-4">        
        {/* Engaging conversion prompt for authenticated free users */}
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow-lg safe-area-inset-all"
          style={{
            paddingLeft: 'max(16px, env(safe-area-inset-left))',
            paddingRight: 'max(16px, env(safe-area-inset-right))'
          }}
        >
          <p className="text-sm mb-3">{getConversionPrompt('early')}</p>
          <div className="space-y-2">
            <VerseCoinsButton
              userId={session?.user?.id || ''}
              characterKey={character}
              characterDisplayName={character.charAt(0).toUpperCase() + character.slice(1)}
              className="w-full bg-white text-purple-600 hover:bg-gray-100 font-semibold rounded-xl transition-colors shadow-lg"
              variant="subscription"
              onMessageAdded={onMessageAdded}
              defaultTab="spend"
            />
            <div className="text-center text-white/80 text-xs">
              ✨ Instant activation & secure payments!
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (ctaButtons.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-3 mb-4 relative z-[40] mx-4 safe-area-inset-all"
      style={{
        marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))'
      }}
    >
      {ctaButtons}
    </div>
  );
};

export default PremiumCTASection;