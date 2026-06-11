"use client";

import { useState } from "react";
import BriefingProse from "@/components/BriefingProse";
import FeedbackRow from "@/components/FeedbackRow";
import FlightForm, { type GenerateParams } from "@/components/FlightForm";
import FlightRibbon from "@/components/FlightRibbon";
import GradeCard from "@/components/GradeCard";
import RouteTable from "@/components/RouteTable";
import ZoneCard from "@/components/ZoneCard";
import type { Briefing } from "@/lib/types";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setStamp("generated " + new Date().toLocaleString());
    } catch {
      setError("Couldn't reach the briefing service — check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2.5 border-b-2 border-black bg-primary px-5 py-3">
        <div>
          <span className="inline-block bg-black px-3 py-1 text-xl font-bold text-primary">
            SMOOTHAIR
          </span>
          <span className="ml-2.5 text-xs font-bold uppercase tracking-[0.08em]">
            turbulence briefing · family edition
          </span>
        </div>
        <span className="font-mono text-xs">{stamp}</span>
      </header>

      <main className="mx-auto flex max-w-[880px] flex-col gap-5 px-5 pb-16 pt-6">
        <FlightForm
          busy={busy}
          manual={manual}
          onToggleManual={() => setManual(!manual)}
          onGenerate={generate}
        />

        {error && (
          <div className="border-2 border-black bg-error px-3.5 py-2.5 font-mono text-xs">
            {error}
          </div>
        )}

        {briefing?.demo && (
          <div className="border-2 border-black bg-warning px-3.5 py-2.5 font-mono text-xs">
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
                  <ZoneCard key={i} z={z} />
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
            family.
          </div>
        </footer>
      </main>
    </>
  );
}
