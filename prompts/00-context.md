# 00 — Project context (read before every phase)

You are implementing **SmoothAir**, a turbulence-briefing web app for personal/family use.
A user enters a flight number; the app targets the **next departure** of that flight by
default (date changeable) and returns: a route briefing, turbulence zones (where / when /
severity / probability / mechanism / confidence), an overall smoothness grade, and a
plain-language paragraph written for a nervous flyer.

## Non-negotiable constraints

1. **Zero API keys, zero paid services.** Data sources: Open-Meteo (free, non-commercial,
   keyless) and aviationweather.gov (keyless). Never add a service that requires a key,
   except the single documented Upstash option in Phase 6.
2. **`src/lib/pipeline/` is pure.** No `fetch`, no DOM, no file I/O, no `Date.now()` inside
   pipeline functions (pass timestamps in). All I/O lives in `src/lib/sources/`.
3. **All tuning constants live in `src/lib/data/config.ts`** — never inline magic numbers.
4. **Reference files (`references/`):**
   - `smoothair-v1.html` — canonical for **behavior**. Phase 1 ports its pipeline exactly.
   - `smoothair-slock.html` — canonical for **visuals**. A working Slock-styled build of
     the same app; open it in a browser when judging Phase 3 output.
   - `slock-design-system.md` + `slock-theme.json` — the **design source of truth**.
     Phase 3 implements these documents, not a paraphrase of them.
   - Any other design files present (e.g. DESIGN.md / "Atmospheric Glass") are
     **not in use** — ignore them.
5. **Honesty over confidence in all user-facing output.** Grades not fake-precise scores,
   probability bands not bare decimals, confidence labels everywhere, and a visible
   disclaimer: comfort briefing only, not for flight planning.
6. **No new runtime dependencies** without strong justification. Next.js + Tailwind +
   vitest. No state libraries, no UI kits, no date libraries (use Intl).

## Stack & layout

Next.js (App Router, TypeScript, `src/` dir) + Tailwind. Vitest for tests.
Single deployable; API routes are the backend.

```
src/app/                 pages + api/briefing + api/feedback
src/components/          FlightForm, GradeCard, FlightRibbon, ZoneCard,
                         BriefingProse, RouteTable
src/lib/pipeline/        geo, corridor, timing, scoring, zones, narrative  (PURE)
src/lib/sources/         openmeteo, sigmet, demo                            (I/O)
src/lib/data/            config.ts, flights.json, airports.json,
                         regions.json, corridors/
src/lib/types.ts         single source of truth for shared types
tests/                   vitest suite
tools/                   corridor-baker/, validation/   (local-only, never deployed)
```

## Core domain spec (authoritative — do not re-derive)

**Severity index per waypoint** (see v1 `scoreWaypoint`):
- Convert wind speed/direction (knots, meteorological convention) to u/v in m/s:
  `u = -spd*0.514444*sin(dir°)`, `v = -spd*0.514444*cos(dir°)`
- Vertical wind shear between 300 and 250 hPa:
  `VWS = |V250 − V300| / Δz` where `Δz = gph250 − gph300` (m), clamp Δz ≥ 600
- `S_shear = ramp(VWS, 0.003, 0.013)` (s⁻¹)
- `S_jet = ramp(ws250kt, 60, 120)`
- `S_cat = min(1, S_shear × (1 + 0.5·S_jet))`
- `S_conv = ramp(CAPE, 500, 3000) × max(0.3, precipProb/100)`
- `S = max(S_cat, S_conv)` — mechanisms combine by max, never sum
- `ramp(x, lo, hi) = clamp((x−lo)/(hi−lo), 0, 1)`

**Classes** (on S, narrowbody): smooth < 0.10 ≤ light < 0.22 ≤ moderate < 0.75 ≤ severe.
Widebody: multiply boundaries by 1.2.

