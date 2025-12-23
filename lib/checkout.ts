// lib/checkout.ts
import { createSmartCheckoutUrl, type ProductType } from './payment-utils';

type PriceKey = 'sub_sfw' | 'sub_nsfw' | 'voice_pack_10' | 'voice_pack_25' | 'voice_pack_50'| 'voice_pack_100';

type CheckoutOpts = {
  character_key?: string;
  userId?: string;
  successUrl?: string;
  cancelUrl?: string;
  onStart?: () => void;
  onFinish?: () => void;
  session?: any; // Pass session from calling component
};
import { createClient } from '@/utils/supabase/client';

// Map legacy product keys to new routing system
function mapLegacyToNewProduct(tier: PriceKey): ProductType {
  const mapping: Record<PriceKey, ProductType> = {
    'sub_sfw': 'sfw_premium',
    'sub_nsfw': 'nsfw_premium',
    'voice_pack_10': 'voice_10',
    'voice_pack_25': 'voice_25',
    'voice_pack_50': 'voice_50',
    'voice_pack_100': 'voice_100',
  };
  return mapping[tier];
}

export async function openCheckout(tier: PriceKey, opts?: CheckoutOpts) {
  const checkoutId = Math.random().toString(36).substr(2, 9);
  console.log(`🔐 [${checkoutId}] Checkout: Opening checkout for tier '${tier}'`);
  console.log(`🔐 [${checkoutId}] Checkout options:`, opts);
  
  // Add UI feedback immediately
  if (opts?.onStart) {
    console.log(`🔐 [${checkoutId}] Checkout: Calling onStart callback`);
    opts.onStart();
  }
  
  try {
    // Method 1: Use passed session if available
    let session = opts?.session;
    let user = session?.user;
    
    if (session) {
      console.log(`🔐 [${checkoutId}] Checkout: Using passed session from AuthContext`);
    } else {
      console.log(`🔐 [${checkoutId}] Checkout: No session passed, trying Supabase client`);
      // Fallback: Try multiple approaches to get session
      const supabase = createClient();
      console.log(`🔐 [${checkoutId}] Checkout: Created Supabase client`);
      
      // Method 2: Direct session check
      const { data: { session: clientSession }, error } = await supabase.auth.getSession();
      
      // Method 3: Try getUser instead  
      const { data: { user: clientUser }, error: userError } = await supabase.auth.getUser();
      
      session = clientSession;
      user = clientUser || clientSession?.user;
      
      console.log(`🔐 [${checkoutId}] Checkout: Multiple session checks:`, {
        'getSession': { hasSession: !!clientSession, hasUser: !!clientSession?.user, error: error?.message },
        'getUser': { hasUser: !!clientUser, userId: clientUser?.id, error: userError?.message }
      });
    }
    console.log(`🔐 [${checkoutId}] Checkout: Session check result:`, {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      accessToken: session?.access_token ? 'present' : 'missing',
      refreshToken: session?.refresh_token ? 'present' : 'missing',
      expiresAt: session?.expires_at,
      expiresIn: session?.expires_at ? (session.expires_at - Date.now() / 1000) : 'N/A',
      isExpired: session?.expires_at ? (session.expires_at < Date.now() / 1000) : 'N/A'
    });
    
    // Extra detailed debugging for the exact conditional check
    console.log(`🔐 [${checkoutId}] Checkout: Conditional check details:`, {
      'session': !!session,
      'session.user': !!session?.user,  
      'session.user.id': session?.user?.id,
      'user': !!user,
      'user.id': user?.id,
      'authenticatedUser': !!session?.user || !!user,
      'will_show_login': !session?.user && !user
    });
    
    // Check if user is authenticated using either method - if not, show login modal
    const authenticatedUser = session?.user || user;
    if (!authenticatedUser) {
      console.log(`🔐 [${checkoutId}] Checkout: No user found - triggering login modal`);
      console.log(`🔐 [${checkoutId}] Checkout: Current document.body.dataset.modal:`, document.body.dataset.modal);
      
      // Fire login modal with signup mode preference
      document.body.dataset.modal = 'open';
      window.dispatchEvent(new Event('open-login'));
      window.dispatchEvent(new CustomEvent('prefer-signup', { detail: { tier } }));
      
      console.log(`🔐 [${checkoutId}] Checkout: Login modal triggered, throwing error to indicate auth required`);
      throw new Error('Authentication required. Please sign in to continue with your purchase.');
    }
    
    console.log(`🔐 [${checkoutId}] Checkout: User authenticated, proceeding with checkout for:`, authenticatedUser.email);
    
    // CRITICAL: Check if this is a Premium -> Premium+ upgrade to use proration
    if (tier === 'sub_nsfw') {
      console.log(`🔐 [${checkoutId}] Checkout: Premium+ requested - checking for existing Premium subscription`);
      
      try {
        // Check if user already has an active subscription that should be upgraded
        const response = await fetch('/api/entitlements', {
          headers: { 
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (response.ok) {
          const entitlements = await response.json();
          const currentTier = entitlements?.tier;
          
          console.log(`🔐 [${checkoutId}] Checkout: Current tier:`, currentTier);
          
          // If user has Premium (SFW), upgrade existing subscription with proration
          if (currentTier === 'sfw') {
            console.log(`🔐 [${checkoutId}] Checkout: Detected Premium -> Premium+ upgrade - using upgrade API with proration`);
            
            // Redirect to upgrade API which handles proration automatically
            window.location.href = '/api/upgrade';
            return; // Don't create new subscription
          }
        }
      } catch (error) {
        console.warn(`🔐 [${checkoutId}] Checkout: Could not check entitlements, proceeding with new subscription:`, error);
      }
    }
    
    console.log(`🔐 [${checkoutId}] Checkout: Generating smart checkout URL with dual processor routing`);
    
    // Use new dual processor routing system
    const productType = mapLegacyToNewProduct(tier);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const defaultSuccessUrl = opts?.successUrl || `${baseUrl}/dashboard?success=${tier}`;
    const defaultCancelUrl = opts?.cancelUrl || `${baseUrl}/dashboard?cancelled=${tier}`;
    
    const { url, processor, isNsfw } = createSmartCheckoutUrl({
      productType,
      characterKey: opts?.character_key,
      userId: authenticatedUser.id,
      successUrl: defaultSuccessUrl,
      cancelUrl: defaultCancelUrl,
      hostname: window.location.hostname,
    });
    
    console.log(`🔐 [${checkoutId}] Checkout: Routing decision:`, {
      product: productType,
      processor,
      isNsfw,
      character: opts?.character_key
    });
    
    if (processor === 'segpay' && !process.env.NEXT_PUBLIC_SEGPAY_ENABLED) {
      console.log(`🔐 [${checkoutId}] Checkout: Segpay not yet enabled, falling back to Stripe with correct pricing`);
      // Keep the same tier for fallback - don't change NSFW to SFW pricing
      console.log(`🔐 [${checkoutId}] Checkout: Using Stripe fallback with original tier:`, tier);
      
      // Make POST request to checkout API with original tier
      const fallbackResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          tier: tier, // Keep original tier (e.g., sub_nsfw for Premium+)
          character_key: opts?.character_key || 'lexi'
        })
      });
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.url) {
          console.log(`🔐 [${checkoutId}] Checkout: Redirecting to Stripe fallback with correct tier:`, tier, fallbackData.url);
          window.location.href = fallbackData.url;
          return;
        }
      }
      
      throw new Error('Fallback checkout also failed');
    }
    
    console.log(`🔐 [${checkoutId}] Checkout: Making POST request to checkout API:`, url);
    
    // Modern checkout API expects POST with JSON body
    const checkoutResponse = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        tier: tier, // Use legacy tier format that API expects
        character_key: opts?.character_key || 'lexi'
      })
    });
    
    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      console.error(`🔐 [${checkoutId}] Checkout API error:`, errorData);
      throw new Error(errorData.error || 'Checkout failed');
    }
    
    const checkoutData = await checkoutResponse.json();
    console.log(`🔐 [${checkoutId}] Checkout: Received Stripe session:`, {
      sessionId: checkoutData.id,
      hasUrl: !!checkoutData.url
    });
    
    if (checkoutData.url) {
      console.log(`🔐 [${checkoutId}] Checkout: Redirecting to Stripe:`, checkoutData.url);
      window.location.href = checkoutData.url;
    } else {
      throw new Error('No checkout URL received from server');
    }
  } catch (error) {
    console.error(`🔐 [${checkoutId}] Checkout error:`, error);
    throw error;
  } finally {
    opts?.onFinish?.();
  }
}
