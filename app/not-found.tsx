import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] grid place-items-center p-6">
      <div className="text-center max-w-xl">
        <div className="inline-block rounded-2xl bg-black/5 dark:bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide mb-4">404</div>
        <h1 className="text-4xl font-bold mb-2">Page not found</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-2xl px-4 py-2 text-sm font-medium border border-gray-300 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10 transition"
          >
            Go home
          </Link>
          <Link
            href="/chat"
            className="rounded-2xl px-4 py-2 text-sm font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            Open chat
          </Link>
        </div>
      </div>
    </main>
  );
}