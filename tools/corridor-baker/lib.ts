/** Pure track-processing functions for the corridor baker (unit-tested). */
import { gcKm, slerp } from "../../src/lib/pipeline/geo";

export interface TrackPoint {
  lat: number;
  lon: number;
  altFt: number;
  t: number; // unix seconds
}

const GROUND_ALT_FT = 5000;
const TELEPORT_KM = 50;
const ALT_SPIKE_FT = 5000;
const MAX_PLAUSIBLE_KMH = 1200; // faster than any airliner → glitch

/**
 * Truncate a raw track at the end of its first flight leg: once cruise has
 * been reached (>20,000 ft), the first descent below 5,000 ft ends the leg.
 * OpenSky track responses can run into the aircraft's next rotation.
 */
export function firstLeg(points: TrackPoint[]): TrackPoint[] {
  let reachedCruise = false;
  for (let i = 0; i < points.length; i++) {
    if (points[i].altFt > 20000) reachedCruise = true;
    if (reachedCruise && points[i].altFt < GROUND_ALT_FT)
      return points.slice(0, i + 1);
  }
  return points;
}

/**
 * Strip ground/taxi points and obvious ADS-B glitches.
 * DECISION: a >50 km jump only counts as a teleport glitch when the implied
 * speed exceeds any airliner's (>1,200 km/h); long jumps across receiver
 * coverage gaps (large Δt) are real flight and must be kept — a naive
 * distance-only filter cascades and discards everything after the first gap.
 * Same idea for altitude: >5,000 ft between points is a spike only when
 * nearly instantaneous (Δt < 60 s).
 */
export function stripGlitches(points: TrackPoint[]): TrackPoint[] {
  const airborne = points.filter((p) => p.altFt >= GROUND_ALT_FT);
  const out: TrackPoint[] = [];
  for (const p of airborne) {
    const prev = out[out.length - 1];
    if (prev) {
      const dt = Math.max(1, p.t - prev.t);
      const km = gcKm(prev, p);
      if (km > TELEPORT_KM && (km / dt) * 3600 > MAX_PLAUSIBLE_KMH) continue;
      if (Math.abs(p.altFt - prev.altFt) > ALT_SPIKE_FT && dt < 60) continue;
    }
    out.push(p);
  }
  return out;
}

/** Resample a track to n points by fractional great-circle distance along it. */
export function resample(points: TrackPoint[], n: number): TrackPoint[] {
  const cum = [0];
  for (let i = 1; i < points.length; i++)
    cum.push(cum[i - 1] + gcKm(points[i - 1], points[i]));
  const total = cum[cum.length - 1];
  const out: TrackPoint[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / (n - 1)) * total;
    while (j < points.length - 2 && cum[j + 1] < target) j++;
    const seg = cum[j + 1] - cum[j];
    const f = seg > 0 ? (target - cum[j]) / seg : 0;
    const p = slerp(points[j], points[j + 1], f);
    out.push({
      lat: p.lat,
      lon: p.lon,
      altFt: points[j].altFt + f * (points[j + 1].altFt - points[j].altFt),
      t: points[j].t + f * (points[j + 1].t - points[j].t),
    });
  }
  return out;
}

/** Per-index median across resampled tracks → median lat/lon/altFt. */
export function medianTracks(tracks: TrackPoint[][]): TrackPoint[] {
  const n = tracks[0].length;
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const out: TrackPoint[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      lat: med(tracks.map((t) => t[i].lat)),
      lon: med(tracks.map((t) => t[i].lon)),
      altFt: med(tracks.map((t) => t[i].altFt)),
      t: med(tracks.map((t) => t[i].t)),
    });
  }
  return out;
}

/**
 * 5-point moving average on the altitude profile only.
 * DECISION: "never smooth across climb/descent boundaries" — a window is only
 * averaged when its altitude span is < 2,000 ft, so the step-climb staircase
 * and the climb/descent ramps are preserved verbatim.
 */
export function smoothAltitude(points: TrackPoint[]): TrackPoint[] {
  return points.map((p, i) => {
    const w = points.slice(Math.max(0, i - 2), i + 3);
    const span = Math.max(...w.map((q) => q.altFt)) - Math.min(...w.map((q) => q.altFt));
    if (span >= 2000) return p;
    return { ...p, altFt: w.reduce((s, q) => s + q.altFt, 0) / w.length };
  });
}

/** Total along-track distance in km. */
export function trackKm(points: { lat: number; lon: number }[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += gcKm(points[i - 1], points[i]);
  return d;
}
