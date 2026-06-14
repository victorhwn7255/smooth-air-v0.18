"use client";

import { useEffect, useState } from "react";
import { AIRPORTS } from "@/lib/data/flightDb";
import { classify, scoreWaypoint } from "@/lib/pipeline/scoring";
import { fetchWeather } from "@/lib/sources/openmeteo";
import type { SeverityClass, Waypoint } from "@/lib/types";
import { PlaneTakeoffIcon } from "./icons";

/** Passport-stamp badge — the locked brand mark (64px square). */
export function StampLogo() {
  return (
    <span className="inline-flex w-16 flex-none flex-col items-stretch gap-[3px] border-2 border-black bg-primary p-[6px] text-black shadow-brutal">
      <span className="text-[12px] font-bold leading-[1.05] tracking-[0.01em]">
        SMOOTH
        <br />
        AIR
      </span>
      <span className="flex items-center justify-between gap-1">
        <PlaneTakeoffIcon size={10} label="SmoothAir" />
        <span className="whitespace-nowrap font-mono text-[7px]">
          01°N 104°E
        </span>
      </span>
    </span>
  );
}

const SEV_COLOR: Record<SeverityClass, string> = {
  smooth: "#2DC653",
  light: "#FF9F1C",
  moderate: "#E63946",
  severe: "#E63946",
};

/** Hour runs of non-smooth air → "light chop 18–21h" phrases (SGT hours). */
function describe(cells: { cls: SeverityClass }[]): {
  line: string;
  aria: string;
} {
  // DECISION: the 24-cell strip already shows WHEN the chop is, visually;
  // this one-liner gives the plain-language gist. (Earlier we printed hour
  // ranges like "8–0h" — cryptic, and they split confusingly across
  // midnight, so they're gone.)
  const nonSmooth = cells.filter((c) => c.cls !== "smooth").length;
  const hasRough = cells.some(
    (c) => c.cls === "moderate" || c.cls === "severe",
  );
  if (nonSmooth === 0)
    return {
      line: "smooth skies all day",
      aria: "Over Changi Airport, next 24 hours: smooth skies throughout.",
    };
  const kind = hasRough ? "rougher air" : "light chop";
  const minority = nonSmooth <= 8; // ≤ a third of the day → lead with smooth
  const summary = minority
    ? `mostly smooth · ${kind} at times`
    : `${kind} much of the day`;
  const ariaBody = minority
    ? `mostly smooth skies with ${kind} at times`
    : `${kind} much of the day`;
  return {
    line: summary,
    aria: `Over Changi Airport, next 24 hours: ${ariaBody}.`,
  };
}

/**
 * Home-airport outlook: 24 hour-cells over WSSS colored by forecast severity,
 * computed with the same pipeline as briefings (one gridpoint, 24 hours).
 * Honesty rule: on any failure show UNAVAILABLE — never a stale strip.
 */
export function ChangiOutlook() {
  const [cells, setCells] = useState<
    { cls: SeverityClass }[] | null | "failed"
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sin = AIRPORTS.SIN;
        const start = Math.floor(Date.now() / 36e5) * 36e5;
        // 24 hourly samples at the same gridpoint, reusing the briefing
        // fetcher unchanged (24 coordinates = one batched request)
        const wps: Waypoint[] = Array.from({ length: 24 }, (_, h) => ({
          lat: sin.lat,
          lon: sin.lon,
          f: h / 23,
          elapsedH: h,
          utcMs: start + h * 36e5,
          region: "the Malacca Strait",
        }));
        const wx = await fetchWeather(wps, start, start + 24 * 36e5);
        if (cancelled) return;
        setCells(
          // DECISION: narrowbody thresholds — the strip describes the air
          // itself, not a specific aircraft
          wx.map((w) => ({ cls: classify(scoreWaypoint(w).S, false) })),
        );
      } catch {
        if (!cancelled) setCells("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (cells === null) return null;
  if (cells === "failed")
    return (
      <span className="font-mono text-[10px] font-bold tracking-[0.08em] max-[640px]:hidden">
        CHANGI OUTLOOK UNAVAILABLE
      </span>
    );

  const { line, aria } = describe(cells);
  return (
    <span
      role="img"
      aria-label={aria}
      className="inline-flex flex-col items-end gap-1 text-black max-[640px]:hidden"
    >
      <span className="whitespace-nowrap font-mono text-[10px] font-bold tracking-[0.08em]">
        OVER CHANGI AIRPORT · NEXT 24 H
      </span>
      <svg
        width={24 * 7 + 2}
        height="16"
        aria-hidden="true"
        className="block [shape-rendering:crispEdges]"
      >
        <rect x="0" y="0" width={24 * 7 + 2} height="16" fill="#000000" />
        {cells.map((c, i) => (
          <rect
            key={i}
            x={i * 7 + 2}
            y="2"
            width="5"
            height="12"
            fill={SEV_COLOR[c.cls]}
          />
        ))}
      </svg>
      <span className="whitespace-nowrap font-mono text-[10px]">{line}</span>
    </span>
  );
}
