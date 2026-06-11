import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/briefing/route";
import omLocation from "./fixtures/openmeteo-location.json";

const BASE = "http://localhost:3000/api/briefing";

const isoDaysFromNow = (days: number) =>
  new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

/** Standard mock: Open-Meteo returns the fixture per coordinate, SIGMETs empty. */
function stubFetch(
  overrides: {
    openmeteo?: () => Promise<Response> | Response;
    sigmet?: () => Promise<Response> | Response;
  } = {},
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("open-meteo")) {
        if (overrides.openmeteo) return overrides.openmeteo();
        const n = new URL(url).searchParams
          .get("latitude")!
          .split(",").length;
        return Response.json(Array.from({ length: n }, () => omLocation));
      }
      if (url.includes("aviationweather")) {
        if (overrides.sigmet) return overrides.sigmet();
        return Response.json([]);
      }
      throw new Error("unexpected fetch: " + url);
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/briefing", () => {
  it("happy path returns a full briefing", async () => {
    stubFetch();
    const res = await GET(
      new Request(`${BASE}?flight=SQ345&date=${isoDaysFromNow(1)}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.zones)).toBe(true);
    expect(typeof body.grade.label).toBe("string");
    expect(typeof body.briefing).toBe("string");
    expect(body.demo).toBe(false);
    expect(body.dataSource).toBe("gfs-openmeteo");
    expect(body.waypoints.length).toBeGreaterThan(12);
    expect(body.scores.length).toBe(body.waypoints.length);
    for (const s of body.scores) expect(s.S).toBeLessThanOrEqual(1);
  });

  it("Open-Meteo 500 → 200 with demo: true", async () => {
    stubFetch({
      openmeteo: () => new Response("boom", { status: 500 }),
    });
    const res = await GET(
      new Request(`${BASE}?flight=SQ345&date=${isoDaysFromNow(1)}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.demo).toBe(true);
    expect(body.dataSource).toBe("demo");
  });

  it("SIGMET timeout → 200 with sigmet.checked === false", async () => {
    stubFetch({
      sigmet: () =>
        Promise.reject(new DOMException("aborted", "AbortError")),
    });
    const res = await GET(
      new Request(`${BASE}?flight=SQ345&date=${isoDaysFromNow(1)}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sigmet.checked).toBe(false);
    expect(body.sigmet.hits).toBe(0);
  });

  it("unknown flight → 404 with known-flight list", async () => {
    stubFetch();
    const res = await GET(
      new Request(`${BASE}?flight=SQ999&date=${isoDaysFromNow(1)}`),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("SQ999");
    expect(body.error).toContain("SQ345");
  });

  it("date 7 days out → 422", async () => {
    stubFetch();
    const res = await GET(
      new Request(`${BASE}?flight=SQ345&date=${isoDaysFromNow(7)}`),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("5 days");
  });

  it("from === to → 400", async () => {
    stubFetch();
    const res = await GET(
      new Request(
        `${BASE}?from=ZRH&to=ZRH&time=11:40&date=${isoDaysFromNow(1)}`,
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("same");
  });
});
