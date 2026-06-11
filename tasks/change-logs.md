# Change log

## 2026-06-11 — Phase 3: Frontend (Slock)

- globals.css: Slock tokens as Tailwind 4 `@theme` (radius/text/weight/color/shadow namespaces reset and replaced per design-system §6). layout.tsx: Space Grotesk + Space Mono 400/700 via next/font.
- Components: FlightForm (next-departure statement + change-date reveal, manual route mode, unverified-schedule note), GradeCard (accent-block grade, chip meta row), FlightRibbon (staggered ticks; in-band labels only on bands ≥10% wide — DECISION), ZoneCard (salmon-left thread card), BriefingProse (peach bubble), RouteTable (mono table, severity squares).
- page.tsx: client orchestration, error/demo notices, footer disclaimer + attribution.
- Verified: build + 27 tests green; Lighthouse accessibility 100; 14 headless-Chrome checks (sections render live, 360px no overflow, keyboard-only flow, demo banner, computed-style sweep: zero radius >0, zero blur, weights 400/700 only); contrast black-on-warning 10.23, black-on-error 5.04 — AA passes, no white-text deviation needed; visual side-by-side vs smoothair-slock.html.

## 2026-06-11 — Phase 2: Data sources + briefing API

- `src/lib/sources/openmeteo.ts`: fetchWeather — GFS endpoint with full variable list (incl. 200 hPa pair), kn/unixtime/GMT, dep−1h…arr+2h window, ≤25-coordinate sequential chunks, defensive array-wrap, nearest-hour matching, `{ next: { revalidate: 21600 } }` data cache; throws typed WeatherUnavailableError.
- `src/lib/sources/sigmet.ts`: overlaySigmets — TURB/TS/CONV filter, point-in-polygon, ±1h slack, 5s AbortController timeout, never throws.
- `src/lib/sources/demo.ts`: v1 demoWeather ported verbatim (mulberry32, jet/tropics belts); ws200/wd200 null (v1 didn't synthesize them).
- `src/app/api/briefing/route.ts`: GET — flight ("sq 345" normalized) or manual from/to/time; missing date defaults to nextDeparture (DECISION); >120h → 422; demo fallback flagged, SIGMET skipped on demo; full Briefing payload + dataSource. types.ts: added `dataSource` to Briefing.
- `tests/api.test.ts` + fixture: 6 cases (happy, OM-500→demo, SIGMET-abort→checked:false, 404, 422, 400). 27 tests green.
- Live verification: real GFS briefing for SQ345 2026-06-12 — demo:false, 7 zones, maxS 1.0, maxVws 0.0178, sigmet checked; cache 2.1s → 0.07s.

## 2026-06-11 — Phase 1: Foundation (scaffold + pipeline port)

- Initialized git repo (local only, never pushed) with baseline commit of docs/prompts/references.
- Scaffolded Next.js 16 (App Router, TS, Tailwind 4, `src/` dir) + vitest 4; scripts `dev/build/test/test:watch`. Existing `.gitignore` already covered all required entries — kept as-is.
- `src/lib/types.ts`: Airport, FlightEntry (operatingDays/verified), Waypoint, WeatherSample (incl. 200 hPa fields), SegmentScore, SeverityClass, Mechanism, Zone, ConfidenceTier, Grade, SigmetStatus, Briefing.
- `src/lib/data/`: config.ts (every v1 CONFIG constant, commented with units), flights.json (SQ345 verified, SQ346 unverified), airports.json (32 airports), regions.json (33 ordered boxes incl. Caucasus + Central Asia patches; North Pacific lon hi 230 = −130+360).
- `src/lib/pipeline/`: geo (gcKm/slerp/regionFor), timing (utcFromLocal, nearestHourIndex, NEW nextDeparture(flight, tz, nowMs)), corridor (buildCorridor + bakedCorridor hook for Phase 5), scoring (scoreWaypoint/classify/ramp/sigmoid), zones (detectZones, 1-gap merge), narrative (gradeOf/briefingText/confidenceTier(dep, now, zones)/fmtH/fmtDur/pctBand). All pure — no fetch/DOM/IO/Date.now.
- `tests/`: 5 files, 21 tests, all green. `npm run build` green. Purity greps clean.
- DEVIATION: phase prompt expected Sconv ≈ 0.44 for CAPE 2400/pprob 70; the authoritative ramp in 00-context gives 0.532 — followed the context formula, DECISION comment in tests/scoring.test.ts.
