/**
 * Changi flight-database builder — generates a searchable flight list from
 * what actually flew in/out of SIN, using only free keyless sources:
 *   - OpenSky anonymous REST: WSSS departures/arrivals (~last 2 days; raw
 *     responses cached in cache/, so reruns across days accumulate coverage)
 *   - vrs-standing-data.adsb.lol: callsign → route, airline ICAO→IATA codes
 *   - github.com/mwgg/Airports: IATA → lat/lon/city/IANA tz
 *
 * Honesty: depLocal is the MEDIAN OBSERVED first-seen time (≈ takeoff), not
 * the published schedule — every generated entry is verified:false and the
 * UI shows "still right?". Curated flights.json always wins on conflicts.
 *
 * Run:  npx tsx tools/flight-db/build-sin.ts
 * Local-only; never deployed.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import curatedAirports from "../../src/lib/data/airports.json";
import { config } from "../../src/lib/data/config";
import curatedFlights from "../../src/lib/data/flights.json";
import { gcKm } from "../../src/lib/pipeline/geo";
import type { Airport, FlightEntry } from "../../src/lib/types";
import "../env";
import { openskyAuthenticated, openskyHeaders } from "../opensky";

const HOME = "SIN";
const HOME_ICAO = "WSSS";
/** routes report distance > this → assume widebody (DECISION: heuristic) */
const WIDEBODY_KM = 4500;

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "cache");
const outFlights = join(here, "../../src/lib/data/flights-generated.json");
const outAirports = join(here, "../../src/lib/data/airports-generated.json");
mkdirSync(cacheDir, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cached(name: string, fetcher: () => Promise<string>): Promise<string> {
  const file = join(cacheDir, name);
  if (existsSync(file)) return readFileSync(file, "utf8");
  const body = await fetcher();
  writeFileSync(file, body);
  return body;
}

/* ---- 1. OpenSky observations (departures + arrivals at WSSS) ---------- */
interface OsFlight {
  icao24: string;
  callsign?: string;
  firstSeen: number;
  estDepartureAirport?: string;
  estArrivalAirport?: string;
}

async function fetchOpenSkyDay(kind: "departure" | "arrival", dayOffset: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const end = now - dayOffset * 86400;
  const begin = end - 86400;
  const date = new Date(end * 1000).toISOString().slice(0, 10);
  const name = `opensky-${kind}-${date}.json`;
  if (existsSync(join(cacheDir, name))) return;
  const r = await fetch(
    `https://opensky-network.org/api/flights/${kind}?airport=${HOME_ICAO}&begin=${begin}&end=${end}`,
    { headers: await openskyHeaders() },
  );
  if (!r.ok) {
    console.log(`  OpenSky ${kind} ${date}: HTTP ${r.status} — skipped`);
    return;
  }
  writeFileSync(join(cacheDir, name), await r.text());
  console.log(`  cached ${name}`);
}

/* ---- 1b. AeroDataBox: the PUBLISHED schedule boards (preferred source) -- */
interface AdbLeg {
  airport?: { iata?: string };
  scheduledTime?: { local?: string; utc?: string };
}
interface AdbFlight {
  number?: string;
  departure?: AdbLeg;
  arrival?: AdbLeg;
  aircraft?: { model?: string };
}

const WIDEBODY_MODEL = /A3[345]0|A380|7[456-8]7|777/i;

/**
 * Next 24h of the SIN board in two 12h windows (cached per window).
 * withLeg=true → each flight carries BOTH ends' scheduled times, so inbound
 * flights get their published origin departure time and every flight gets a
 * true scheduled duration.
 */
async function fetchAdbBoard(direction: "Departure" | "Arrival"): Promise<AdbFlight[]> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    console.log("  no RAPIDAPI_KEY — skipping AeroDataBox schedule board");
    return [];
  }
  const out: AdbFlight[] = [];
  for (const offsetH of [0, 12]) {
    const from = new Date(Date.now() + offsetH * 3600e3);
    const to = new Date(Date.now() + (offsetH + 12) * 3600e3);
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Singapore",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      })
        .format(d)
        .replace(" ", "T");
    const name = `adb-leg-${direction}-${fmt(from).slice(0, 13)}.json`;
    const body = await cached(name, async () => {
      // Basic plan enforces a per-second rate limit — space calls out and
      // retry on 429
      for (let attempt = 0; ; attempt++) {
        await sleep(1500);
        const r = await fetch(
          `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${HOME}/${fmt(from)}/${fmt(to)}?direction=${direction}&withLeg=true&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false`,
          {
            headers: {
              "X-RapidAPI-Key": key,
              "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
            },
          },
        );
        if (r.status === 429 && attempt < 2) {
          console.log("  ADB 429 — backing off 5s");
          await sleep(5000);
          continue;
        }
        if (!r.ok) throw new Error(`AeroDataBox HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
        return r.text();
      }
    });
    try {
      const j = JSON.parse(body);
      out.push(...(j.departures ?? []), ...(j.arrivals ?? []));
    } catch {
      console.log(`  unparseable ADB window ${name}`);
    }
  }
  return out;
}

/** "2026-06-11 06:30Z" → epoch ms (NaN if absent). */
const adbUtcMs = (s?: string) => (s ? Date.parse(s.replace(" ", "T")) : NaN);

function loadObservations(): { dep: OsFlight[]; arr: OsFlight[] } {
  const dep: OsFlight[] = [];
  const arr: OsFlight[] = [];
  for (const f of readdirSync(cacheDir)) {
    if (f.startsWith("opensky-departure-")) dep.push(...JSON.parse(readFileSync(join(cacheDir, f), "utf8")));
    if (f.startsWith("opensky-arrival-")) arr.push(...JSON.parse(readFileSync(join(cacheDir, f), "utf8")));
  }
  return { dep, arr };
}

/* ---- 2. airline ICAO→IATA ---------------------------------------------- */
async function airlineMap(): Promise<Map<string, string>> {
  const csv = await cached("airlines.csv", async () => {
    const r = await fetch(
      "https://raw.githubusercontent.com/vradarserver/standing-data/main/airlines/schema-01/airlines.csv",
    );
    if (!r.ok) throw new Error("airlines.csv HTTP " + r.status);
    return r.text();
  });
  const map = new Map<string, string>();
  for (const line of csv.split("\n").slice(1)) {
    const [, , icao, iata] = line.split(",");
    if (icao && iata && /^[A-Z]{3}$/.test(icao) && /^[A-Z0-9]{2}$/.test(iata) && !map.has(icao))
      map.set(icao, iata);
  }
  return map;
}

/* ---- 3. callsign → route via VRS standing data ------------------------- */
async function routeFor(callsign: string): Promise<string[] | null> {
  const name = `route-${callsign}.txt`;
  const file = join(cacheDir, name);
  if (existsSync(file)) {
    const t = readFileSync(file, "utf8").trim();
    return t && t !== "404" ? t.split("-") : null;
  }
  const r = await fetch(
    `https://vrs-standing-data.adsb.lol/routes/${callsign.slice(0, 2)}/${callsign}.txt`,
  );
  await sleep(60);
  const t = r.ok ? (await r.text()).trim() : "404";
  writeFileSync(file, t || "404");
  return r.ok && t ? t.split("-") : null;
}

/* ---- 4. airports lookup ------------------------------------------------- */
interface MwggAirport {
  iata: string;
  city?: string;
  name: string;
  lat: number;
  lon: number;
  tz: string;
}

async function airportIndex(): Promise<Map<string, MwggAirport>> {
  const raw = await cached("airports-mwgg.json", async () => {
    const r = await fetch("https://raw.githubusercontent.com/mwgg/Airports/master/airports.json");
    if (!r.ok) throw new Error("airports.json HTTP " + r.status);
    return r.text();
  });
  const all = JSON.parse(raw) as Record<string, MwggAirport>;
  const idx = new Map<string, MwggAirport>();
  for (const a of Object.values(all)) if (a.iata && a.tz) idx.set(a.iata, a);
  return idx;
}

/* ---- helpers ------------------------------------------------------------ */
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** epoch sec → "HH:MM" wall clock in tz, rounded to 5 minutes */
function localHHMM(epochSec: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(epochSec * 1000));
  const g: Record<string, string> = {};
  parts.forEach((p) => (g[p.type] = p.value));
  let hh = +g.hour % 24;
  let mm = Math.round(+g.minute / 5) * 5;
  if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** callsign "SIA345" → ["SIA", "345"]; strips ATC suffix letters ("BAW31M" → 31) */
function splitCallsign(cs: string): [string, string] | null {
  const m = cs.match(/^([A-Z]{3})(\d{1,4})[A-Z]{0,2}$/);
  return m ? [m[1], m[2]] : null;
}

/* ---- main ---------------------------------------------------------------- */
async function main() {
  const days = openskyAuthenticated() ? 7 : 2;
  console.log(
    `Fetching OpenSky WSSS observations (${openskyAuthenticated() ? "authenticated" : "anonymous"}, ${days} daily windows)…`,
  );
  for (const kind of ["departure", "arrival"] as const)
    for (let off = 0; off < days; off++) {
      try {
        await fetchOpenSkyDay(kind, off);
      } catch (e) {
        console.log(`  OpenSky ${kind} day-${off}: ${e} — continuing with cache`);
      }
    }

  const { dep, arr } = loadObservations();
  console.log(`Observations: ${dep.length} departures, ${arr.length} arrivals (all cached days)`);
  const airlines = await airlineMap();
  const airports = await airportIndex();
  const curatedAp = curatedAirports as Record<string, Airport>;
  const curatedFl = curatedFlights as Record<string, FlightEntry>;

  // group observed first-seen times per callsign+direction
  const obs = new Map<string, { dir: "dep" | "arr"; times: number[] }>();
  for (const [list, dir] of [[dep, "dep"], [arr, "arr"]] as const)
    for (const f of list) {
      const cs = (f.callsign || "").trim();
      if (!splitCallsign(cs)) continue;
      const key = cs + "|" + dir;
      const e = obs.get(key) ?? { dir, times: [] };
      e.times.push(f.firstSeen);
      obs.set(key, e);
    }
  console.log(`Unique airline callsigns: ${obs.size}`);

  const flights: Record<string, FlightEntry> = {};
  const neededAirports = new Set<string>();
  const skipped = { noAirline: 0, noRoute: 0, badRoute: 0, noAirport: 0, curated: 0 };

  for (const [key, { dir, times }] of obs) {
    const cs = key.split("|")[0];
    const [icao, num] = splitCallsign(cs)!;
    const iata = airlines.get(icao);
    if (!iata) { skipped.noAirline++; continue; }
    const flightNo = iata + num;
    if (curatedFl[flightNo]) { skipped.curated++; continue; }

    const route = await routeFor(cs);
    if (!route) { skipped.noRoute++; continue; }
    const i = route.indexOf(HOME);
    if (i < 0) { skipped.badRoute++; continue; }
    // the SIN-adjacent leg: departures leave SIN, arrivals come into SIN
    const from = dir === "dep" ? HOME : route[i - 1];
    const to = dir === "dep" ? route[i + 1] : HOME;
    if (!from || !to || from === to) { skipped.badRoute++; continue; }

    const other = from === HOME ? to : from;
    const ap = curatedAp[other] ?? airports.get(other);
    if (!ap) { skipped.noAirport++; continue; }
    if (!curatedAp[other]) neededAirports.add(other);

    const fromAp = from === HOME ? curatedAp[HOME] : ap;
    const originTz = "tz" in fromAp ? fromAp.tz : curatedAp[HOME].tz;
    const dist = gcKm(
      curatedAp[HOME],
      { lat: ap.lat, lon: ap.lon },
    );
    flights[flightNo] = {
      from,
      to,
      // median observed first-seen ≈ takeoff time, origin-local (DECISION:
      // observed beats absent; verified:false surfaces the uncertainty)
      depLocal: localHHMM(median(times), originTz),
      durationMin: Math.round((dist / config.cruiseKmh) * 60) + 40,
      aircraft: "",
      widebody: dist > WIDEBODY_KM,
      verified: false,
    };
  }

  // overlay the published boards — scheduled times beat observed; withLeg
  // gives the origin departure time for inbound flights and true durations
  for (const direction of ["Departure", "Arrival"] as const) {
    console.log(`Fetching AeroDataBox scheduled ${direction.toLowerCase()}s (next 24h)…`);
    let adbCount = 0;
    try {
      for (const f of await fetchAdbBoard(direction)) {
        const flightNo = (f.number || "").replace(/\s+/g, "").toUpperCase();
        if (!/^[A-Z0-9]{2}\d{1,4}$/.test(flightNo)) continue;
        if (curatedFl[flightNo]) { skipped.curated++; continue; }
        // the queried airport's leg has no airport object; the remote end does
        const remote = (
          direction === "Departure" ? f.arrival : f.departure
        )?.airport?.iata?.toUpperCase();
        const depLocalFull = f.departure?.scheduledTime?.local;
        if (!remote || remote === HOME || !depLocalFull) continue;
        const ap = curatedAp[remote] ?? airports.get(remote);
        if (!ap) { skipped.noAirport++; continue; }
        if (!curatedAp[remote]) neededAirports.add(remote);
        const dist = gcKm(curatedAp[HOME], { lat: ap.lat, lon: ap.lon });
        const schedMin = Math.round(
          (adbUtcMs(f.arrival?.scheduledTime?.utc) -
            adbUtcMs(f.departure?.scheduledTime?.utc)) /
            60000,
        );
        const model = f.aircraft?.model || "";
        flights[flightNo] = {
          from: direction === "Departure" ? HOME : remote,
          to: direction === "Departure" ? remote : HOME,
          depLocal: depLocalFull.slice(11, 16),
          durationMin:
            Number.isFinite(schedMin) && schedMin > 0
              ? schedMin
              : Math.round((dist / config.cruiseKmh) * 60) + 40,
          aircraft: model,
          widebody: model ? WIDEBODY_MODEL.test(model) : dist > WIDEBODY_KM,
          verified: false,
        };
        adbCount++;
      }
    } catch (e) {
      console.log(`  AeroDataBox ${direction} failed: ${e} — keeping observed data`);
    }
    console.log(`  ${adbCount} scheduled ${direction.toLowerCase()}s applied`);
  }

  const genAirports: Record<string, Airport> = {};
  for (const code of [...neededAirports].sort()) {
    const a = airports.get(code)!;
    genAirports[code] = {
      code,
      lat: +a.lat.toFixed(3),
      lon: +a.lon.toFixed(3),
      city: a.city || a.name.replace(/ (International )?Airport$/i, ""),
      tz: a.tz,
    };
  }

  const sortedFlights = Object.fromEntries(
    Object.entries(flights).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(outFlights, JSON.stringify(sortedFlights, null, 1));
  writeFileSync(outAirports, JSON.stringify(genAirports, null, 1));

  console.log(`\nwrote ${Object.keys(flights).length} flights → ${outFlights}`);
  console.log(`wrote ${Object.keys(genAirports).length} airports → ${outAirports}`);
  console.log("skipped:", JSON.stringify(skipped));
  console.log("\nRerun on later days to accumulate more observations (cache keeps everything).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
