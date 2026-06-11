import type { ConfidenceTier, Grade, Waypoint, Zone } from "@/lib/types";

/** Overall smoothness grade from the zone list. */
export function gradeOf(
  zones: Zone[],
  wps: Waypoint[],
  widebody: boolean,
): Grade {
  void widebody; // kept for signature parity with v1
  if (!zones.length)
    return {
      label: "Smooth, end to end",
      warn: false,
      sub: "no notable rough-air signals along the route",
    };
  const worst = zones.reduce((a, z) => (z.peak > a.peak ? z : a), zones[0]);
  const elev = zones.reduce((s, z) => s + (z.endH - z.startH), 0);
  const total = wps[wps.length - 1].elapsedH;
  const frac = elev / total;
  if (worst.cls === "severe")
    return {
      label: "A rough one — brace for real bumps",
      warn: true,
      sub: "strong signals on this route; crews will be working around it",
    };
  if (worst.cls === "moderate")
    return {
      label:
        zones.length > 1
          ? "Mostly smooth — a few bumpy stretches"
          : "Mostly smooth — one bumpy stretch",
      warn: frac > 0.3,
      sub: "seatbelt-sign weather in places, nothing unusual",
    };
  return {
    label: "Smooth with light chop in places",
    warn: false,
    sub: "minor bumps possible, easy flight overall",
  };
}

/** "about 2½ hours in" style elapsed-time phrase. */
export function fmtH(h: number): string {
  const hh = Math.floor(h),
    mm = Math.round((h - hh) * 60);
  if (h < 0.9) return Math.round(h * 60) + " min in";
  const half = mm >= 20 && mm <= 40 ? "½" : "";
  return "about " + (mm > 40 ? hh + 1 : hh) + half + " hours in";
}

/** "~45 min" / "~1.5 h" duration phrase. */
export function fmtDur(h: number): string {
  const m = Math.round(h * 60);
  return m < 75 ? "~" + m + " min" : "~" + (m / 60).toFixed(1) + " h";
}

/** Probability → plain-language band; never bare decimals in prose. */
export function pctBand(p: number): string {
  if (p < 0.12) return "slim";
  if (p < 0.3) return "roughly 1-in-5";
  if (p < 0.45) return "roughly 1-in-3";
  if (p < 0.62) return "near-even";
  return "good";
}

/** The nervous-flyer paragraph, built from v1's templates. */
export function briefingText(
  zones: Zone[],
  toCity: string,
  depHourLocal: number,
): string {
  const night = depHourLocal >= 20 || depHourLocal < 5;
  let s = `A normal ${night ? "overnight" : "daytime"} flight to ${toCity}. `;
  if (!zones.length)
    return (
      s +
      "No notable rough air along the route — this one looks smooth end to end. Belt loosely on when seated, as always."
    );
  zones.slice(0, 3).forEach((z) => {
    const when = fmtH((z.startH + z.endH) / 2);
    const dur = fmtDur(Math.max(0.2, z.endH - z.startH));
    if (z.mech === "jet shear")
      s +=
        z.cls === "severe"
          ? `A genuinely rough stretch is signalled crossing the jet stream over ${z.region} ${when} — ${dur}. The crew will see it too and will likely change altitude to soften it. `
          : `Expect a firmer stretch crossing the jet stream over ${z.region} ${when} — ${dur} of seatbelt-sign weather, routine for this route. `;
    else
      s += `Over ${z.region} ${when}, thunderstorm activity in the area means a ${pctBand(z.pLight)} chance of some bumps for ${dur}; crews routinely steer around the cells. `;
    if (z.sigmet)
      s += `Official advisories are active there, so the crew will be ready for it. `;
  });
  s +=
    "The rest of the route looks calm. Keep your belt loosely fastened when seated and this is an uneventful flight.";
  return s;
}

/**
 * Forecast confidence from lead time; convective zones >24h out cost a tier.
 * Pure — `nowMs` is a parameter. The >120h refusal is the caller's concern.
 */
export function confidenceTier(
  depUtcMs: number,
  nowMs: number,
  zones: Zone[],
): ConfidenceTier {
  const hrs = (depUtcMs - nowMs) / 36e5;
  let tier: ConfidenceTier["tier"] =
    hrs <= 18 ? "high" : hrs <= 60 ? "medium" : "low";
  if (tier !== "low" && zones.some((z) => z.mech === "convection") && hrs > 24)
    tier = tier === "high" ? "medium" : "low";
  return { tier, hrs };
}
