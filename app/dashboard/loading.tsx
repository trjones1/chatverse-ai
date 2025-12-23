// app/dashboard/loading.tsx
export default function Loading() {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-6 animate-pulse">
        <div className="h-6 w-40 rounded bg-gray-200/70" />
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/15 bg-white/60 supports-[backdrop-filter]:bg-white/40 backdrop-blur px-4 sm:px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 w-28 rounded bg-gray-200/70" />
                <div className="h-5 w-16 rounded-full bg-gray-200/70" />
              </div>
              <div className="h-4 w-3/4 rounded bg-gray-200/70 mb-3" />
              <div className="flex gap-2">
                <div className="h-9 w-28 rounded-full bg-gray-200/70" />
                <div className="h-9 w-28 rounded-full bg-gray-200/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  