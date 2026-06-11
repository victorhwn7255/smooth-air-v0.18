import { describe, expect, it } from "vitest";
import type { SegmentScore, Waypoint } from "@/lib/types";
import { classify } from "@/lib/pipeline/scoring";
import { detectZones } from "@/lib/pipeline/zones";

const mkWps = (n: number): Waypoint[] =>
  Array.from({ length: n }, (_, i) => ({
    lat: 0,
    lon: 0,
    f: i / (n - 1),
    elapsedH: i * 0.5,
    utcMs: i * 1800e3,
    region: i < n / 2 ? "the Alps" : "the Bay of Bengal",
  }));

const mkScore = (S: number): SegmentScore => ({
  S,
  Scat: S,
  Sconv: 0,
  vws: 0,
  jet: 0,
  cape: 0,
  missing: false,
});

describe("detectZones", () => {
  it("two separated runs → exactly 2 zones", () => {
    const S = [0, 0.3, 0.3, 0, 0, 0.3, 0.3, 0];
    const zones = detectZones(mkWps(S.length), S.map(mkScore), false);
    expect(zones).toHaveLength(2);
    expect(zones[0].i0).toBe(1);
    expect(zones[0].i1).toBe(2);
    expect(zones[1].i0).toBe(5);
    expect(zones[1].i1).toBe(6);
  });

  it("a single smooth gap inside a run merges into one zone", () => {
    const S = [0, 0.3, 0.05, 0.3, 0];
    const zones = detectZones(mkWps(S.length), S.map(mkScore), false);
    expect(zones).toHaveLength(1);
    expect(zones[0].i0).toBe(1);
    expect(zones[0].i1).toBe(3);
  });
});

describe("classify widebody boundaries", () => {
  it("boundaries scale by ×1.2 for widebody", () => {
    // boundary values updated deliberately for the Phase 4 recalibration
    // (classModerate 0.22 → 0.50; see references/calibration-log.md)
    expect(classify(0.11, false)).toBe("light");
    expect(classify(0.11, true)).toBe("smooth"); // 0.11 < 0.10 × 1.2
    expect(classify(0.55, false)).toBe("moderate");
    expect(classify(0.55, true)).toBe("light"); // 0.55 < 0.50 × 1.2
    expect(classify(0.8, false)).toBe("severe");
    expect(classify(0.8, true)).toBe("moderate"); // 0.8 < 0.75 × 1.2
    expect(classify(0.95, true)).toBe("severe");
  });
});
