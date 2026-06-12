# Change log

## 2026-06-12 — Design update: ribbon pictograms + share button

- `src/components/icons.tsx`: Lucide plane-takeoff / plane-landing / send inlined verbatim (ISC; no new dependency).
- FlightRibbon: header now `ZRH ✈ · FLIGHT TIMELINE · ✈ SIN` with 16px pictograms; TAKEOFF/LANDING text row removed (owner's call — dep time lives on the grade card).
- GradeCard: 34px share button top-right (Send icon), `navigator.share({title, url})` with AbortError-aware clipboard fallback + aria-live "Link copied" confirmation; flight-line stack padded so text never collides. DECISION: shares current URL — deep-link params await the URL-state feature.
- Verified (RUN): 43/43 tests, build clean, compliance greps empty, 7 browser checks (pictograms, no text row, button geometry/inset, no flight-line collision, clipboard fallback, 360px overflow-free); screenshots vs bundle refs 02/06/07/12. Note: headless Chrome's navigator.share hangs forever — test stubs it out to exercise the fallback; real browsers settle the promise.

## 2026-06-12 — UI redesign (design handoff v2, winners locked)

- Implemented `design_handoff_smoothair_slock/` spec across 8 components, one commit each: tokens (surface-alt/cream, skel-pulse keyframes, routewrap scrollbar CSS, reduced-motion guard), FlightForm (flex controls, separated statement/unverified lines with ONE affordance each, change-date reveal), page (notice roles, working skeleton, open-water locator derivation), GradeCard (stacked flight line, sub-line, departed chip), FlightRibbon (numbered bands + flow legend, ticks retired), ZoneCard (numbered, open-water presentation), RouteTable (sticky first col + square scrollbar), FeedbackRow (locked copy), error.tsx.
- DECISION: working notice shows "Fetching winds aloft…" without the mock's canned live counts — the real API is one request; no fabricated progress.
- Acceptance (all RUN): 43/43 tests, build clean, three compliance greps empty, Lighthouse a11y snapshot **100 on the briefing view** (flow API), 360px overflow-free with collision-free 6-zone legend (Rough+SIGMET scenario injected from the handoff data), screenshots matched against reference PNGs; unverified/404/landed states verified in-browser.

## 2026-06-11 — Post-MVP: inbound Changi flights

- AeroDataBox boards now fetched with `withLeg=true` for BOTH directions: each flight carries both ends' scheduled times, so inbound flights get their published origin departure time (no per-flight calls needed — 4 board calls total) and all entries get true scheduled durations instead of distance estimates.
- Database: **1,058 flights (479 inbound to SIN) / 117 airports**. Verified live: BA11 LHR→SIN briefed with real GFS (19:25 origin-local auto-targeted).
- Quota check: ~600 AeroDataBox api-units/month; a full refresh costs ~4-6 units.
- 43/43 tests green over the full generated set.

## 2026-06-11 — Post-MVP: API keys approved (owner amendment to zero-key rule)

- Owner approved credentials for LOCAL TOOLS ONLY (deployed app stays keyless apart from the already-sanctioned Upstash): `.env.local` carries RAPIDAPI_KEY + OPENSKY_CLIENT_ID/SECRET (verified live). `tools/env.ts` loader + `tools/opensky.ts` OAuth helper.
- Changi DB build: AeroDataBox published departure board (next 24h, 2 calls, per-second throttle + 429 retry) overlays OpenSky observations (7 authenticated daily windows) → **599 flights / 112 airports** generated; 493 entries carry published scheduled times. OpenSky WSSS *arrivals* data is sparse (mostly 404) — DB is departure-heavy; inbound flights mostly come from the 11 observed arrivals.
- Corridors re-baked with authenticated track history: SQ345 from 10 tracks (max dev 378 km), SQ321 from 3 real SIA321 tracks.
- Backtest run 5: incidents back to 2/2 light+ (run-4 MISS was single-track routing noise), smooth FA 1/13 (8%), p99 0.583. Calibration log updated.
- 43/43 tests green; QF2 + EK353 briefed live through the app.

## 2026-06-11 — Post-MVP: SQ660 + Changi flight database

- Added SQ660 (SIN→CTS 23:00, A350-900, verified:false) + CTS airport on user request.
- `tools/flight-db/build-sin.ts`: generates `flights-generated.json` + `airports-generated.json` from observed WSSS traffic (OpenSky anonymous, cached daily windows) + VRS standing-data routes/airlines + mwgg/Airports tz data. depLocal = median observed takeoff (verified:false everywhere); widebody by >4,500 km heuristic; duration by distance estimate; curated files always win (`flightDb.ts`).
- UI: "Knows:" hint + 404 message show generated count; manual selects sorted; narrowbody-aware aircraft fallback on grade card.
- First build returned 0 entries — OpenSky anonymous daily credits exhausted (x-rate-limit-retry-after ≈ 19 h). RERUN NEEDED: `npx tsx tools/flight-db/build-sin.ts` after ~06:30 SGT 2026-06-12 (then `npm test` + commit the generated JSONs).
- 43/43 tests; app verified to degrade gracefully with empty database.

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
