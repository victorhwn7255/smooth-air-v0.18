import type { Waypoint, WeatherSample } from "@/lib/types";

/**
 * Deterministic, region-aware demo weather, ported verbatim from v1.
 * These numbers were calibrated to produce realistic briefings — do not
 * "improve" them.
 */

function mulberry(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoWeather(wps: Waypoint[]): WeatherSample[] {
  const jetCenter = 0.34; // one jet crossing ~1/3 in
  return wps.map((w, i) => {
    const r = mulberry(i * 7919 + Math.round(w.lat * 10));
    const midlat = Math.exp(-((Math.abs(w.lat) - 36) ** 2) / 220); // jet belt
    const jetPulse = Math.exp(-((w.f - jetCenter) ** 2) / 0.003);
    const ws250 = 30 + 40 * midlat + 38 * jetPulse * midlat + 8 * r();
    const ratio = 0.91 - 0.08 * jetPulse * midlat - 0.02 * r();
    const wd250 = 255 + 20 * r();
    const tropics = Math.exp(-((Math.abs(w.lat) - 9) ** 2) / 110); // convection belt
    const cape = Math.max(0, 2300 * tropics * (0.35 + 0.7 * r()) - 150);
    return {
      ws250,
      wd250,
      ws300: ws250 * ratio,
      wd300: wd250 - (1.5 + 2.5 * jetPulse),
      ws200: null,
      wd200: null,
      gh250: 10400 + 120 * r(),
      gh300: 9220 + 120 * r(),
      gh200: null,
      cape,
      pprob: Math.min(95, cape / 30 + 12 * r()),
    };
  });
}
