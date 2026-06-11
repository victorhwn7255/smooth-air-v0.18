import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "@/lib/data/config";
import {
  AIRPORTS,
  CURATED_FLIGHT_NOS,
  FLIGHTS,
  GENERATED_FLIGHT_COUNT,
} from "@/lib/data/flightDb";
import { buildCorridor } from "@/lib/pipeline/corridor";
import { gcKm } from "@/lib/pipeline/geo";
import {
  briefingText,
  confidenceTier,
  gradeOf,
} from "@/lib/pipeline/narrative";
import { scoreWaypoint } from "@/lib/pipeline/scoring";
import { nextDeparture, utcFromLocal } from "@/lib/pipeline/timing";
import { detectZones } from "@/lib/pipeline/zones";
import { demoWeather } from "@/lib/sources/demo";
import { fetchWeather, WeatherUnavailableError } from "@/lib/sources/openmeteo";
import { overlaySigmets } from "@/lib/sources/sigmet";
import type { Briefing, FlightEntry } from "@/lib/types";

const jsonError = (status: number, error: string) =>
  Response.json({ error }, { status });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

// per-IP soft rate limit — protects the Open-Meteo free tier from a leaked
// URL (hardening, not domain tuning; in-memory is fine at family scale)
const RATE_MAX = 30; // briefings per hour per IP
const buckets = new Map<string, { tokens: number; ts: number }>();
function rateLimited(ip: string, now: number): boolean {
  const b = buckets.get(ip) ?? { tokens: RATE_MAX, ts: now };
  b.tokens = Math.min(RATE_MAX, b.tokens + ((now - b.ts) / 36e5) * RATE_MAX);
  b.ts = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return true;
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  return false;
}

/** Baked corridor points for a flight, or undefined (great-circle fallback). */
async function loadBakedCorridor(flightNo: string) {
  if (!flightNo) return undefined;
  try {
    const raw = await readFile(
      join(process.cwd(), "src/lib/data/corridors", flightNo + ".json"),
      "utf8",
    );
    const baked = JSON.parse(raw) as { points: [number, number, number][] };
    return baked.points.map(([lat, lon, altFt]) => ({ lat, lon, altFt }));
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const now = Date.now();

  const ip =
    (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (rateLimited(ip, now))
    return jsonError(
      429,
      "Easy there — more than 30 briefings in an hour. The forecast only updates every 6 hours anyway; try again soon.",
    );

  // -- resolve route: known flight or manual from/to/time ------------------
  let flightNo = "";
  let from: string, to: string, depLocal: string, durationMin: number;
  let aircraft: string | null = null;
  let widebody = true;
  let operatingDays: number[] | undefined;

  const flightRaw = sp.get("flight");
  if (flightRaw) {
    const fno = flightRaw.replace(/\s+/g, "").toUpperCase();
    const flight = FLIGHTS[fno];
    if (!flight)
      return jsonError(
        404,
        `Don't know ${fno} yet — add it to src/lib/data/flights.json, or enter the route manually. Known: ${CURATED_FLIGHT_NOS.join(", ")}${GENERATED_FLIGHT_COUNT ? ` plus ${GENERATED_FLIGHT_COUNT} observed Changi flights` : ""}.`,
      );
    ({ from, to, depLocal, durationMin, aircraft, widebody } = flight);
    operatingDays = flight.operatingDays;
    flightNo = fno;
  } else if (sp.get("from") || sp.get("to")) {
    from = (sp.get("from") || "").toUpperCase();
    to = (sp.get("to") || "").toUpperCase();
    const time = sp.get("time");
    if (!AIRPORTS[from] || !AIRPORTS[to])
      return jsonError(
        400,
        `Unknown airport code — known codes: ${Object.keys(AIRPORTS).join(", ")}.`,
      );
    if (from === to)
      return jsonError(400, "Origin and destination are the same.");
    // DECISION: manual mode requires an explicit departure time — there is no
    // schedule to infer one from.
    if (!time || !TIME_RE.test(time))
      return jsonError(
        400,
        "Manual mode needs a departure time, e.g. &time=11:40.",
      );
    depLocal = time;
    durationMin =
      Math.round((gcKm(AIRPORTS[from], AIRPORTS[to]) / config.cruiseKmh) * 60) +
      40;
    // DECISION: manual routes assume widebody, matching v1's "widebody assumed".
  } else {
    return jsonError(
      400,
      "Provide ?flight=SQ345&date=YYYY-MM-DD, or ?from=ZRH&to=SIN&time=11:40.",
    );
  }

  const fromAp = AIRPORTS[from];
  const toAp = AIRPORTS[to];

  // -- departure date (defaults to the next valid departure) ---------------
  let date = sp.get("date");
  if (date && !DATE_RE.test(date))
    return jsonError(400, "Date must be YYYY-MM-DD.");
  if (!date) {
    // DECISION: a missing date targets the next valid departure (the app's
    // primary UX); manual routes are treated as daily.
    const pseudo: FlightEntry = {
      from,
      to,
      depLocal,
      durationMin,
      aircraft: aircraft ?? "",
      widebody,
      operatingDays,
      verified: false,
    };
    date = nextDeparture(pseudo, fromAp.tz, now);
  }

  const depUtcMs = utcFromLocal(date, depLocal, fromAp.tz);
  if ((depUtcMs - now) / 36e5 > 120)
    return jsonError(
      422,
      "More than 5 days out — forecasts that far ahead aren't worth reading. Check back closer to departure.",
    );

  // -- corridor → weather → scores → zones → narrative ---------------------
  const baked = await loadBakedCorridor(flightNo);
  const { dist, wps } = buildCorridor(fromAp, toAp, depUtcMs, durationMin, baked);
  const arrUtcMs = depUtcMs + durationMin * 60e3;
  let demo = false;
  let wx;
  try {
    wx = await fetchWeather(wps, depUtcMs, arrUtcMs);
  } catch (e) {
    if (!(e instanceof WeatherUnavailableError)) throw e;
    demo = true;
    wx = demoWeather(wps);
  }
  const scores = wx.map((s, i) => scoreWaypoint(s, wps[i].altFt));
  const zones = detectZones(wps, scores, widebody);
  const sigmet = demo
    ? { checked: false, hits: 0 }
    : await overlaySigmets(wps, zones);
  const grade = gradeOf(zones, wps, widebody);
  const confidence = confidenceTier(depUtcMs, now, zones);
  const briefing = briefingText(zones, toAp.city, +depLocal.split(":")[0]);

  const payload: Briefing = {
    flightNo,
    from,
    to,
    fromCity: fromAp.city,
    toCity: toAp.city,
    aircraft,
    widebody,
    distanceKm: Math.round(dist),
    durationMin,
    depUtcMs,
    depLocalDate: date,
    depLocalTime: depLocal,
    zones,
    waypoints: wps,
    scores,
    grade,
    confidence,
    briefing,
    demo,
    dataSource: demo ? "demo" : "gfs-openmeteo",
    corridorSource: baked ? "baked" : "great-circle",
    sigmet,
    generatedAt: now,
  };
  return Response.json(payload);
}
