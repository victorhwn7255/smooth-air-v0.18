# Phase 3 — Frontend (Slock design system)

Read `prompts/00-context.md`. Requires Phase 2 (working /api/briefing).

**Design sources of truth, in order of authority:**
1. `references/slock-design-system.md` — read it in full before writing any component
2. `references/slock-theme.json` — exact token values
3. `references/smoothair-slock.html` — a working Slock-styled build of this exact app;
   open it in a browser. Your Next.js UI should read as a refined version of it.

Do not re-style from memory or taste. Slock's defining traits (0px radius, 2px black
borders, hard shadows) look "wrong" to default sensibilities — implementing them
anyway IS the task. The design doc's Do/Don't list is binding.

## Objective
A mobile-first single page: enter flight number → (date auto-targets next departure)
→ grade card, flight ribbon, zone cards, briefing paragraph, route detail table.
Loud yellow chrome, quiet cream content, full Slock compliance.

## Design implementation

### Tailwind
Apply the config mapping from §6 of `slock-design-system.md` verbatim (radius scale,
font families, sizes 12/14/16/18(+24/30), weights 400/700 only, full color table,
`shadow-brutal`, border widths 2/3). Fonts via `next/font/google`: Space Grotesk
(400, 700) and Space Mono (400, 700).

### SmoothAir component → Slock pattern mapping (final, from 00-context)
- **Top chrome:** yellow `#FFD700` header band, 2px black bottom border; wordmark as
  the workspace-name block (black bg, yellow text); tagline uppercase 12px bold.
- **Generate briefing:** cyan create button — 18px bold, compact padding, 2px black
  border, brutal shadow, 50ms hover color swap, stamp-press active
  (`translate(2px,2px)` + shadow removed).
- **Inputs:** white bg, 2px black border, 0px radius, pink focus border.
- **Grade card:** white card + brutal shadow (elevated). Grade headline 30px bold;
  the post-dash clause rendered as a solid highlight block — success green normally,
  warning orange when `grade.warn`. Meta row = chips: confidence (pink), data source
  (teal, or warning when demo), the rest plain white chips in Space Mono.
- **Flight ribbon (signature element):** hard-edged bar, 2px black border, success-
  green base; zone bands solid warning (light) / error (moderate+) with 2px black
  side borders and uppercase severity label; region + "~Xh in" ticks below in Space
  Mono. Must stay legible at 360px — stagger ticks if needed.
- **Zone cards:** thread-card pattern — white, 2px black border, 3px (or 5px) salmon
  left border, hover = brutal shadow + `translate(-2px,-2px)`. Severity chip
  (warning/error bg, per the contrast guardrail in 00-context), rows divided by 2px
  black rules, mechanism as a lavender chip, SIGMET row as a warning chip.
- **Briefing paragraph:** the peach `#FFE5CC` agent-message bubble, 2px black border,
  16px body. Eyebrow "What to tell the cabin" uppercase 12px bold.
- **Route table:** Space Mono 12px, uppercase th with 2px black underline, severity
  indicators as bordered SQUARES (the online dot is the only permitted circle).
- **Demo banner:** warning-orange notice card with 2px black border — loud on purpose.
- **Motion:** nothing over 200ms; hover = instant color swaps; no fades, no rise
  animations, no easing curves. Respect `prefers-reduced-motion` trivially (there is
  almost no motion).

## FlightForm behavior (next-departure default — final UX decision)

1. User types a flight number (normalize "sq 345" → SQ345). On match in flights.json,
   immediately compute the **next departure** via the pipeline's
   `nextDeparture(flight, originTz, Date.now())` and display it as a statement, not a
   form field: **"Next departure: Fri 13 Jun, 11:40 from Zurich"** with a
   "change date" control that reveals a date input (pre-filled with that date).
2. If the entry has `verified: false`, append "— schedule unverified, double-check".
3. Generate is one tap for the default case; the date input is only visible after
   "change date". The chosen date is always echoed back on the grade card's flight
   line.
4. Unknown flight → render the API's human-written 404 message in a notice card +
   show the "enter a route manually" toggle (from/to selects from airports.json +
   local time input).
5. Enter key submits; button shows a working state; API errors render verbatim in
   the notice (they're written for humans).

## Page assembly (`src/app/page.tsx`)
Client component orchestrating fetch → sections render top-down: grade, ribbon,
zones, briefing, route detail (collapsed `<details>` with a Slock-button summary).
Footer: disclaimer (comfort briefing only, not for flight planning; crews see more
and steer around the worst) + attribution "Weather data by Open-Meteo.com (CC BY
4.0) · SIGMETs by aviationweather.gov".

## Definition of done
- `npm run build` clean; `npm test` still green; no new dependencies beyond next/font.
- Side-by-side with `references/smoothair-slock.html`: same visual language — an
  outside reviewer should believe both came from the same design team.
- Spot-check Slock compliance: zero `border-radius` > 0 anywhere except the two
  permitted round elements; no box-shadow with blur; no font-weight 500/600/800;
  no yellow backgrounds inside the content area.
- Works at 360px and 1280px; keyboard-only flow possible end to end; Lighthouse
  accessibility ≥ 95 — and explicitly verify chip text contrast per the guardrail
  in 00-context (black on #E63946 / #FF9F1C at the sizes used).
- Next-departure default verified: entering SQ345 after its origin-local departure
  time targets tomorrow; before it, today.
- Live briefing renders all sections; with network blocked, the warning demo banner
  + demo briefing render.

## Out of scope
Feedback UI, deploy, PWA/notifications, corridor work.
