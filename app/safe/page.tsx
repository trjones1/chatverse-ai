export const dynamic = 'force-static';

export const metadata = {
  title: 'Welcome',
  description: 'Neutral landing page',
  robots: { index: false, follow: false }, // avoid search indexing
};

export default function SafePage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-6 text-center shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-gray-900">All set.</h1>
        <p className="text-sm text-gray-700">
          You’re on a neutral screen. Press the button below to continue.
        </p>

        <div className="mt-6 flex gap-3 justify-center">
          <a href="/" className="inline-flex items-center rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors">
            Go to Home
          </a>
          <a href="/dashboard" className="inline-flex items-center rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors">
            Dashboard
          </a>
        </div>

        <p className="text-xs text-gray-600 mt-4">Tip: Use ⌘/Ctrl + H to quick-hide anytime.</p>
      </div>
    </main>
  );
}
