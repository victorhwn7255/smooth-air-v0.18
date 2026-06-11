import { config } from "@/lib/data/config";
import type { Waypoint } from "@/lib/types";
import { gcKm, regionFor, slerp, type LatLon } from "./geo";

export interface Corridor {
  /** great-circle distance, km */
  dist: number;
  wps: Waypoint[];
}

/**
 * Sample the route every config.sampleKm along the great circle (or along a
 * baked track when one is provided — Phase 5), time-matching each waypoint by
 * elapsed = fraction × duration.
 */
export function buildCorridor(
  fromAp: LatLon,
  toAp: LatLon,
  depUtcMs: number,
  durationMin: number,
  bakedCorridor?: (LatLon & { altFt?: number })[],
): Corridor {
  const dist = gcKm(fromAp, toAp);
  const wps: Waypoint[] = [];
  if (bakedCorridor && bakedCorridor.length >= 2) {
    // baked geometry verbatim; per-point elapsed time by cumulative
    // along-track distance fraction × duration
    const cum = [0];
    for (let i = 1; i < bakedCorridor.length; i++)
      cum.push(cum[i - 1] + gcKm(bakedCorridor[i - 1], bakedCorridor[i]));
    const total = cum[cum.length - 1];
    bakedCorridor.forEach((p, i) => {
      const f = total > 0 ? cum[i] / total : 0;
      const elapsedH = (f * durationMin) / 60;
      wps.push({
        lat: +p.lat.toFixed(3),
        lon: +p.lon.toFixed(3),
        f,
        elapsedH,
        utcMs: depUtcMs + elapsedH * 3600e3,
        region: regionFor(p.lat, p.lon),
        altFt: p.altFt,
      });
    });
    return { dist, wps };
  }
  const n = Math.max(12, Math.round(dist / config.sampleKm));
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const p = slerp(fromAp, toAp, f);
    const elapsedH = (f * durationMin) / 60;
    wps.push({
      lat: +p.lat.toFixed(3),
      lon: +p.lon.toFixed(3),
      f,
      elapsedH,
      utcMs: depUtcMs + elapsedH * 3600e3,
      region: regionFor(p.lat, p.lon),
    });
  }
  return { dist, wps };
}
