import { config } from "@/lib/data/config";
import type { SegmentScore, SeverityClass, WeatherSample } from "@/lib/types";

const D2R = Math.PI / 180;
const KN2MS = 0.514444; // knots → m/s

/** Wind speed (kt) + meteorological direction (deg) → [u, v] in m/s. */
function uv(spdKn: number, dirDeg: number): [number, number] {
  const s = spdKn * KN2MS,
    rd = dirDeg * D2R;
  return [-s * Math.sin(rd), -s * Math.cos(rd)];
}

export const ramp = (x: number, lo: number, hi: number): number =>
  Math.max(0, Math.min(1, (x - lo) / (hi - lo)));

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** Severity index for one waypoint — see prompts/00-context.md (authoritative). */
export function scoreWaypoint(wx: WeatherSample | null): SegmentScore {
  if (!wx || wx.ws250 == null)
    return { S: 0, Scat: 0, Sconv: 0, vws: 0, jet: 0, cape: 0, missing: true };
  const [u2, v2] = uv(wx.ws250, wx.wd250 ?? 0);
  const [u3, v3] = uv(wx.ws300 ?? 0, wx.wd300 ?? 0);
  const dz = Math.max(600, (wx.gh250 ?? 10400) - (wx.gh300 ?? 9200));
  const vws = Math.hypot(u2 - u3, v2 - v3) / dz;
  const Sshear = ramp(vws, config.shearLo, config.shearHi);
  const Sjet = ramp(wx.ws250, config.jetLo, config.jetHi);
  const Scat = Math.min(1, Sshear * (1 + config.jetBoost * Sjet));
  const pf = Math.max(config.capeFloorProb, (wx.pprob ?? 50) / 100);
  const Sconv = ramp(wx.cape ?? 0, config.capeLo, config.capeHi) * pf;
  return {
    S: Math.max(Scat, Sconv),
    Scat,
    Sconv,
    vws,
    jet: wx.ws250,
    cape: wx.cape ?? 0,
    missing: false,
  };
}

/** Class boundaries on S; widebody boundaries are scaled by widebodyFactor. */
export function classify(S: number, widebody: boolean): SeverityClass {
  const f = widebody ? config.widebodyFactor : 1;
  if (S >= config.classSevere * f) return "severe";
  if (S >= config.classModerate * f) return "moderate";
  if (S >= config.classLight * f) return "light";
  return "smooth";
}
