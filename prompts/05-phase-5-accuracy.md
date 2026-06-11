# Phase 5 — Accuracy: real corridors + altitude-aware scoring

Read `prompts/00-context.md`. Requires Phases 1–2 and ideally 4 (so improvement is
measurable). This phase attacks the two largest error sources: route error
(great-circle vs actual track) and altitude error (fixed 250/300 hPa vs step-climbs).

## Objective
A local corridor-baker tool that turns historical ADS-B tracks into per-flight
baked corridors (lat/lon + altitude profile), and pipeline changes that use them:
corridor-aware geometry and altitude-aware pressure-level selection.

## Part A — Corridor baker (`tools/corridor-baker/bake.ts`, run with npx tsx)

### Input strategy (be pragmatic; document what you used)
Free historical track access is messy. Acceptable sources, in order of preference:
1. OpenSky Network REST `/tracks` style data with a free account if accessible for
   recent flights (callsign SIA345); 2. community archive dumps (adsb.lol /
   ADSBExchange historical) filtered by callsign; 3. as a floor, accept a
   user-supplied folder of per-flight CSV/JSON track files (`tools/corridor-baker/
   input/`) so the user can manually export a handful of tracks — the tool must
   work from local files regardless of which fetcher succeeds.
Even 5–10 tracks captures most of the win; do not over-engineer acquisition.

### Processing
1. Normalize each track to (lat, lon, altFt, t) points; strip ground/taxi
   (alt < 5,000 ft) and obvious ADS-B glitches (teleports > 50 km between points,
   altitude spikes > 5,000 ft/point).
2. Resample each track to N=200 points by fractional great-circle distance along
   that track.
3. Median across tracks per index → median lat, lon, altFt.
4. Light smoothing (5-point moving average) on the altitude profile only; never
   smooth across the climb/descent boundaries (preserve the step-climb staircase).
5. Downsample to ~70 points; emit `src/lib/data/corridors/<FLIGHT>.json`:
   `{ flight, generatedAt, trackCount, source, points: [[lat, lon, altFt], ...] }`.
6. Print a sanity report: total distance vs great-circle distance (expect +0–6%),
   altitude range, and max deviation from great circle in km.

## Part B — Pipeline changes (small, surgical)

### corridor.ts
If `data/corridors/<flight>.json` exists for the requested flight, build waypoints
from its points: per-point elapsed time by cumulative along-track distance fraction
× duration; carry `altFt` on each Waypoint. Great-circle remains the fallback
(altFt undefined). The briefing payload gains `corridorSource: 'baked' | 'great-circle'`
and the UI meta row should display it (one-line frontend change).

### scoring.ts — altitude-aware level selection
The 200 hPa pair is already fetched. Select the shear pair by waypoint altitude:
- altFt < 32,000 → use 300/250 hPa (current behavior)
- altFt ≥ 32,000 → use 250/200 hPa (gph200 not fetched: derive Δz fallback as
  clamp(gph250-based estimate, 1,300–1,600 m) **or** add geopotential_height_200hPa
  to the fetch — adding the variable is the cleaner fix; do that, update
  openmeteo.ts and the fixture).
- altFt undefined → current behavior. Jet term stays on ws250 in all cases.
Keep `scoreWaypoint` pure: altitude arrives on the waypoint, levels chosen inside.

### Tests
- Baker: unit tests for glitch-stripping, resampling, and median on 3 synthetic
  tracks (no network in tests).
- Scoring: level selection switches at the 32,000 ft boundary; undefined altFt
  preserves Phase-1 behavior bit-for-bit (regression guard).
- Corridor: baked-corridor path produces waypoints whose total distance matches the
  baked track, not the great circle.

## Part C — Measure the win
Re-run the Phase-4 backtest with baked corridors for any case whose flight has one
(at minimum, bake SQ345 and one LHR→SIN-class route for the SQ321 case if track
data is obtainable; otherwise note the limitation). Append before/after metrics to
`references/calibration-log.md`.

## Definition of done
- `npx tsx tools/corridor-baker/bake.ts --flight SQ345` (or with `--input` folder)
  produces a valid corridors/SQ345.json with a sane report.
- Briefings for SQ345 show `corridorSource: 'baked'` and altitude-aware scoring;
  all other flights unchanged.
- All tests green, including the bit-for-bit regression guard.
- Calibration log updated with the before/after comparison (or the documented
  reason it wasn't possible).

## Out of scope
Ensemble probabilities, ECMWF cross-check (v1.1, after MVP ships).
