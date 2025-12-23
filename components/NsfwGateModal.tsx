"use client";

import { useCallback, useEffect, useState } from "react";

// If your project exposes this helper, keep the import. Otherwise replace `unlockNsfw` with your checkout logic.
// Adjust the path if needed.
import { openCheckout } from "@/lib/checkout";
import { useCharacterKey } from "@/lib/useCharacter";
import { useAuth } from "@/contexts/AuthContext";
import TouchButton from "./ui/TouchButton";
import PremiumPlusButton from "./ui/PremiumPlusButton";

export default function NsfwGateModal({ characterKey }: { characterKey?: string }) {
  const dynamicCharacterKey = useCharacterKey();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmed18, setConfirmed18] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("gate-nsfw", handler as EventListener);
    return () => window.removeEventListener("gate-nsfw", handler as EventListener);
  }, []);

  const close = useCallback(() => {
    // If user confirmed age but chose SFW only, still dispatch verification event
    if (confirmed18) {
      console.log('🔞 NSFW Gate Modal: Age verified, continuing with SFW only');
      window.dispatchEvent(new Event('nsfw-verified'));
    }
    
    setOpen(false);
    setConfirmed18(false);
  }, [confirmed18]);

  const unlockNsfw = useCallback(async () => {
    if (loading) return; // Prevent multiple clicks
    
    console.log('🔞 NSFW Gate Modal v2: unlockNsfw called', {
      confirmed18,
      characterKey,
      dynamicCharacterKey
    });
    
    if (!confirmed18) {
      console.log('🔞 NSFW Gate Modal: Not confirmed 18+, returning early');
      return;
    }
    
    setLoading(true);
    
    try {
      // Dispatch age verification confirmation event
      console.log('🔞 NSFW Gate Modal: Age verification confirmed, dispatching event');
      window.dispatchEvent(new Event('nsfw-verified'));
      
      // Use dynamic character key from domain mapping, fallback to prop
      const activeCharacterKey = characterKey || dynamicCharacterKey;
      const meta = activeCharacterKey ? { character_key: activeCharacterKey } : undefined;
      
      const checkoutOpts = {
        ...meta,
        session: session, // Pass the AuthContext session!
        successUrl: `${window.location.origin}/success?upgrade=nsfw`,
        cancelUrl: `${window.location.origin}/dashboard`
      };
      
      console.log('🔞 NSFW Gate Modal: About to call openCheckout', {
        tier: 'sub_nsfw',
        checkoutOpts,
        activeCharacterKey,
        hasSession: !!session
      });
      
      await openCheckout("sub_nsfw", checkoutOpts);
    } catch (error) {
      console.error('NSFW checkout error:', error);
    } finally {
      setLoading(false);
    }
  }, [confirmed18, characterKey, dynamicCharacterKey, session, loading]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nsfw-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={close} />

      {/* Modal - adjusted for mobile height */}
      <div className="relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-6">
        <div className="text-center mb-6">
          {/* Icon with gradient background */}
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
            <span className="text-3xl">🔞</span>
          </div>
          
          <h2 id="nsfw-title" className="text-2xl font-bold mb-3">Adult content ahead</h2>
          
          <p className="text-gray-600 text-base leading-relaxed mb-6">
            This experience may include explicit content. By continuing you confirm you are at least 18 years old and agree to our Terms and Privacy Policy.
          </p>
        </div>

        <label className="flex items-start gap-3 text-base mb-6 select-none p-4 rounded-xl border-2 border-gray-200 hover:border-pink-300 transition-colors cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            checked={confirmed18}
            onChange={(e) => setConfirmed18(e.target.checked)}
          />
          <span className="font-medium">
            I confirm I am 18+ and want to view {process.env.NEXT_PUBLIC_HIDE_NSFW_MARKETING === 'true' ? 'Premium+' : 'NSFW'} content.
          </span>
        </label>

        <div className="space-y-3">
          <div className="w-full">
            <PremiumPlusButton
              onClick={unlockNsfw}
              disabled={!confirmed18 || loading}
              loading={loading}
              loadingText="Opening checkout..."
              size="lg"
              className="w-full"
              showRibbon={true}
              ribbonText={process.env.NEXT_PUBLIC_HIDE_NSFW_MARKETING === 'true' ? 'PREMIUM+' : 'NSFW'}
              style={{
                background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                color: '#ffffff',
                boxShadow: '0 8px 20px -8px rgba(244,63,94,0.45)',
                borderRadius: '12px',
                padding: '16px 24px',
                opacity: (!confirmed18 || loading) ? 0.4 : 1,
                width: '100%'
              }}
            >
              {process.env.NEXT_PUBLIC_HIDE_NSFW_MARKETING === 'true' 
                ? 'Unlock Premium+ — $34.99/mo' 
                : 'Unlock NSFW — $34.99/mo'
              }
            </PremiumPlusButton>
          </div>
          
          <TouchButton
            onClick={close}
            variant="outline"
            size="lg"
            className="w-full font-semibold"
            style={{
              background: 'transparent',
              color: '#374151',
              border: '2px solid #d1d5db',
              borderRadius: '12px',
              padding: '16px 24px'
            }}
          >
            Continue SFW only
          </TouchButton>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
          Need help? <a href="/contact" className="underline text-pink-600 hover:text-pink-700">Contact us</a><br />
          Read our <a href="/tos" className="underline text-pink-600 hover:text-pink-700">Terms</a> and <a href="/privacy" className="underline text-pink-600 hover:text-pink-700">Privacy</a>
        </p>
      </div>
    </div>
  );
}