import type { SigmetStatus, Waypoint, Zone } from "@/lib/types";

const ENDPOINT = "https://aviationweather.gov/api/data/isigmet?format=json";
const TIMEOUT_MS = 5000;
const SLACK_MS = 36e5; // ±1h on validTimeFrom/To

interface Sigmet {
  hazard?: string;
  coords?: { lat: number; lon: number }[];
  validTimeFrom?: number; // unix seconds
  validTimeTo?: number;
}

/**
 * Best-effort overlay of active international SIGMETs (TURB/TS/CONV hazards)
 * onto detected zones. Mutates matching zones with `sigmet: true`. Never
 * throws — any failure degrades to {checked: false, hits: 0}.
 */
export async function overlaySigmets(
  wps: Waypoint[],
  zones: Zone[],
): Promise<SigmetStatus> {
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    let sigs: unknown;
    try {
      const r = await fetch(ENDPOINT, { signal: ac.signal });
      if (!r.ok) throw new Error("SIGMET HTTP " + r.status);
      sigs = await r.json();
    } finally {
      clearTimeout(timer);
    }
    const relevant = (Array.isArray(sigs) ? (sigs as Sigmet[]) : []).filter(
      (s) => {
        const h = (s.hazard || "").toUpperCase();
        return h.includes("TURB") || h.includes("TS") || h.includes("CONV");
      },
    );
    let hits = 0;
    for (const z of zones) {
      for (const s of relevant) {
        const poly = (s.coords || []).map(
          (c) => [c.lat, c.lon] as [number, number],
        );
        if (poly.length < 3) continue;
        const t0 = (s.validTimeFrom || 0) * 1000;
        const t1 = (s.validTimeTo || 0) * 1000;
        for (let k = z.i0; k <= z.i1; k++) {
          const w = wps[k];
          if (t0 && t1 && (w.utcMs < t0 - SLACK_MS || w.utcMs > t1 + SLACK_MS))
            continue;
          if (pointInPoly(w.lat, w.lon, poly)) {
            z.sigmet = true;
            hits++;
            break;
          }
        }
        if (z.sigmet) break;
      }
    }
    return { checked: true, hits };
  } catch {
    return { checked: false, hits: 0 };
  }
}

function pointInPoly(
  lat: number,
  lon: number,
  poly: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i],
      [yj, xj] = poly[j];
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}
