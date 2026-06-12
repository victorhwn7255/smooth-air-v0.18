"use client";

/** Calm failure state — the app broke, not the flight. */
export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto my-12 max-w-[520px] border-2 border-black bg-white p-6 shadow-brutal">
      <h2 className="mb-2 text-2xl font-bold">
        Something broke — the app, not your flight
      </h2>
      <p className="mb-4 text-sm text-text-secondary">
        An unexpected error stopped this page. Your flight is fine; the
        forecast sources are fine. Reloading usually fixes it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer border-2 border-black bg-cyan px-4 py-1.5 text-xl font-bold shadow-brutal transition-colors duration-50 hover:bg-pink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
      >
        Try again
      </button>
    </main>
  );
}
