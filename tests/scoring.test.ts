import { describe, expect, it } from "vitest";
import type { WeatherSample } from "@/lib/types";
import { scoreWaypoint } from "@/lib/pipeline/scoring";

const sample = (over: Partial<WeatherSample>): WeatherSample => ({
  ws250: null,
  wd250: null,
  ws300: null,
  wd300: null,
  ws200: null,
  wd200: null,
  gh250: null,
  gh300: null,
  cape: null,
  pprob: null,
  ...over,
});

describe("scoreWaypoint", () => {
  it("calm input → S < 0.05", () => {
    const s = scoreWaypoint(
      sample({
        ws250: 40,
        wd250: 270,
        ws300: 38,
        wd300: 270,
        gh250: 10400,
        gh300: 9200,
        cape: 0,
        pprob: 0,
      }),
    );
    expect(s.S).toBeLessThan(0.05);
    expect(s.missing).toBe(false);
  });

  it("strong jet (130 kt over 60 kt across 1200 m) → S ≥ 0.8, vws ≈ 0.03", () => {
    const s = scoreWaypoint(
      sample({
        ws250: 130,
        wd250: 270,
        ws300: 60,
        wd300: 270,
        gh250: 10400,
        gh300: 9200,
        cape: 0,
        pprob: 0,
      }),
    );
    expect(s.vws).toBeCloseTo(0.03, 3);
    expect(s.S).toBeGreaterThanOrEqual(0.8);
  });

  it("convective input (CAPE 2400, pprob 70) → Sconv ≈ 0.53, conv > cat", () => {
    // DECISION: the phase prompt's "Sconv ≈ 0.44" assumes ramp dividing by hi
    // rather than (hi − lo). 00-context's authoritative formula gives
    // ramp(2400, 500, 3000) × 0.7 = 0.76 × 0.7 = 0.532 — we follow the context.
    const s = scoreWaypoint(
      sample({
        ws250: 20,
        wd250: 0,
        ws300: 20,
        wd300: 0,
        gh250: 10400,
        gh300: 9200,
        cape: 2400,
        pprob: 70,
      }),
    );
    expect(s.Sconv).toBeCloseTo(0.532, 2);
    expect(s.Sconv).toBeGreaterThan(s.Scat);
  });

  it("null wind → missing=true, S=0", () => {
    const s = scoreWaypoint(sample({ cape: 2400, pprob: 70 }));
    expect(s.missing).toBe(true);
    expect(s.S).toBe(0);
  });
});
