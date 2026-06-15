"use client";

import { useEffect, useRef, useState } from "react";
import { ChangiOutlook, StampLogo } from "@/components/Brand";
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

/**
 * Featured flights for the landing chips. DECISION: a hand-picked editorial
 * set (the world's-longest SIN→EWR, SIN→HKG, and the family's flagship
 * SQ345), not schedule-ranked — these are the recognizable ones for this
 * app's users. Label is "POPULAR FLIGHTS" (not "FROM CHANGI") because SQ345
 * arrives at Changi rather than departing it.
 */
const FEATURED_FLIGHTS: { no: string; from: string; to: string }[] = [
  { no: "SQ22", from: "SIN", to: "EWR" },
  { no: "SQ874", from: "SIN", to: "HKG" },
  { no: "SQ345", from: "ZRH", to: "SIN" },
];

function PopularChips({ onPick }: { onPick: (flightNo: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <span className="font-mono text-xs font-bold tracking-[0.08em]">
          POPULAR FLIGHTS:
        </span>
        {FEATURED_FLIGHTS.map((p) => (
          <button
            key={p.no}
            type="button"
            onClick={() => onPick(p.no)}
            className="min-h-11 cursor-pointer border-2 border-black bg-white px-2.5 py-1 font-mono text-xs font-bold shadow-brutal transition-colors duration-50 hover:bg-pink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
          >
            {p.no} {p.from}→{p.to}
          </button>
        ))}
      </div>
    </div>
  );
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

  // stale-run guard: bumping the id (new generate, or logo reset) makes any
  // in-flight request discard its result instead of resurrecting the page
  const runRef = useRef(0);

  function resetToLanding() {
    runRef.current++;
    setBriefing(null);
    setError(null);
    setManual(false);
    setInitialParams(null);
    setStamp("");
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function generate(p: GenerateParams) {
    const runId = ++runRef.current;
    setBusy(true);
    setError(null);
    setBriefing(null);
    try {
      const q = new URLSearchParams(
        Object.entries(p).filter(([, v]) => v) as [string, string][],
      );
      const r = await fetch("/api/briefing?" + q);
      const j = await r.json();
      if (runRef.current !== runId) return; // user left for the landing page
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
      if (runRef.current === runId)
        setError(
          "Couldn't reach the briefing service — check your connection.",
        );
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
     
  }, []);

  return (
    <>
      <header className="flex items-center justify-between gap-x-2.5 border-b-2 border-black bg-primary px-5 py-3 max-[640px]:px-3.5 max-[640px]:py-2.5">
        <div className="flex items-center gap-3.5">
          {/* the logo is the way home: real link (middle-click works), plain
              click resets to the landing state without a reload */}
          <a
            href="/"
            aria-label="SmoothAir — back to start"
            onClick={(e) => {
              e.preventDefault();
              resetToLanding();
            }}
            className="inline-block cursor-pointer active:translate-x-[2px] active:translate-y-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
          >
            <StampLogo />
          </a>
          <span className="text-lg font-bold uppercase leading-[1.45] tracking-[0.08em]">
            TURBULENCE
            <br />
            BRIEFING
          </span>
        </div>
        <ChangiOutlook />
      </header>

      <main className="mx-auto flex max-w-[880px] flex-col gap-5 px-5 pb-12 pt-6 max-[640px]:px-3.5 max-[640px]:pb-10 max-[640px]:pt-4">
        {/* key remounts the form when shared-link/chip params land,
            so its useState initializers pick them up */}
        {!briefing && !busy && !error ? (
          // centered search-engine landing (pre-generate only)
          <div className="flex min-h-[540px] flex-col items-center justify-center gap-[26px] pb-[50px] pt-[30px] max-[640px]:min-h-[420px] max-[640px]:gap-5 max-[640px]:pb-9 max-[640px]:pt-5">
            <h1 className="text-center text-[44px] font-bold leading-[1.1] [text-wrap:balance] max-[640px]:text-3xl">
              Will my flight be bumpy?
            </h1>
            <div className="w-full max-w-[580px]">
              <FlightForm
                key={initialParams ? JSON.stringify(initialParams) : "default"}
                busy={busy}
                manual={manual}
                initial={initialParams}
                onToggleManual={() => setManual(!manual)}
                onGenerate={generate}
              />
            </div>
            <PopularChips
              onPick={(no) => {
                const p = { flight: no, date: "" };
                setInitialParams(p);
                generate(p);
              }}
            />
          </div>
        ) : (
          <FlightForm
            key={initialParams ? JSON.stringify(initialParams) : "default"}
            busy={busy}
            manual={manual}
            initial={initialParams}
            onToggleManual={() => setManual(!manual)}
            onGenerate={generate}
          />
        )}

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

        <footer className="border-t-2 border-black pt-4 text-center font-mono text-xs leading-relaxed text-text-secondary">
          <div>
            Forecasts for turbulence are limited by nature; treat this like a rain forecast, not for professional flight planning. Pilots see far more than this app and steer around the worst of it.
          </div>
          <div className="mt-2">
            Weather data by{" "}
            <a
              className="font-bold text-black underline transition-colors duration-50 hover:bg-pink"
              href="https://open-meteo.com/"
            >
              Open-Meteo.com
            </a>{" "}
            (CC BY 4.0) · SIGMETs by{" "}
            <a
              className="font-bold text-black underline transition-colors duration-50 hover:bg-pink"
              href="https://aviationweather.gov/"
            >
              aviationweather.gov
            </a>
            {briefing && <> · {stamp}</>}
          </div>
        </footer>
      </main>
    </>
  );
}
