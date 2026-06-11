# Change log

## 2026-06-11 — Phase 6: Ship (feedback loop + hardening; deploy NEEDS-HUMAN)

- Feedback: `feedbackStore.ts` (file driver + Upstash REST driver by env presence, append-only), `POST /api/feedback` (validated, 503 friendly when storage unavailable), `GET /api/feedback/export` (?key= gate via FEEDBACK_EXPORT_KEY), one-tap FeedbackRow shown only for past departures, `.env.example` documenting the single permitted credential.
- Hardening: per-IP token bucket on /api/briefing (30/h, verified 429 on request 31), 10s weather timeout via AbortController (SIGMET already 5s), `/api/health` (version+uptime), `error.tsx` calm failure state, stale-schedule prompt "departs 23:45, still right?" for unverified flights.
- README rewritten for the finished app; `references/release-checklist.md` executed (3 human items open).
- Verified live: health, feedback POST/export/validation, >120h refusal, rate limit, and 6 browser checks (stale prompt, feedback tap → thank-you → stored, no row for future departures, baked-route chip). 40/40 tests, build clean.
- NEEDS-HUMAN: vercel login + deploy, Upstash env (optional), production cache check, README URL, Turbli comparison, SQ346 schedule verification, real-phone pass.

## 2026-06-11 — Phase 5: Accuracy (baked corridors + altitude-aware scoring)

- `tools/corridor-baker/`: lib.ts (firstLeg cut, speed-aware glitch strip — naive distance filter cascaded after coverage gaps; resample-by-distance; per-index median; boundary-preserving altitude smoothing) + bake.ts (OpenSky anonymous fetch in ≤1-day windows, raw-track cache in input/ accumulates across days, user CSV/JSON floor, --from/--to override).
- Baked `corridors/SQ345.json` (1 track, +2.1% vs GC) and `corridors/SQ321.json` (via SIA319 same city pair, +3.0%, 943 km southern deviation).
- Pipeline: corridor.ts baked path = cumulative-distance timing + altFt; scoring.ts altitude-aware 300/250 vs 250/200 pair switch at config.highCruiseFt (32,000 ft), jet term stays ws250, undefined altFt bit-for-bit Phase-1; gh200 added to openmeteo/fixture/demo/backtest; payload + UI chip corridorSource; next.config traces corridors for serverless.
- Tests 37/37 green (baker units, level switch, regression guard, baked-distance).
- Backtest run 4: FA unchanged 2/13, p99 0.773→0.675; SQ321 GC HIT(light) → baked MISS (single-2026-track routing shifts signal to adjacent regions) — analyzed in calibration log.

## 2026-06-11 — Phase 4: Validation & calibration

- `tools/validation/`: cases (2 incidents — SQ321, QR017; 13 smooth controls) + backtest.ts harness replaying the production pipeline against the Open-Meteo Historical Forecast API (429 retry + throttle; --json writes results/).
- Added DUB to airports.json (QR017 case). 
- Baseline (v1 constants): incidents 2/2 light+, smooth false-alarm mod+ 85%, S p99=1.0 (saturation).
- Retuned one knob at a time: shearHi 0.013→0.020 (FA 69%), classModerate 0.22→0.50 (FA 15% — meets ≤~20% asymmetric target). Incidents stayed 2/2 light+. zones.test boundary expectations updated deliberately.
- `references/calibration-log.md` created (runs, SQ321 analysis, open questions). NEEDS-HUMAN: Turbli eyeball comparison (site 403s automated clients) — instructions + blank table in the log.

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
