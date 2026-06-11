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
