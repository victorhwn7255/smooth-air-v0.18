"use client";

import { useEffect, useRef, useState } from "react";
import BriefingProse from "@/components/BriefingProse";
import FeedbackRow from "@/components/FeedbackRow";
import FlightForm, { type GenerateParams } from "@/components/FlightForm";
import FlightRibbon from "@/components/FlightRibbon";
import GradeCard from "@/components/GradeCard";
import RouteTable from "@/components/RouteTable";
import ZoneCard from "@/components/ZoneCard";
import type { Briefing } from "@/lib/types";

/** Shaped placeholders during the ~2s generate (UX debt #6). */
function WorkingSkeleton() {
  const bar = "animate-skel-pulse bg-surface-cream motion-reduce:bg-surface-alt";
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      <div className="border-2 border-black bg-white p-4">
        <div className={`${bar} mb-2.5 h-3.5 w-1/2`} />
        <div className={`${bar} mb-2.5 h-[30px] w-[70%]`} />
        <div className={`${bar} h-3.5 w-[85%]`} />
      </div>
      <div className="border-2 border-black bg-white p-4">
        <div className={`${bar} mb-2.5 h-12`} />
        <div className={`${bar} h-3.5 w-1/2`} />
      </div>
    </div>
  );
}

/** Nearest named regions around an open-water zone (UX debt #2). */
function openWaterLocator(b: Briefing, i0: number, i1: number): string | undefined {
  let before: string | undefined, after: string | undefined;
  for (let k = i0 - 1; k >= 0; k--)
    if (b.waypoints[k].region !== "open water") {
      before = b.waypoints[k].region;
      break;
    }
  for (let k = i1 + 1; k < b.waypoints.length; k++)
    if (b.waypoints[k].region !== "open water") {
      after = b.waypoints[k].region;
      break;
    }
  // DECISION: locator = nearest named regions before/after the gap along the
  // corridor; single-sided gaps fall back to "after X" / "before Y".
  if (before && after) return `between ${before} and ${after}`;
  if (before) return `after ${before}`;
  if (after) return `before ${after}`;
  return undefined;
}

/** Shared-link params (?flight=… or ?from=&to=&time=, optional &date=). */
function paramsFromUrl(): GenerateParams | null {
  const sp = new URLSearchParams(window.location.search);
  const date = sp.get("date") ?? "";
  const flight = sp.get("flight");
  if (flight) return { flight, date };
  const from = sp.get("from"),
    to = sp.get("to"),
    time = sp.get("time");
  if (from && to && time) return { from, to, time, date };
  return null;
}

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialParams, setInitialParams] = useState<GenerateParams | null>(
    null,
  );
  const [manual, setManual] = useState(false);
  const [stamp, setStamp] = useState("");

  async function generate(p: GenerateParams) {
    setBusy(true);
    setError(null);
    setBriefing(null);
    try {
      const q = new URLSearchParams(
        Object.entries(p).filter(([, v]) => v) as [string, string][],
      );
      const r = await fetch("/api/briefing?" + q);
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Something went wrong.");
        if (r.status === 404) setManual(true);
        return;
      }
      setBriefing(j as Briefing);
      // DECISION: replaceState (not pushState) — the address bar mirrors the
      // shown briefing for sharing/bookmarking without filling history with
      // stale briefing states the back button couldn't faithfully restore
      window.history.replaceState(null, "", "?" + q.toString());
      setStamp(
        "generated " +
          new Intl.DateTimeFormat("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
      );
    } catch {
      setError("Couldn't reach the briefing service — check your connection.");
    } finally {
      setBusy(false);
    }
  }

  // a shared deep link auto-generates its briefing on first load.
  // Params are read post-mount (never during render) so the first client
  // render matches SSR — no hydration mismatch.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const p = paramsFromUrl();
    if (p) {
      setInitialParams(p);
      if (!p.flight) setManual(true);
      generate(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 border-b-2 border-black bg-primary px-5 py-3 max-[640px]:px-3.5 max-[640px]:py-2.5">
        <div>
          <span className="inline-block bg-black px-3 py-1 text-xl font-bold text-primary">
            SMOOTHAIR
          </span>
          <span className="ml-2.5 text-xs font-bold uppercase tracking-[0.08em] max-[640px]:ml-0 max-[640px]:block">
            turbulence briefing · family edition
          </span>
        </div>
        {briefing && (
          <span className="font-mono text-xs max-[640px]:hidden">{stamp}</span>
        )}
      </header>

      <main className="mx-auto flex max-w-[880px] flex-col gap-5 px-5 pb-12 pt-6 max-[640px]:px-3.5 max-[640px]:pb-10 max-[640px]:pt-4">
        {/* key remounts the form when shared-link params land post-mount,
            so its useState initializers pick them up */}
        <FlightForm
          key={initialParams ? "shared" : "default"}
          busy={busy}
          manual={manual}
          initial={initialParams}
          onToggleManual={() => setManual(!manual)}
          onGenerate={generate}
        />

        {error && (
          <div
            role="alert"
            className="border-2 border-black bg-error px-3.5 py-2.5 font-mono text-xs font-bold"
          >
            {error}
          </div>
        )}

        {busy && (
          <>
            <div
              role="status"
              className="border-2 border-black bg-white px-3.5 py-2.5 font-mono text-xs font-bold"
            >
              {/* DECISION: no fabricated live waypoint counts — the real API
                  is a single request; honesty beats the mock's canned 42/69 */}
              Fetching winds aloft…
            </div>
            <WorkingSkeleton />
          </>
        )}

        {briefing?.demo && (
          <div
            role="status"
            className="border-2 border-black bg-warning px-3.5 py-2.5 font-mono text-xs"
          >
            Live weather unavailable — showing <b>DEMO DATA</b>. The shapes are
            realistic, but these are not this flight&apos;s real forecasts.
          </div>
        )}

        {briefing && (
          <>
            <GradeCard b={briefing} />
            <FlightRibbon b={briefing} />
            {briefing.zones.length > 0 && (
              <section className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                {briefing.zones.map((z, i) => (
                  <ZoneCard
                    key={i}
                    z={z}
                    n={i + 1}
                    locator={
                      z.region === "open water"
                        ? openWaterLocator(briefing, z.i0, z.i1)
                        : undefined
                    }
                  />
                ))}
              </section>
            )}
            <BriefingProse text={briefing.briefing} />
            <RouteTable b={briefing} />
            {briefing.depUtcMs < Date.now() && (
              <FeedbackRow
                flight={briefing.flightNo}
                date={briefing.depLocalDate}
                briefingGrade={briefing.grade.label}
              />
            )}
          </>
        )}

        <footer className="border-t-2 border-black pt-4 font-mono text-xs leading-relaxed text-text-secondary">
          <div>
            Comfort briefing only — not for flight planning or operational use.
            Forecast skill for turbulence is limited by nature; treat this like
            a rain forecast, not a promise. Crews see far more than this app
            and steer around the worst of it.
          </div>
          <div className="mt-2">
            Weather data by{" "}
            <a
              className="font-bold text-black underline transition-colors duration-50 hover:bg-pink"
              href="https://open-meteo.com/"
            >
              Open-Meteo.com
            </a>{" "}
            (CC BY 4.0) · SIGMETs by aviationweather.gov · Built for the
            family. v2 · Slock redesign
          </div>
        </footer>
      </main>
    </>
  );
}
