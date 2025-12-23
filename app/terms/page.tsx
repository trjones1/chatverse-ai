export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      {/* Hero */}
      <div className="rounded-2xl p-6 mb-6 bg-gradient-to-r from-pink-500/15 via-fuchsia-500/10 to-violet-500/15 ring-1 ring-white/10">
        <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="text-sm opacity-80 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Body */}
      <article className="prose prose-neutral max-w-none">
        <h2>1. Overview</h2>
        <p>
          This service provides AI-generated chat and related features for entertainment and productivity.
          By accessing or using the service, you agree to these terms.
        </p>
        <p>This app is for entertainment purposes only. Use responsibly. I am not liable for your emotional damage. 💅</p>

        <h2>2. Accounts</h2>
        <p>
          You must provide accurate information and maintain the security of your account.
          You’re responsible for all activity under your credentials.
        </p>

        <h2>3.Billing</h2>
        <p>
          Purchases are processed by Gumroad. Prices, features and access
          levels (e.g., VerseCoins) are described in the product UI and may change with notice.
        </p>

        <h2>4. Acceptable Use</h2>
        <ul>
          <li>No illegal content or activities.</li>
          <li>No exploitation, harassment, or hate speech.</li>
          <li>No attempts to break, scrape, or overload the service.</li>
        </ul>

        <h2>5. Content</h2>
        <p>
          Responses may be AI-generated and not factual. You’re responsible for how you use the content.
          We may remove content that violates these terms.
        </p>

        <h2>6. Termination</h2>
        <p>
          We may suspend or terminate accounts that violate these terms. You may cancel at any time via the billing portal.
        </p>

        <h2>7. Disclaimers &amp; Liability</h2>
        <p>
          Service is provided “as is” without warranties. To the fullest extent permitted by law, we are not liable
          for indirect or consequential damages.
        </p>

        <h2>8. Changes</h2>
        <p>
          We may update these terms. Continued use constitutes acceptance of the updated terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          For questions, contact <a href="mailto:lexi@chatverse.ai">lexi@chatverse.ai</a>.
        </p>
      </article>
    </main>
  );
}
