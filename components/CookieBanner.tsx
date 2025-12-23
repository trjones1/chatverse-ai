"use client";

import { useEffect, useState } from "react";

const KEY = "cookie-consent:v1" as const;

type Consent = "accepted" | "declined";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setVisible(!v);
    } catch {
      // If storage fails, keep banner visible
      setVisible(true);
    }
  }, []);

  function setConsent(value: Consent) {
    try {
      localStorage.setItem(KEY, value);
      // Broadcast for analytics to react (GTM/GA/Sentry etc.)
      window.dispatchEvent(new CustomEvent("cookie-consent", { detail: { value } }));
      // If using GA4 and want to hard-disable measurement when declined, you can handle it in a listener.
    } finally {
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[999]">
      <div className="mx-auto max-w-5xl m-4 rounded-2xl bg-white backdrop-blur-sm border border-gray-200 p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <p className="text-base font-medium text-gray-900 leading-relaxed">
            We use cookies to improve your experience and analyze traffic. By using this site, you agree to our <a href="/privacy" className="underline text-blue-600 hover:text-blue-800 font-semibold">Privacy Policy</a>.
          </p>
          <div className="flex gap-3 sm:ml-auto">
            <button
              onClick={() => setConsent("declined")}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={() => setConsent("accepted")}
              className="rounded-xl px-4 py-2.5 text-sm font-bold bg-black text-white hover:bg-gray-800 transition-colors shadow-md"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
