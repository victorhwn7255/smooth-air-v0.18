# Change log

## 2026-06-11 — Phase 1: Foundation (scaffold + pipeline port)

- Initialized git repo (local only, never pushed) with baseline commit of docs/prompts/references.
- Scaffolded Next.js 16 (App Router, TS, Tailwind 4, `src/` dir) + vitest 4; scripts `dev/build/test/test:watch`. Existing `.gitignore` already covered all required entries — kept as-is.
- `src/lib/types.ts`: Airport, FlightEntry (operatingDays/verified), Waypoint, WeatherSample (incl. 200 hPa fields), SegmentScore, SeverityClass, Mechanism, Zone, ConfidenceTier, Grade, SigmetStatus, Briefing.
- `src/lib/data/`: config.ts (every v1 CONFIG constant, commented with units), flights.json (SQ345 verified, SQ346 unverified), airports.json (32 airports), regions.json (33 ordered boxes incl. Caucasus + Central Asia patches; North Pacific lon hi 230 = −130+360).
- `src/lib/pipeline/`: geo (gcKm/slerp/regionFor), timing (utcFromLocal, nearestHourIndex, NEW nextDeparture(flight, tz, nowMs)), corridor (buildCorridor + bakedCorridor hook for Phase 5), scoring (scoreWaypoint/classify/ramp/sigmoid), zones (detectZones, 1-gap merge), narrative (gradeOf/briefingText/confidenceTier(dep, now, zones)/fmtH/fmtDur/pctBand). All pure — no fetch/DOM/IO/Date.now.
- `tests/`: 5 files, 21 tests, all green. `npm run build` green. Purity greps clean.
- DEVIATION: phase prompt expected Sconv ≈ 0.44 for CAPE 2400/pprob 70; the authoritative ramp in 00-context gives 0.532 — followed the context formula, DECISION comment in tests/scoring.test.ts.
