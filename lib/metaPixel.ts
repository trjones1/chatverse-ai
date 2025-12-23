// lib/metaPixel.ts
// Meta Pixel tracking utilities for conversion and retargeting

declare global {
  interface Window {
    fbq: any;
  }
}

// Character-specific pixel configuration
export const PIXEL_CONFIG = {
  // Default/fallback pixel - using Lexi's pixel as default
  default: '1314356866830454',

  // Character-specific pixels with your new Business Manager pixel IDs
  lexi: '1314356866830454',     // Lexi's new pixel ID
  nyx: '1846276809643832',      // Nyx's new pixel ID
  aiko: '1314356866830454',     // Using Lexi's pixel as fallback for now
  chloe: '1314356866830454',    // Using Lexi's pixel as fallback for now
  zaria: '1314356866830454',    // Using Lexi's pixel as fallback for now
  nova: '1314356866830454',     // Using Lexi's pixel as fallback for now
  dom: '1314356866830454',      // Using Lexi's pixel as fallback for now
  chase: '1314356866830454',    // Using Lexi's pixel as fallback for now
  ethan: '1314356866830454',    // Using Lexi's pixel as fallback for now
  jayden: '1314356866830454',   // Using Lexi's pixel as fallback for now
  miles: '1314356866830454'     // Using Lexi's pixel as fallback for now
};

// Helper function to update pixel configuration
export const updatePixelConfig = (character: string, pixelId: string) => {
  console.log(`📊 Meta Pixel: Updated ${character} pixel to ${pixelId}`);
  PIXEL_CONFIG[character as keyof typeof PIXEL_CONFIG] = pixelId;
};

// Get pixel ID for a specific character
export const getPixelId = (character?: string): string => {
  if (!character) return PIXEL_CONFIG.default;
  const characterKey = character.toLowerCase();
  return PIXEL_CONFIG[characterKey as keyof typeof PIXEL_CONFIG] || PIXEL_CONFIG.default;
};

// Track if Meta Pixel has been initialized to prevent double initialization
let isMetaPixelInitialized = false;

// Initialize Meta Pixel (called in layout)
export const initMetaPixel = (character?: string) => {
  if (typeof window !== 'undefined' && !isMetaPixelInitialized) {
    // Load the Facebook Pixel script only once
    (function(f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      'script',
      'https://connect.facebook.net/en_US/fbevents.js',
      null, // n parameter
      null, // t parameter
      null  // s parameter
    );

    // Initialize only the character-specific pixel for this domain
    const pixelId = getPixelId(character);
    window.fbq('init', pixelId);

    // Track initial PageView
    window.fbq('track', 'PageView');

    // Mark as initialized to prevent double initialization
    isMetaPixelInitialized = true;

    console.log(`📊 Meta Pixel initialized for character: ${character || 'default'} (${pixelId})`);
  } else if (typeof window !== 'undefined' && window.fbq) {
    // If pixel is already initialized but character changed, just track PageView
    console.log(`📊 Meta Pixel already initialized, tracking PageView for character: ${character || 'default'}`);
  }
};

// Track custom events with the initialized pixel for this domain
export const trackMetaEvent = (eventName: string, parameters?: any, character?: string) => {
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      window.fbq('track', eventName, parameters);
      const pixelId = getPixelId(character);
      console.log(`📊 Meta Pixel (${pixelId}): ${eventName}`, parameters);
    } catch (error) {
      console.error('Meta Pixel tracking error:', error);
    }
  }
};

// Specific tracking functions for your conversion funnel
export const trackPageView = (pageName?: string, character?: string) => {
  trackMetaEvent('PageView', {
    page_name: pageName,
    character: character
  }, character);
};

export const trackSignUp = (character: string, method: 'email' | 'anonymous' = 'email') => {
  trackMetaEvent('CompleteRegistration', {
    character: character,
    signup_method: method,
    content_category: 'user_registration'
  }, character);
};

export const trackSubscription = (
  tierType: 'premium' | 'premium_plus' | 'premium_weekly' | 'premium_plus_weekly',
  character: string,
  value: number,
  currency: 'USD' = 'USD'
) => {
  const isWeekly = tierType.includes('_weekly');
  const isPremiumPlus = tierType.includes('premium_plus');

  trackMetaEvent('Subscribe', {
    character: character,
    subscription_type: isPremiumPlus ? 'premium_plus' : 'premium',
    billing_cycle: isWeekly ? 'weekly' : 'monthly',
    value: value,
    currency: currency,
    content_category: 'subscription'
  }, character);

  // Also track as Purchase for conversion optimization
  trackMetaEvent('Purchase', {
    character: character,
    subscription_type: isPremiumPlus ? 'premium_plus' : 'premium',
    billing_cycle: isWeekly ? 'weekly' : 'monthly',
    value: value,
    currency: currency,
    content_type: 'subscription'
  }, character);
};

export const trackVerseCoinsPurchase = (
  character: string,
  amount: number,
  credits: number,
  value: number,
  currency: 'USD' = 'USD'
) => {
  trackMetaEvent('Purchase', {
    character: character,
    product_type: 'versecoins',
    credits_purchased: credits,
    value: value,
    currency: currency,
    content_type: 'virtual_currency'
  }, character);
};

export const trackTip = (character: string, amount: number) => {
  trackMetaEvent('Donate', {
    character: character,
    tip_amount: amount,
    content_category: 'engagement'
  }, character);
};

export const trackGift = (character: string, giftType: string, cost: number) => {
  trackMetaEvent('Purchase', {
    character: character,
    product_type: 'gift',
    gift_type: giftType,
    credits_spent: cost,
    content_type: 'virtual_gift'
  }, character);
};

export const trackVoiceMessage = (character: string, cost: number) => {
  trackMetaEvent('Purchase', {
    character: character,
    product_type: 'voice_message',
    credits_spent: cost,
    content_type: 'premium_feature'
  }, character);
};

export const trackConversationStart = (character: string, isAnonymous: boolean) => {
  trackMetaEvent('Lead', {
    character: character,
    user_type: isAnonymous ? 'anonymous' : 'registered',
    content_category: 'conversation_start'
  }, character);
};

export const trackLimitReached = (character: string, userType: 'anonymous' | 'free') => {
  trackMetaEvent('AddToWishlist', {
    character: character,
    user_type: userType,
    limit_type: 'daily_message_limit',
    content_category: 'conversion_opportunity'
  }, character);
};

export const trackGumroadCheckout = (character: string, productName: string, value: number, currency: string = 'USD') => {
  trackMetaEvent('InitiateCheckout', {
    character: character,
    product_name: productName,
    value: value,
    currency: currency,
    content_type: 'versecoins_purchase'
  }, character);
};

export const trackPremiumCTAClick = (
  character: string,
  ctaLocation: string,
  tierType?: 'sfw' | 'nsfw'
) => {
  trackMetaEvent('ViewContent', {
    character: character,
    cta_location: ctaLocation,
    tier_type: tierType,
    content_type: 'premium_upgrade_cta'
  }, character);
};

export const trackLandingPageView = (character: string, source?: string) => {
  trackMetaEvent('ViewContent', {
    character: character,
    page_type: 'landing_page',
    traffic_source: source,
    content_category: 'marketing'
  }, character);
};

// Custom audience builders for retargeting
export const trackHighValueVisitor = (character: string, actions: string[]) => {
  trackMetaEvent('AddToCart', {
    character: character,
    engagement_actions: actions,
    visitor_value: 'high',
    content_category: 'retargeting_audience'
  }, character);
};