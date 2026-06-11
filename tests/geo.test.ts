import { describe, expect, it } from "vitest";
import airports from "@/lib/data/airports.json";
import { buildCorridor } from "@/lib/pipeline/corridor";
import { gcKm, regionFor, slerp } from "@/lib/pipeline/geo";

const ZRH = airports.ZRH;
const SIN = airports.SIN;

describe("gcKm", () => {
  it("ZRH→SIN great-circle distance is 10,250–10,360 km", () => {
    const d = gcKm(ZRH, SIN);
    expect(d).toBeGreaterThanOrEqual(10250);
    expect(d).toBeLessThanOrEqual(10360);
  });
});

describe("slerp", () => {
  it("endpoints match the inputs", () => {
    const p0 = slerp(ZRH, SIN, 0);
    const p1 = slerp(ZRH, SIN, 1);
    expect(p0.lat).toBeCloseTo(ZRH.lat, 6);
    expect(p0.lon).toBeCloseTo(ZRH.lon, 6);
    expect(p1.lat).toBeCloseTo(SIN.lat, 6);
    expect(p1.lon).toBeCloseTo(SIN.lon, 6);
  });

  it("midpoint resolves to a named region", () => {
    const mid = slerp(ZRH, SIN, 0.5);
    expect(regionFor(mid.lat, mid.lon)).not.toBe("open water");
  });
});

describe("corridor regions", () => {
  it("has zero open-water waypoints on the ZRH→SIN corridor", () => {
    const dep = Date.UTC(2026, 5, 15, 9, 40);
    const { wps } = buildCorridor(ZRH, SIN, dep, 760);
    const openWater = wps.filter((w) => w.region === "open water");
    expect(openWater).toEqual([]);
  });
});

describe("baked corridor (Phase 5)", () => {
  it("waypoint distances follow the baked track, not the great circle", () => {
    const dep = Date.UTC(2026, 5, 15, 9, 40);
    // a dog-leg ZRH→SIN via a southern detour, ~longer than great circle
    const baked = [
      { lat: ZRH.lat, lon: ZRH.lon, altFt: 5000 },
      { lat: 38, lon: 25, altFt: 35000 },
      { lat: 25, lon: 55, altFt: 37000 },
      { lat: 10, lon: 80, altFt: 39000 },
      { lat: SIN.lat, lon: SIN.lon, altFt: 5000 },
    ];
    let trackLen = 0;
    for (let i = 1; i < baked.length; i++)
      trackLen += gcKm(baked[i - 1], baked[i]);
    const { wps } = buildCorridor(ZRH, SIN, dep, 760, baked);
    let wpLen = 0;
    for (let i = 1; i < wps.length; i++) wpLen += gcKm(wps[i - 1], wps[i]);
    const gc = gcKm(ZRH, SIN);
    expect(trackLen).toBeGreaterThan(gc + 100); // detour is genuinely longer
    expect(Math.abs(wpLen - trackLen)).toBeLessThan(20);
    // altitude carried through; elapsed time follows cumulative distance
    expect(wps.every((w) => w.altFt !== undefined)).toBe(true);
    expect(wps[wps.length - 1].elapsedH).toBeCloseTo(760 / 60, 5);
    const half = wps.findIndex((w) => w.f >= 0.5);
    expect(wps[half].elapsedH).toBeGreaterThan(0.45 * (760 / 60));
  });
});
