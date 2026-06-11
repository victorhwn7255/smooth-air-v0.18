/**
 * Backtest harness — replays the production pipeline against archived
 * forecasts (Open-Meteo Historical Forecast API) for documented turbulence
 * incidents and known-smooth control flights.
 *
 * Run:  npx tsx tools/validation/backtest.ts [--json]
 * Local-only; never deployed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import airportsJson from "../../src/lib/data/airports.json";
import { buildCorridor } from "../../src/lib/pipeline/corridor";
import { gradeOf } from "../../src/lib/pipeline/narrative";
import { scoreWaypoint } from "../../src/lib/pipeline/scoring";
import { nearestHourIndex, utcFromLocal } from "../../src/lib/pipeline/timing";
import { detectZones } from "../../src/lib/pipeline/zones";
import type { Airport, Waypoint, WeatherSample, Zone } from "../../src/lib/types";
import incidents from "./cases/incidents.json";
import smoothCases from "./cases/smooth.json";

const AIRPORTS = airportsJson as Record<string, Airport>;

interface CaseRoute {
  from: string;
  to: string;
  depLocal: string;
  date: string;
  durationMin: number;
  widebody: boolean;
}

/* ---- historical-forecast adapter (I/O lives here, not in pipeline/) ---- */
const OM_VARS = [
  "wind_speed_250hPa",
  "wind_direction_250hPa",
  "wind_speed_300hPa",
  "wind_direction_300hPa",
  "wind_speed_200hPa",
  "wind_direction_200hPa",
  "geopotential_height_250hPa",
  "geopotential_height_300hPa",
  "geopotential_height_200hPa",
  "cape",
  "precipitation_probability",
].join(",");

