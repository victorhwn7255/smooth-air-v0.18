# Phase 4 — Validation & calibration (the phase that makes it trustworthy)

Read `prompts/00-context.md`. Requires Phases 1–2. This phase produces evidence,
not features: by the end we know whether the constants in `config.ts` survive
contact with reality, and we adjust them if not.

## Objective
A backtest harness in `tools/validation/` that replays the exact production
pipeline against archived historical forecasts for documented turbulence incidents
and known-smooth control flights, plus a written calibration log.

## Background you need
Open-Meteo archives past forecasts. Use the **Historical Forecast API**:
`https://historical-forecast-api.open-meteo.com/v1/forecast` — same variable names
and multi-coordinate batching as the live GFS endpoint, plus `start_date`/`end_date`
in the past. This lets us compute "what would SmoothAir have said that morning."

Primary incident case: **SQ321, 2024-05-20/21, London LHR → Singapore SIN**, severe
turbulence encounter over the Irrawaddy basin / southern Myanmar region at cruise
(~07:49 UTC on 2024-05-21), widely attributed to convective activity. A valid
pipeline should show an elevated convective zone over the Irrawaddy/Andaman region
for that flight's time window. If it doesn't, that is a *finding*, not a failure of
this phase — document which signal missed and why.

## Tasks

### 1. Case definitions — `tools/validation/cases/`
- `incidents.json`: each case = id, route (from/to/depLocal/date/durationMin/
  widebody), expected region keyword(s), expected mechanism, source note (one-line,
  no copied text). Seed with SQ321 above; add 2–3 more documented 2023–2025
  turbulence incidents **only if** route/date/region are confidently known — quality
  over quantity, and mark any uncertain field `"uncertain": true`.
- `smooth.json`: 10+ control flights — routes/dates with no reported events
  (use ordinary dates on SQ345/SQ322-style routes, plus 2–3 short-haul calm-season
  routes). These measure false-alarm tendency.

### 2. Harness — `tools/validation/backtest.ts` (run with `npx tsx`)
For each case:
- Build corridor + time-match using the **production pipeline modules** (import from
  `src/lib/pipeline/` — never reimplement).
- Fetch archived weather via the historical endpoint (small `sources`-style adapter
  inside tools/ is fine; it is I/O, so it doesn't belong in pipeline/).
- Run scoring → zones → grade.
- Score the result: for incidents, did any zone's region match an expected keyword
  with class ≥ light (and ≥ moderate as a stricter tier)? For smooth controls, was
  the grade smooth/light-only?
- Output: a per-case table (case, expected, got, peak S, verdict) and summary
  metrics: incident hit-rate (light+ and moderate+), smooth-control false-alarm
  rate, plus the S distribution percentiles across all sampled waypoints
  (p50/p90/p99) — these percentiles are what Phase-4 retuning decisions hang on.
- `--json` flag writes results to `tools/validation/results/<date>.json` so reruns
  after retuning are diffable.

### 3. Calibration pass
- Manually (you, the agent) compare 3–5 live SmoothAir briefings against
  https://turbli.com for the same flights/dates. Record zone-location agreement
  and severity agreement in the log. Do not scrape Turbli; eyeball and transcribe
  conclusions only.
- If evidence indicates systematic bias (e.g., smooth controls frequently produce
  moderate zones → thresholds too hot), adjust **only** `config.ts` values, one at
  a time, rerun the harness, and record before/after metrics.
- Target bias: **asymmetric**. False "expect bumps" is cheap; false "smooth" is
  expensive. Prefer thresholds where smooth-control false-alarm (moderate+) ≤ ~20%
  even at the cost of missing some light chop on incidents.

### 4. Calibration log — `references/calibration-log.md`
Date, harness version, metrics table, every constant change with rationale,
Turbli comparison notes, open questions. This file is the project's scientific
conscience — keep it current in every future tuning session.

## Definition of done
- `npx tsx tools/validation/backtest.ts` runs end-to-end against the historical API
  and prints the table + metrics.
- SQ321 case result is documented either as a hit or as an analyzed miss.
- `references/calibration-log.md` exists with at least one full run recorded.
- Any `config.ts` changes are committed separately with metrics in the message.
- All existing tests still green (if boundaries changed, update boundary tests
  deliberately and say so).

## Out of scope
Corridor baking (Phase 5) — run this phase on great-circle corridors and note that
route error is a known confound; Phase 5 reruns will quantify the improvement.
