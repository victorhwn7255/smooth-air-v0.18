import { describe, expect, it } from "vitest";
import type { Waypoint, Zone } from "@/lib/types";
import {
  briefingText,
  confidenceTier,
  gradeOf,
} from "@/lib/pipeline/narrative";

const mkWps = (totalH: number): Waypoint[] => [
  { lat: 0, lon: 0, f: 0, elapsedH: 0, utcMs: 0, region: "the Alps" },
  {
    lat: 0,
    lon: 0,
    f: 1,
    elapsedH: totalH,
    utcMs: totalH * 3600e3,
    region: "the Bay of Bengal",
  },
];

const mkZone = (over: Partial<Zone>): Zone => ({
  i0: 10,
  i1: 14,
  peak: 0.3,
  mech: "jet shear",
  region: "the Caspian region",
  startH: 3,
  endH: 4,
  cls: "moderate",
  pLight: 0.5,
  pMod: 0.1,
  ...over,
});

describe("gradeOf / briefingText", () => {
  it("no zones → smooth grade and smooth text", () => {
    const grade = gradeOf([], mkWps(12.7), true);
    expect(grade.label).toBe("Smooth, end to end");
    expect(grade.warn).toBe(false);
    const text = briefingText([], "Singapore", 11);
    expect(text).toContain("smooth end to end");
  });

  it("severe jet zone uses the 'genuinely rough stretch' template", () => {
    const z = mkZone({ cls: "severe", peak: 0.95 });
    const text = briefingText([z], "Singapore", 11);
    expect(text).toContain("A genuinely rough stretch is signalled");
    expect(text).toContain(z.region);
  });
});

describe("confidenceTier", () => {
  const now = Date.UTC(2026, 5, 15, 12, 0);
  const h = 3600e3;

  it("≤18h → high, ≤60h → medium, else low", () => {
    expect(confidenceTier(now + 10 * h, now, []).tier).toBe("high");
    expect(confidenceTier(now + 30 * h, now, []).tier).toBe("medium");
    expect(confidenceTier(now + 80 * h, now, []).tier).toBe("low");
  });

  it("drops one tier for a convective zone at 30h out", () => {
    const conv = mkZone({ mech: "convection" });
    expect(confidenceTier(now + 30 * h, now, [conv]).tier).toBe("low");
    // and from high → medium when >24h would apply, but ≤24h keeps high
    expect(confidenceTier(now + 10 * h, now, [conv]).tier).toBe("high");
  });
});
