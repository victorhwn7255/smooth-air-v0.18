"use client";

/** Calm failure state — the app broke, not the weather. */
export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[880px] px-5 py-10">
      <div className="border-2 border-black bg-white p-4">
        <h2 className="mb-2 text-xl font-bold">
          Something broke — the app, not your flight.
        </h2>
        <p className="mb-4 text-sm">
          Try again in a minute. If it keeps happening, the weather service may
          be down — the briefing will fall back to clearly-labelled demo data
          when it can.
        </p>
        <button
          type="button"
          onClick={reset}
          className="cursor-pointer border-2 border-black bg-cyan px-4 py-1.5 text-xl font-bold shadow-brutal transition-colors duration-50 hover:bg-pink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
