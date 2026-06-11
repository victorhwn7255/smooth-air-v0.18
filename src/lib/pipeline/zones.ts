import { config } from "@/lib/data/config";
import type { SegmentScore, Waypoint, Zone } from "@/lib/types";
import { classify, sigmoid } from "./scoring";

/**
 * Flag waypoints at/above the light boundary (× widebody factor), merge runs
 * allowing config.zoneGapMerge-waypoint smooth gaps, and describe each zone:
 * peak S, dominant mechanism at the peak, majority region, elapsed-hour span,
 * class and both probabilities.
 */
export function detectZones(
  wps: Waypoint[],
  scores: SegmentScore[],
  widebody: boolean,
): Zone[] {
  const f = widebody ? config.widebodyFactor : 1;
  const thr = config.classLight * f;
  const flagged = scores.map((s) => s.S >= thr);
  for (let g = 0; g < config.zoneGapMerge; g++)
    for (let i = 1; i < flagged.length - 1; i++)
      if (!flagged[i] && flagged[i - 1] && flagged[i + 1]) flagged[i] = true;
  const zones: Zone[] = [];
  let start = -1;
  for (let i = 0; i <= flagged.length; i++) {
    if (i < flagged.length && flagged[i]) {
      if (start < 0) start = i;
      continue;
    }
    if (start >= 0) {
      let peak = 0,
        pk = start;
      for (let k = start; k < i; k++)
        if (scores[k].S > peak) {
          peak = scores[k].S;
          pk = k;
        }
      const mech =
        scores[pk].Sconv > scores[pk].Scat ? "convection" : "jet shear";
      const regs: Record<string, number> = {};
      for (let k = start; k < i; k++)
        regs[wps[k].region] = (regs[wps[k].region] || 0) + 1;
      const region = Object.entries(regs).sort((a, b) => b[1] - a[1])[0][0];
      zones.push({
        i0: start,
        i1: i - 1,
        peak,
        mech,
        region,
        startH: wps[start].elapsedH,
        endH: wps[i - 1].elapsedH,
        cls: classify(peak, widebody),
        pLight: sigmoid(config.pLight.a + config.pLight.b * peak),
        pMod: sigmoid(config.pModerate.a + config.pModerate.b * peak),
      });
      start = -1;
    }
  }
  return zones;
}
