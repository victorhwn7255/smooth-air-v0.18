import type { Briefing } from "@/lib/types";
import { fmtDur, fmtH } from "@/lib/pipeline/narrative";
import { PlaneLandingIcon, PlaneTakeoffIcon } from "./icons";
import { numSq } from "./ZoneCard";

const chip =
  "inline-block whitespace-nowrap border-2 border-black px-2.5 py-0.5 text-xs font-bold uppercase";

/**
 * Numbered ribbon (UX debt #1): zone bands carry number squares and a
 * flow-layout legend replaces absolutely-positioned ticks — nothing can
 * collide at any width or zone count. Numbers repeat on the zone cards.
 */
export default function FlightRibbon({ b }: { b: Briefing }) {
  const total = b.waypoints[b.waypoints.length - 1].elapsedH;

  return (
    <section
      aria-label="Flight timeline"
      className="border-2 border-black bg-white p-4"
    >
      <div className="mb-2 flex items-center justify-between font-mono text-xs font-bold">
        <span className="inline-flex items-center gap-1.5">
          {b.from} <PlaneTakeoffIcon />
        </span>
        <span>FLIGHT TIMELINE</span>
        <span className="inline-flex items-center gap-1.5">
          <PlaneLandingIcon /> {b.to}
        </span>
      </div>
      <div className="relative h-14 overflow-hidden border-2 border-black bg-success">
        {b.zones.map((z, i) => (
          <div
            key={i}
            className={`absolute inset-y-0 border-x-2 border-black ${
              z.cls === "moderate" || z.cls === "severe"
                ? "bg-error"
                : "bg-warning"
            }`}
            style={{
              left: (z.startH / total) * 100 + "%",
              width: Math.max(3, ((z.endH - z.startH) / total) * 100) + "%",
            }}
          >
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className={numSq}>{i + 1}</span>
            </span>
          </div>
        ))}
      </div>
      {/* TAKEOFF/LANDING text row removed (owner's call) — the pictograms
          carry the meaning; departure time lives on the grade card */}
      <div className="mt-2.5 flex flex-col gap-1.5">
        {b.zones.map((z, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2.5 text-sm">
            <span className={numSq}>{i + 1}</span>
            <span className="whitespace-nowrap font-bold">{z.region}</span>
            <span className="whitespace-nowrap font-mono text-xs text-text-secondary">
              {fmtH((z.startH + z.endH) / 2).replace("about ", "~")} ·{" "}
              {fmtDur(Math.max(0.2, z.endH - z.startH))}
            </span>
            <span
              className={`${chip} ${z.cls === "light" ? "bg-warning" : "bg-error"}`}
            >
              {z.cls}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