**Probabilities** (hand-anchored until Phase 4 recalibrates):
`P = σ(a + b·S)` with light: a=−2.2 b=4.5; moderate: a=−5.3 b=6.1. Present as bands
("slim", "roughly 1-in-5", "roughly 1-in-3", "near-even", "good"), never bare decimals
in prose.

**Zones:** flag waypoints with S ≥ lightBoundary×bodyFactor; merge runs allowing 1-gap;
zone gets peak S, dominant mechanism (Sconv vs Scat at peak), majority region name,
start/end elapsed hours.

**Confidence tier:** hours-to-departure ≤18 → high, ≤60 → medium, else low; if any
convective zone and departure >24h away, drop one tier. Refuse briefings >120h out.

**Next-departure default (date UX decision, final):** entering a flight number targets
the next valid departure — "today at the origin airport, in origin-local time, if the
departure time hasn't passed; otherwise the next operating day." `flights.json` entries
carry optional `operatingDays: [1..7]` (ISO weekday numbers, default daily). The date is
always visible and changeable; briefing a flight days ahead is a primary use case.

**Open-Meteo (GFS endpoint):**
`https://api.open-meteo.com/v1/gfs` with
`hourly=wind_speed_250hPa,wind_direction_250hPa,wind_speed_300hPa,wind_direction_300hPa,wind_speed_200hPa,wind_direction_200hPa,geopotential_height_250hPa,geopotential_height_300hPa,cape,precipitation_probability`
`&wind_speed_unit=kn&timeformat=unixtime&timezone=GMT&start_date=…&end_date=…`.
Batch ≤25 comma-separated coordinates per request; multi-coordinate responses are an
array of per-location objects (wrap single objects defensively). Match each waypoint to
the nearest hourly timestamp.

**SIGMETs:** `https://aviationweather.gov/api/data/isigmet?format=json`. Filter hazards
containing TURB/TS/CONV; point-in-polygon test corridor waypoints against `coords`,
with ±1h slack on validTimeFrom/To. Must degrade gracefully (never block the briefing).

**Corridor:** great-circle slerp sampled every 150 km, time-matched by
`elapsed = fraction × duration`. Phase 5 replaces geometry with baked real tracks.

## Design direction (final decision: Slock)

The UI implements the Slock design system. `references/slock-design-system.md` is the
*how/why*; `references/slock-theme.json` is the token values; both are authoritative over
anything written here. Key facts agents must not "improve away": 0px border radius
everywhere (only the online dot and toggle track are round), 2px solid black borders on
every interactive surface, hard-offset shadow `2px 2px 0 0 #000` only, Space Grotesk
400/700 + Space Mono only, instant 50ms hover color swaps, stamp-press active state,
loud yellow chrome / quiet cream content.

**SmoothAir-specific Slock mappings (final):**
- Generate briefing button = cyan (create); chips follow Slock accent semantics
  (pink = active/selected e.g. confidence, teal = technical e.g. "GFS · Open-Meteo",
  lavender = tags e.g. mechanism, salmon = zone-card left borders).
- Severity uses Slock's own status tokens: success `#2DC653` (smooth), warning
  `#FF9F1C` (light), error `#E63946` (moderate/severe).
- The briefing paragraph renders as the peach `#FFE5CC` agent-message bubble.
- **Contrast guardrail:** verify black text on `#E63946` and `#FF9F1C` chips meets
  WCAG AA at the sizes used; if a combination fails, use white text on that chip and
  note the deviation — accessibility outranks the style guide.

## Working agreements for agents

- Run `npm test` before declaring any phase done; green tests are part of every
  phase's definition of done.
- Small commits per task with descriptive messages.
- If the v1 file and a phase prompt conflict, the phase prompt wins; note the
  divergence in the commit message. If the Slock docs and this file conflict on a
  visual detail, the Slock docs win.
- If something is genuinely ambiguous, choose the simplest behavior, implement it,
  and leave a `// DECISION:` comment explaining the choice.
