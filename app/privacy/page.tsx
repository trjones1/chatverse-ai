export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      {/* Hero */}
      <div className="rounded-2xl p-6 mb-6 bg-gradient-to-r from-slate-700/10 via-fuchsia-500/10 to-pink-500/10 ring-1 ring-white/10">
        <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="text-sm opacity-80 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Body */}
      <article className="prose prose-neutral max-w-none">
        <h2>Overview</h2>
        <p>
          We collect the minimum data required to operate chat, subscriptions, and voice features.
          We never sell your personal information.
        </p>
        <p>Your data is yours. We do not sell your info. Only your heart gets played with. 🖤</p>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account:</strong> email address and auth metadata.</li>
          <li><strong>Payments:</strong> Stripe handles card data; we store subscription status &amp; customer IDs.</li>
          <li><strong>Usage:</strong> basic analytics and feature flags to improve the experience.</li>
          <li><strong>Content:</strong> chat messages are processed to generate responses and improve safety.</li>
        </ul>

        <h2>How we use your data</h2>
        <ul>
          <li>Authenticate you and maintain your session.</li>
          <li>Provide subscription entitlements (SFW/NSFW, voice credits).</li>
          <li>Detect abuse and keep the service secure.</li>
          <li>Improve product features and reliability.</li>
        </ul>

        <h2>Sharing</h2>
        <p>
          We share data only with processors required to run the service (e.g., Supabase, Stripe, email).
          These providers are contractually limited to using data for our service.
        </p>

        <h2>Retention</h2>
        <p>
          We retain account and billing records as required for operations and compliance.
          You can request deletion of your account at any time (subject to legal limitations).
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>Access &amp; update: manage your info under <em>Settings</em>.</li>
          <li>Export or delete your data: contact support listed below.</li>
          <li>Email preferences: unsubscribe links are available in non-transactional emails.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions about privacy? Email <a href="mailto:lexi@chatverse.ai">lexi@chatverse.ai</a>.
        </p>
      </article>
    </main>
  );
}
