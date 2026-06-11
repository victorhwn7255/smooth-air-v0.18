# Phase 2 — Data sources + briefing API

Read `prompts/00-context.md`. Requires Phase 1 complete (pipeline + tests green).

## Objective
A working `GET /api/briefing?flight=SQ345&date=YYYY-MM-DD` that returns a full
`Briefing` JSON using live Open-Meteo data, with SIGMET overlay, server-side caching,
and a clearly-flagged demo fallback. After this phase, `curl` against the dev server
returns a real briefing.

## Tasks

### 1. `src/lib/sources/openmeteo.ts`
- `fetchWeather(wps, depUtcMs, arrUtcMs): Promise<WeatherSample[]>`
- Build URLs per the spec in 00-context (GFS endpoint, exact variable list including
  the 200 hPa pair, `wind_speed_unit=kn`, `timeformat=unixtime`, `timezone=GMT`,
  start_date = dep−1h date, end_date = arr+2h date).
- Chunk ≤25 coordinates/request, sequential requests, defensive array-wrap of the
  response, nearest-hour matching via `timing.nearestHourIndex`.
- Use Next's extended fetch with `{ next: { revalidate: 21600 } }` so identical
  corridor requests within a 6h GFS cycle hit the data cache, not the network.
- On any HTTP/network error, throw a typed `WeatherUnavailableError` — the route
  decides fallback policy, not this module.

### 2. `src/lib/sources/sigmet.ts`
- `overlaySigmets(wps, zones): Promise<{checked: boolean, hits: number}>`
- Endpoint + filtering + point-in-polygon + ±1h time slack per 00-context spec.
  Mutates matching zones with `sigmet: true`.
- Wrap everything in try/catch → `{checked:false, hits:0}`. 5s timeout via
  AbortController. SIGMET failure must never fail a briefing.

### 3. `src/lib/sources/demo.ts`
- Port v1's **tuned** `demoWeather(wps)` exactly (mulberry32 seeded by waypoint,
  midlat jet belt σ²=220 centered |lat|=36, jet pulse at f=0.34 with σ²=0.003,
  ws250 = 30+40·midlat+38·pulse·midlat+8r, ratio = 0.91−0.08·pulse·midlat−0.02r,
  wd300 = wd250−(1.5+2.5·pulse), tropics belt |lat|=9 σ²=110,
  CAPE = max(0, 2300·tropics·(0.35+0.7r)−150)). These numbers were calibrated to
  produce realistic briefings — do not "improve" them.

### 4. `src/app/api/briefing/route.ts`
Request flow:
1. Validate params; resolve flight via `flights.json` (normalize "sq 345" → "SQ345").
   Unknown flight → 404 with the list of known flights. Support manual mode:
   `?from=ZRH&to=SIN&time=11:40` as an alternative to `flight` (duration estimated
   `gcKm/850·60 + 40` min).
2. Compute depUtcMs via `timing.utcFromLocal` with the origin airport tz.
   If departure > 120h from now → 422 with the "too early" message.
3. `buildCorridor` → `fetchWeather`; on `WeatherUnavailableError`, fall back to
   `demoWeather` and set `demo: true` in the payload (never silently).
4. Score → zones → SIGMET overlay (skip if demo) → grade → confidence
   (pass `Date.now()` in) → briefing text.
5. Return the full `Briefing` payload incl. waypoints+scores (route table needs
   them), `generatedAt`, `dataSource: 'gfs-openmeteo' | 'demo'`.
- Errors are JSON `{error: string}` with correct status codes; messages written for
  humans ("Don't know SQ999 yet — add it to flights.json"), not stack traces.

### 5. Integration tests — `tests/api.test.ts`
Mock global fetch (vitest `vi.stubGlobal`). Cases:
- happy path returns 200 with zones array, grade, briefing text;
- Open-Meteo 500 → 200 with `demo: true`;
- SIGMET timeout → 200 with `sigmet.checked === false`;
- unknown flight → 404; date 7 days out → 422; from === to → 400.
Fixture: a small canned Open-Meteo multi-location response in `tests/fixtures/`.

## Definition of done
- `npm test` green including new API tests.
- With dev server running and network available:
  `curl "localhost:3000/api/briefing?flight=SQ345&date=<tomorrow>"` returns a
  non-demo briefing with ≥0 zones and plausible numbers (S values ≤ 1, vws < 0.02).
- Second identical curl within a minute is served noticeably faster (cache hit).
- `src/lib/pipeline/` is untouched by this phase except possibly type imports.

## Out of scope
UI, feedback endpoint, corridor baking, deploy.
