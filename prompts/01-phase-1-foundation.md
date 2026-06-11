# Phase 1 — Foundation: scaffold + pipeline port

Read `prompts/00-context.md` first. Reference implementation: `references/smoothair-v1.html`.

## Objective
A Next.js project with the entire computation pipeline ported from v1 as pure,
typed, test-covered modules. No UI, no API routes yet. When this phase is done,
`npm test` proves the pipeline behaves identically to v1 (plus the one specified
addition: next-departure logic).

## Tasks

### 1. Scaffold
- Next.js (latest), TypeScript, Tailwind, App Router, `src/` dir, no ESLint prompt
  blocking. Repo root already contains `assets/ prompts/ references/ tests/ tools/`
  and a `.gitignore` — preserve them; merge scaffold's gitignore entries
  (`node_modules`, `.next`, `.env*`, `coverage`) into the existing file.
- Add vitest + `vitest.config.ts` (node environment, `tests/**/*.test.ts`).
- `npm scripts`: `dev`, `build`, `test`, `test:watch`.

### 2. Types — `src/lib/types.ts`
Define and export: `Airport`, `FlightEntry` (incl. optional `operatingDays: number[]`
ISO weekdays 1–7 and `verified: boolean`), `Waypoint` (lat, lon, f, elapsedH, utcMs,
region), `WeatherSample` (ws250, wd250, ws300, wd300, ws200, wd200, gh250, gh300,
cape, pprob — all nullable), `SegmentScore` (S, Scat, Sconv, vws, jet, cape, missing),
`SeverityClass` ('smooth'|'light'|'moderate'|'severe'), `Zone`, `ConfidenceTier`,
`Grade`, `Briefing` (full API payload: flight meta, zones, waypoints+scores for the
route table, grade, confidence, briefing text, demo flag, sigmet status, generatedAt).

### 3. Data — `src/lib/data/`
Port from v1 verbatim:
- `config.ts` — every constant from v1 `CONFIG` (sampleKm 150, cruiseKmh 850, shear
  ramp 0.003–0.013, jet 60–120/boost 0.5, CAPE 500–3000/floor 0.3, widebody 1.2,
  classes 0.10/0.22/0.75, gap merge 1, both logistic pairs). Single exported object,
  every field commented with units.
- `flights.json` — SQ345 (ZRH→SIN 11:40 local, 760 min, 777-300ER, widebody,
  operatingDays [1,2,3,4,5,6,7]) and SQ346 (SIN→ZRH 23:45 — mark `"verified": false`).
  Schema: from, to, depLocal, durationMin, aircraft, widebody, operatingDays, verified.
- `airports.json` — all ~30 airports from v1 (code, lat, lon, city, IANA tz).
- `regions.json` — the ordered bounding-box list from v1 **including the Caucasus
  and Central Asia patches** (order matters; first match wins; fallback "open water").

### 4. Pipeline — `src/lib/pipeline/` (PURE — no I/O, no Date.now())
Port each v1 function into its module, typed:
- `geo.ts` — `gcKm(a,b)`, `slerp(a,b,f)`, `regionFor(lat,lon)` (importing static JSON
  is fine; fetching is not).
- `timing.ts` — `utcFromLocal(dateStr, timeStr, tz)` using the iterative Intl
  technique from v1 (must handle DST); `nearestHourIndex(times[], targetSec)`;
  **NEW: `nextDeparture(flight, originTz, nowMs): string`** returning the ISO date
  (yyyy-mm-dd, origin-local) of the next valid departure — today at the origin if
  the departure time hasn't passed in origin-local time, else the next day whose ISO
  weekday is in `operatingDays` (default: all days). Pure: `nowMs` is a parameter.
- `corridor.ts` — `buildCorridor(fromAp, toAp, depUtcMs, durationMin)` → waypoints
  sampled every `config.sampleKm`. Include (unused until Phase 5) support: if a
  `bakedCorridor` arg is provided, use its points instead of slerp.
- `scoring.ts` — `scoreWaypoint(wx)` exactly per the spec in 00-context, plus
  `classify(S, widebody)`.
- `zones.ts` — `detectZones(wps, scores, widebody)` with 1-gap merge, peak,
  mechanism, majority region, both probabilities.
- `narrative.ts` — `gradeOf(zones, wps, widebody)`, `confidenceTier(depUtcMs, nowMs,
  zones)` (now is a parameter), `briefingText(zones, toCity, depHourLocal)` with
  v1's templates including the severe-aware jet phrasing and `pctBand` bands,
  `fmtH`, `fmtDur`.

### 5. Tests — `tests/`
- `geo.test.ts`: ZRH→SIN distance 10,250–10,360 km; slerp endpoints match inputs;
  midpoint region resolves to a named region; **zero "open water" waypoints on the
  ZRH→SIN corridor**.
- `timing.test.ts`: Zurich 11:40 on a June date → 09:40Z; January date → 10:40Z.
  `nextDeparture`: now = 08:00 Zurich-local → today; now = 13:00 Zurich-local →
  tomorrow; flight with operatingDays [2,4,6] queried on a Saturday afternoon →
  the following Tuesday; daily flight default behaves as before.
- `scoring.test.ts`: calm input → S < 0.05; strong-jet input (130 kt/60 kt over
  1200 m) → S ≥ 0.8 and vws ≈ 0.03; convective input (CAPE 2400, pprob 70) →
  Sconv ≈ 0.44 and mechanism conv > cat; null wind → missing=true, S=0.
- `zones.test.ts`: two separated runs → exactly 2 zones; a single smooth gap inside
  a run merges; classify boundaries respect widebody ×1.2.
- `narrative.test.ts`: no zones → smooth grade + smooth text; severe jet zone uses
  the "genuinely rough stretch" template; confidence drops one tier for a convective
  zone at 30h out; the >120h refusal is the caller's concern — do not encode it here.

## Definition of done
- `npm run build` succeeds; `npm test` fully green.
- `grep -rn "fetch(" src/lib/pipeline/` returns nothing;
  `grep -rn "Date.now" src/lib/pipeline/` returns nothing.
- No constant appears in pipeline code that isn't imported from `config.ts`.
- Commit history shows scaffold / types+data / pipeline / tests as separate commits.

## Out of scope (do NOT do)
UI, API routes, Open-Meteo calls, SIGMET, demo generator, corridor baking, deploy.