async function fetchHistorical(
  wps: Waypoint[],
  depUtcMs: number,
  arrUtcMs: number,
): Promise<WeatherSample[]> {
  const d0 = new Date(depUtcMs - 36e5).toISOString().slice(0, 10);
  const d1 = new Date(arrUtcMs + 72e5).toISOString().slice(0, 10);
  const out = new Array<WeatherSample>(wps.length);
  for (let i = 0; i < wps.length; i += 25) {
    const part = wps.slice(i, i + 25);
    const url =
      "https://historical-forecast-api.open-meteo.com/v1/forecast" +
      "?latitude=" + part.map((w) => w.lat).join(",") +
      "&longitude=" + part.map((w) => w.lon).join(",") +
      "&hourly=" + OM_VARS +
      "&wind_speed_unit=kn&timeformat=unixtime&timezone=GMT" +
      `&start_date=${d0}&end_date=${d1}`;
    let r = await fetch(url);
    for (let retry = 0; r.status === 429 && retry < 3; retry++) {
      console.error("  429 rate-limited — waiting 65s…");
      await new Promise((res) => setTimeout(res, 65000));
      r = await fetch(url);
    }
    if (!r.ok) throw new Error(`historical API HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    await new Promise((res) => setTimeout(res, 1500)); // stay under minutely limit
    const json = await r.json();
    const locs = Array.isArray(json) ? json : [json];
    locs.forEach((loc, k) => {
      const w = wps[i + k];
      const bi = nearestHourIndex(loc.hourly.time, w.utcMs / 1000);
      const g = (v: string) => {
        const arr = loc.hourly[v];
        const x = arr ? arr[bi] : null;
        return x == null ? null : x;
      };
      out[i + k] = {
        ws250: g("wind_speed_250hPa"), wd250: g("wind_direction_250hPa"),
        ws300: g("wind_speed_300hPa"), wd300: g("wind_direction_300hPa"),
        ws200: g("wind_speed_200hPa"), wd200: g("wind_direction_200hPa"),
        gh250: g("geopotential_height_250hPa"), gh300: g("geopotential_height_300hPa"),
        gh200: g("geopotential_height_200hPa"),
        cape: g("cape"), pprob: g("precipitation_probability"),
      };
    });
  }
  return out;
}

/* ---- per-case run ---- */
const SEV_RANK = { smooth: 0, light: 1, moderate: 2, severe: 3 } as const;

interface CaseResult {
  id: string;
  type: "incident" | "smooth";
  expected: string;
  got: string;
  peakS: number;
  zones: { region: string; cls: string; mech: string; peak: number }[];
  grade: string;
  verdict: string;
  allS: number[];
}

async function runCase(
  id: string,
  type: "incident" | "smooth",
  route: CaseRoute,
  expectedRegions?: string[],
  expectedMechanism?: string,
): Promise<CaseResult> {
  const fromAp = AIRPORTS[route.from];
  const toAp = AIRPORTS[route.to];
  const depUtcMs = utcFromLocal(route.date, route.depLocal, fromAp.tz);
  const { wps } = buildCorridor(fromAp, toAp, depUtcMs, route.durationMin);
  const wx = await fetchHistorical(wps, depUtcMs, depUtcMs + route.durationMin * 60e3);
  const scores = wx.map(scoreWaypoint);
  const zones = detectZones(wps, scores, route.widebody);
  const grade = gradeOf(zones, wps, route.widebody);
  const peakS = Math.max(0, ...scores.map((s) => s.S));

  let verdict: string;
  let expected: string;
  if (type === "incident") {
    expected = `${expectedRegions!.join("/")} (${expectedMechanism})`;
    const match = (z: Zone) =>
      expectedRegions!.some((k) =>
        z.region.toLowerCase().includes(k.toLowerCase()),
      );
    const hitLight = zones.some((z) => match(z) && SEV_RANK[z.cls] >= 1);
    const hitMod = zones.some((z) => match(z) && SEV_RANK[z.cls] >= 2);
    verdict = hitMod ? "HIT(mod+)" : hitLight ? "HIT(light)" : "MISS";
  } else {
    expected = "smooth/light only";
    const falseAlarm = zones.some((z) => SEV_RANK[z.cls] >= 2);
    verdict = falseAlarm ? "FALSE-ALARM" : "CLEAN";
  }
  const got = zones.length
    ? zones
        .map((z) => `${z.region} ${z.cls}/${z.mech === "convection" ? "conv" : "cat"}`)
        .join("; ")
    : "no zones";
  return {
    id, type, expected, got, peakS,
    zones: zones.map((z) => ({ region: z.region, cls: z.cls, mech: z.mech, peak: z.peak })),
    grade: grade.label, verdict,
    allS: scores.map((s) => s.S),
  };
}

/* ---- main ---- */
const pct = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

async function main() {
  const results: CaseResult[] = [];
  for (const c of incidents)
    results.push(
      await runCase(c.id, "incident", c.route as CaseRoute, c.expectedRegions, c.expectedMechanism),
    );
  for (const c of smoothCases)
    results.push(await runCase(c.id, "smooth", c.route as CaseRoute));

  // table
  const wid = [22, 9, 34, 11, 7, 12];
  const row = (cols: string[]) =>
    cols.map((c, i) => c.slice(0, wid[i] - 1).padEnd(wid[i])).join("");
  console.log(row(["CASE", "TYPE", "EXPECTED", "GRADE", "PEAK S", "VERDICT"]));
  console.log("-".repeat(wid.reduce((a, b) => a + b)));
  for (const r of results)
    console.log(row([r.id, r.type, r.expected, r.grade, r.peakS.toFixed(2), r.verdict]));
  console.log("");
  for (const r of results) console.log(`${r.id}: ${r.got}`);

  // metrics
  const inc = results.filter((r) => r.type === "incident");
  const sm = results.filter((r) => r.type === "smooth");
  const hitsL = inc.filter((r) => r.verdict.startsWith("HIT")).length;
  const hitsM = inc.filter((r) => r.verdict === "HIT(mod+)").length;
  const fa = sm.filter((r) => r.verdict === "FALSE-ALARM").length;
  const allS = results.flatMap((r) => r.allS).sort((a, b) => a - b);
  const metrics = {
    incidents: inc.length,
    incidentHitRateLight: hitsL / inc.length,
    incidentHitRateModerate: hitsM / inc.length,
    smoothControls: sm.length,
    smoothFalseAlarmRate: fa / sm.length,
    sPercentiles: { p50: pct(allS, 50), p90: pct(allS, 90), p99: pct(allS, 99) },
    waypointsSampled: allS.length,
  };
  console.log("\nSUMMARY");
  console.log(`incident hit-rate light+ : ${hitsL}/${inc.length}`);
  console.log(`incident hit-rate mod+   : ${hitsM}/${inc.length}`);
  console.log(`smooth false-alarm (mod+): ${fa}/${sm.length} (${((fa / sm.length) * 100).toFixed(0)}%)`);
  console.log(
    `S percentiles (n=${allS.length}): p50=${metrics.sPercentiles.p50.toFixed(3)} p90=${metrics.sPercentiles.p90.toFixed(3)} p99=${metrics.sPercentiles.p99.toFixed(3)}`,
  );

  if (process.argv.includes("--json")) {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "results");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, new Date().toISOString().slice(0, 10) + ".json");
    writeFileSync(file, JSON.stringify({ metrics, results }, null, 2));
    console.log("\nwrote " + file);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
