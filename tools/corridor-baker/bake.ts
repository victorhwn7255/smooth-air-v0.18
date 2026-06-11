/**
 * Corridor baker — turns historical ADS-B tracks into a baked per-flight
 * corridor (median lat/lon + altitude profile).
 *
 * Run:  npx tsx tools/corridor-baker/bake.ts --flight SQ345 [--input <dir>]
 *
 * Sources, in order: OpenSky anonymous REST (flights/departure + tracks/all —
 * anonymous access only reaches ~the last day, so raw tracks are cached in
 * tools/corridor-baker/input/ and reruns on later days accumulate more), or
 * user-supplied track files in the same folder:
 *   - OpenSky-style JSON: { path: [[t, lat, lon, altMeters, ...], ...] }
 *   - CSV with header: time,lat,lon,altft
 * Local-only; never deployed.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import airportsJson from "../../src/lib/data/airports.json";
import flightsJson from "../../src/lib/data/flights.json";
import { gcKm, slerp } from "../../src/lib/pipeline/geo";
import type { Airport, FlightEntry } from "../../src/lib/types";
import { openskyAuthenticated, openskyHeaders } from "../opensky";
import {
  firstLeg,
  medianTracks,
  resample,
  smoothAltitude,
  stripGlitches,
  trackKm,
  type TrackPoint,
} from "./lib";

const AIRPORTS = airportsJson as Record<string, Airport>;
const FLIGHTS = flightsJson as Record<string, FlightEntry>;

// tool-local lookups for OpenSky queries (only origins we bake from)
const IATA2ICAO: Record<string, string> = {
  ZRH: "LSZH", LHR: "EGLL", SIN: "WSSS", FRA: "EDDF", AMS: "EHAM",
  CDG: "LFPG", MUC: "EDDM", DOH: "OTHH",
};
const AIRLINE2CALLSIGN: Record<string, string> = { SQ: "SIA", QR: "QTR", LH: "DLH", BA: "BAW" };

const M2FT = 3.28084;
const RESAMPLE_N = 200;
const OUTPUT_N = 70;

const here = dirname(fileURLToPath(import.meta.url));
const inputDir = join(here, "input");
const outDir = join(here, "../../src/lib/data/corridors");

function callsignFor(flightNo: string): string {
  const m = flightNo.match(/^([A-Z]{2})(\d+)$/);
  if (!m || !AIRLINE2CALLSIGN[m[1]]) throw new Error(`no callsign mapping for ${flightNo}`);
  return AIRLINE2CALLSIGN[m[1]] + m[2];
}

/** Fetch yesterday→now departures and cache any matching tracks. */
async function fetchOpenSky(flightNo: string, route: FlightEntry) {
  const icaoAirport = IATA2ICAO[route.from];
  if (!icaoAirport) {
    console.log(`  no ICAO mapping for ${route.from} — skipping OpenSky fetch`);
    return;
  }
  const callsign = callsignFor(flightNo);
  const now = Math.floor(Date.now() / 1000);
  const headers = await openskyHeaders();
  // registered accounts reach ~30 days of history; anonymous only ~1 day
  const days = openskyAuthenticated() ? 10 : 2;
  console.log(
    `  OpenSky (${openskyAuthenticated() ? "authenticated" : "anonymous"}): departures ${icaoAirport} (callsign ${callsign}), last ${days} days…`,
  );
  const flights: { icao24: string; firstSeen: number; callsign?: string }[] = [];
  for (let d = days; d >= 1; d--) {
    const end = now - (d - 1) * 86400;
    const begin = end - 86400;
    const r = await fetch(
      `https://opensky-network.org/api/flights/departure?airport=${icaoAirport}&begin=${begin}&end=${end}`,
      { headers },
    );
    if (!r.ok) {
      console.log(`  departures window day-${d} failed (HTTP ${r.status}) — continuing`);
      continue;
    }
    try {
      flights.push(...((await r.json()) as typeof flights));
    } catch {
      /* non-JSON error body — ignore window */
    }
  }
  const matches = flights.filter((f) => (f.callsign || "").trim() === callsign);
  console.log(`  found ${matches.length} matching flight(s)`);
  for (const f of matches) {
    const date = new Date(f.firstSeen * 1000).toISOString().slice(0, 10);
    const file = join(inputDir, `${flightNo}-${date}-${f.icao24}.json`);
    if (existsSync(file)) {
      console.log(`  cached: ${file}`);
      continue;
    }
    const tr = await fetch(
      `https://opensky-network.org/api/tracks/all?icao24=${f.icao24}&time=${f.firstSeen}`,
      { headers },
    );
    if (!tr.ok) {
      console.log(`  track fetch failed for ${f.icao24} (HTTP ${tr.status})`);
      continue;
    }
    mkdirSync(inputDir, { recursive: true });
    writeFileSync(file, await tr.text());
    console.log(`  saved ${file}`);
  }
}

