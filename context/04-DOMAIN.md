# 04 — Domain: turbulence terms & how to present them

**Snapshot: 2026-06-15.** You don't compute any of this (the API does) — but you
must *present* it correctly and honestly. Exact tunable numbers live in
`../smooth-air/src/lib/data/config.ts`; the values below are stable enough to
rely on for UI logic.

## Severity classes (`Zone.cls`, and per-waypoint via score)

A severity index **S** (0–1) maps to four classes. Boundaries (narrowbody;
multiply by **1.2** for widebody):
- **smooth** — S < 0.10
- **light** — 0.10 ≤ S < 0.50
- **moderate** — 0.50 ≤ S < 0.75
- **severe** — S ≥ 0.75

Colors (Slock status tokens, black text on all): smooth `#2DC653` · light
`#FF9F1C` · moderate & severe `#E63946`.

## Mechanisms (`Zone.mech`)

- **"jet shear"** → present as **"jet-stream shear"** (clear-air turbulence near
  the jet). Reassurance: firm but familiar, "rattles cups, not nerves."
- **"convection"** → present as **"thunderstorms"**. Reassurance: storm cells
  show on radar long before you reach them; crews steer around them.

## Confidence tiers (`Briefing.confidence`)

Driven by hours-to-departure (`hrs`):
- ≤ 18h → **high** · ≤ 60h → **medium** · else → **low**
- If any **convective** zone and departure > 24h away → drop one tier
  (thunderstorms are unpredictable far out).
- The API refuses flights > 120h (5 days) out (HTTP 422).

This is why a shared/bookmarked briefing should be *re-checked closer to
departure* — confidence improves as the day nears. Always show the tier.

## Probability bands (present words first, % only as secondary)

`Zone.pLight` / `Zone.pMod` are 0–1. Map to plain-language bands:
- < 0.12 → **"slim"**
- < 0.30 → **"roughly 1-in-5"**
- < 0.45 → **"roughly 1-in-3"**
- < 0.62 → **"near-even"**
- else → **"good"** (i.e. a good chance of bumps)

Example row: *"noticeable bumps — roughly 1-in-3 (34%)"*. The band is the
message; the % is a quiet secondary. **Never** lead with a bare decimal.

## Grade (`Briefing.grade`)

- `label` — the headline, e.g. *"Smooth with light chop in places"* or *"A
  rough one — brace for real bumps"*. Render the clause after the "—" in a solid
  highlight block (green normally; orange when `grade.warn` is true).
- `sub` — a one-line qualifier under it.
- `warn` — true for the worst grades; drives the orange highlight.

## Status flags

- **`demo: true`** (`dataSource: "demo"`) → live weather was unavailable; the
  numbers are realistic shapes, **not this flight's real forecast**. Show the
  loud orange DEMO banner. Honesty rule — never hide this.
- **`corridorSource`** — `"baked"` (real flown track, more accurate) vs
  `"great-circle"` (straight-line estimate). Shown as a small chip.
- **`sigmet`** — official turbulence advisories. `checked` = the service was
  reached; `hits` = how many overlap the route. A zone with `sigmet: true`
  shows an "ACTIVE IN AREA" chip — a credibility signal, present it plainly.
