import { describe, expect, it } from "vitest";
import { AIRPORTS, FLIGHTS } from "@/lib/data/flightDb";
import flightsCurated from "@/lib/data/flights.json";

describe("flight database (curated + generated)", () => {
  it("curated entries always win over generated", () => {
    for (const [no, f] of Object.entries(flightsCurated))
      expect(FLIGHTS[no]).toEqual(f);
  });

  it("every flight references known airports and a valid local time", () => {
    for (const [no, f] of Object.entries(FLIGHTS)) {
      expect(AIRPORTS[f.from], `${no} from ${f.from}`).toBeDefined();
      expect(AIRPORTS[f.to], `${no} to ${f.to}`).toBeDefined();
      expect(f.depLocal).toMatch(/^\d{2}:\d{2}$/);
      expect(f.durationMin).toBeGreaterThan(0);
      expect(f.from).not.toBe(f.to);
    }
  });

  it("every airport has coordinates and an IANA timezone", () => {
    for (const [code, a] of Object.entries(AIRPORTS)) {
      expect(Math.abs(a.lat), code).toBeLessThanOrEqual(90);
      expect(Math.abs(a.lon), code).toBeLessThanOrEqual(180);
      expect(a.tz, code).toMatch(/^[A-Za-z_]+\/[A-Za-z_/-]+$/);
    }
  });
});