/** Parse one input file (OpenSky JSON or simple CSV) into TrackPoints. */
function parseTrackFile(path: string): TrackPoint[] {
  const raw = readFileSync(path, "utf8");
  if (path.endsWith(".json")) {
    const j = JSON.parse(raw);
    const pathArr = j.path as [number, number, number, number | null, ...unknown[]][];
    return pathArr
      .filter((p) => p[1] != null && p[2] != null && p[3] != null)
      .map((p) => ({ t: p[0], lat: p[1], lon: p[2], altFt: p[3]! * M2FT }));
  }
  // CSV: time,lat,lon,altft
  const lines = raw.trim().split("\n");
  return lines
    .slice(1)
    .map((l) => l.split(","))
    .filter((c) => c.length >= 4)
    .map((c) => ({ t: +c[0], lat: +c[1], lon: +c[2], altFt: +c[3] }));
}

async function main() {
  const args = process.argv.slice(2);
  const flagVal = (f: string) => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const flightNo = (flagVal("--flight") || "").toUpperCase();
  // route from flights.json, or --from/--to for flights we only bake
  // (e.g. SQ321 for the Phase 4 backtest case)
  let route = FLIGHTS[flightNo];
  const ovFrom = flagVal("--from")?.toUpperCase();
  const ovTo = flagVal("--to")?.toUpperCase();
  if (ovFrom && ovTo && AIRPORTS[ovFrom] && AIRPORTS[ovTo])
    route = { ...route, from: ovFrom, to: ovTo } as FlightEntry;
  if (!flightNo || !route) {
    console.error(
      `Usage: npx tsx tools/corridor-baker/bake.ts --flight SQ345 [--from LHR --to SIN] [--input <dir>]`,
    );
    console.error(`Known flights: ${Object.keys(FLIGHTS).join(", ")}`);
    process.exit(1);
  }
  const userDir = flagVal("--input") || inputDir;

  console.log(`Baking corridor for ${flightNo} (${route.from} → ${route.to})`);
  if (!flagVal("--input")) {
    try {
      await fetchOpenSky(flightNo, route);
    } catch (e) {
      console.log(`  OpenSky fetch error: ${e} — relying on cached/user files`);
    }
  }

  const files = existsSync(userDir)
    ? readdirSync(userDir).filter(
        (f) => f.toUpperCase().startsWith(flightNo) && /\.(json|csv)$/i.test(f),
      )
    : [];
  if (!files.length) {
    console.error(
      `No track files for ${flightNo} in ${userDir}.\n` +
        `Free sources exhausted? Drop per-flight track files there ` +
        `(OpenSky-style JSON or CSV time,lat,lon,altft) and rerun.`,
    );
    process.exit(2);
  }
  console.log(`  using ${files.length} track file(s): ${files.join(", ")}`);

  const tracks: TrackPoint[][] = [];
  for (const f of files) {
    const pts = stripGlitches(firstLeg(parseTrackFile(join(userDir, f))));
    if (pts.length < 50) {
      console.log(`  ${f}: only ${pts.length} clean points — skipped`);
      continue;
    }
    tracks.push(resample(pts, RESAMPLE_N));
  }
  if (!tracks.length) {
    console.error("No usable tracks after cleaning.");
    process.exit(2);
  }

  const median = smoothAltitude(medianTracks(tracks));
  const step = (median.length - 1) / (OUTPUT_N - 1);
  const points: [number, number, number][] = [];
  for (let i = 0; i < OUTPUT_N; i++) {
    const p = median[Math.round(i * step)];
    points.push([+p.lat.toFixed(3), +p.lon.toFixed(3), Math.round(p.altFt)]);
  }

  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${flightNo}.json`);
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        flight: flightNo,
        generatedAt: new Date().toISOString(),
        trackCount: tracks.length,
        source: `opensky-anonymous: ${files.join(", ")}`,
        points,
      },
      null,
      1,
    ),
  );

  // sanity report
  const fromAp = AIRPORTS[route.from];
  const toAp = AIRPORTS[route.to];
  const gc = gcKm(fromAp, toAp);
  const baked = trackKm(points.map(([lat, lon]) => ({ lat, lon })));
  const alts = points.map((p) => p[2]);
  let maxDev = 0;
  points.forEach(([lat, lon], i) => {
    const g = slerp(fromAp, toAp, i / (points.length - 1));
    maxDev = Math.max(maxDev, gcKm({ lat, lon }, g));
  });
  console.log(`\nwrote ${outFile}`);
  console.log(`SANITY REPORT`);
  console.log(`  tracks used        : ${tracks.length}`);
  console.log(`  along-track distance: ${Math.round(baked)} km vs great-circle ${Math.round(gc)} km (+${(((baked - gc) / gc) * 100).toFixed(1)}%)`);
  console.log(`  altitude range      : ${Math.min(...alts)}–${Math.max(...alts)} ft`);
  console.log(`  max deviation from great circle: ${Math.round(maxDev)} km`);
}

main();
