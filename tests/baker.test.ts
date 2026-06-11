import { describe, expect, it } from "vitest";
import {
  firstLeg,
  medianTracks,
  resample,
  stripGlitches,
  type TrackPoint,
} from "../tools/corridor-baker/lib";

const pt = (lat: number, lon: number, altFt: number, t: number): TrackPoint => ({
  lat,
  lon,
  altFt,
  t,
});

describe("stripGlitches", () => {
  it("drops ground/taxi points below 5,000 ft", () => {
    const out = stripGlitches([
      pt(47, 8, 800, 0),
      pt(47.1, 8.1, 6000, 60),
      pt(47.2, 8.2, 12000, 120),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].altFt).toBe(6000);
  });

  it("drops teleports but keeps coverage gaps", () => {
    const out = stripGlitches([
      pt(40, 10, 35000, 0),
      pt(45, 10, 35000, 10), // ~556 km in 10 s — teleport glitch
      pt(40.1, 10.1, 35000, 60),
      pt(43, 13, 35000, 2400), // ~400 km in 39 min — real coverage gap
      pt(43.1, 13.1, 35000, 2460),
    ]);
    expect(out.map((p) => p.lat)).toEqual([40, 40.1, 43, 43.1]);
  });

  it("drops instantaneous altitude spikes but keeps step climbs", () => {
    const out = stripGlitches([
      pt(40, 10, 31000, 0),
      pt(40.1, 10.1, 38000, 10), // +7,000 ft in 10 s — spike
      pt(40.2, 10.2, 31000, 60),
      pt(41, 11, 37000, 1200), // +6,000 ft in 19 min — real step climb
    ]);
    expect(out.map((p) => p.altFt)).toEqual([31000, 31000, 37000]);
  });
});

describe("firstLeg", () => {
  it("truncates at the first landing after cruise", () => {
    const track = [
      pt(51, 0, 2000, 0),
      pt(50, 5, 35000, 3600),
      pt(45, 30, 37000, 7200),
      pt(1.4, 104, 3000, 46000), // landed
      pt(1.5, 104.2, 20000, 50000), // next rotation
    ];
    const out = firstLeg(track);
    expect(out).toHaveLength(4);
    expect(out[out.length - 1].altFt).toBe(3000);
  });
});

describe("resample + medianTracks", () => {
  // three synthetic straight-ish tracks at slightly different offsets
  const mkTrack = (latOff: number): TrackPoint[] =>
    Array.from({ length: 20 }, (_, i) =>
      pt(40 + latOff, 10 + i * 0.5, 35000 + latOff * 10000, i * 600),
    );

  it("resamples to the requested length with original endpoints", () => {
    const r = resample(mkTrack(0), 50);
    expect(r).toHaveLength(50);
    expect(r[0].lon).toBeCloseTo(10, 3);
    expect(r[49].lon).toBeCloseTo(19.5, 3);
  });

  it("median across 3 tracks picks the middle one", () => {
    const tracks = [mkTrack(-0.2), mkTrack(0), mkTrack(0.2)].map((t) =>
      resample(t, 50),
    );
    const med = medianTracks(tracks);
    expect(med[25].lat).toBeCloseTo(40, 2);
    expect(med[25].altFt).toBeCloseTo(35000, 0);
  });
});
