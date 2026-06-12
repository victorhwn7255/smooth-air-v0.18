# SmoothAir — UI/UX design brief (for the design agent)

You are working on the frontend UI/UX of **SmoothAir**, a turbulence-briefing
web app built for one family. A nervous flyer types a flight number and gets
an honest, plain-language answer to "will it be bumpy?" — where, when, how
likely, and how confident the forecast is. Read this whole brief, then the
three reference files it names, before changing anything.

---

## 1. The product in one paragraph

The user enters a flight number (e.g. SQ345). The app targets the **next
departure** automatically, fetches forecast winds along the actual flight
corridor, and renders: an overall smoothness **grade**, a horizontal
**flight ribbon** showing turbulence zones along the timeline, per-zone
**detail cards**, a **briefing paragraph** written for a nervous passenger,
and a collapsible **route table** for the curious. After landing, a one-tap
feedback row asks "How was it?". The emotional job: replace dread-of-the-
unknown with calm, specific, honest expectations. The audience is family
members on their phones, possibly anxious, possibly older — clarity beats
cleverness every where.

## 2. Tech context

- Next.js 16 (App Router) + Tailwind 4 + TypeScript. No UI libraries, no
  state libraries, **no new runtime dependencies allowed**.
- Frontend files you may edit:
  - `src/app/page.tsx` — page assembly, notices, footer
  - `src/app/globals.css` — Tailwind `@theme` design tokens
  - `src/app/layout.tsx` — fonts/metadata
  - `src/app/error.tsx` — error boundary
  - `src/components/` — FlightForm, GradeCard, FlightRibbon, ZoneCard,
    BriefingProse, RouteTable, FeedbackRow
- Do **not** touch: `src/lib/**` (pipeline/API/data), `src/app/api/**`,
  `prompts/**`, `references/**` (canon — read-only), tests other than to add
  UI tests.
- Run with `npm run dev`; verify with `npm test` and `npm run build`
  (both must stay green).

## 3. The design system is BINDING: Slock

Three read-only reference files are the source of truth, in this order:

1. `references/slock-design-system.md` — rules, component patterns, the
   Do/Don't list (binding)
2. `references/slock-theme.json` — exact token values
3. `references/smoothair-slock.html` — a working Slock build of this exact
   app; open it in a browser. The Next.js app should read as a refined
   version of it.

Non-negotiables you must not "improve away" (they look wrong to default
taste — implementing them anyway IS the job):

- **0px border-radius everywhere.** Only an online-status dot or toggle
  track may ever be round.
- **2px solid black borders** on every interactive surface; 3–5px salmon
  left border on zone cards. No 1px, no gray borders.
- **One shadow**: `2px 2px 0 0 #000` — hard offset, zero blur. No elevation
  system.
- **Fonts**: Space Grotesk (400/700) + Space Mono only. No weight 500/600/800.
- **Loud yellow chrome (#FFD700), quiet cream content (#FFF8E7).** Never
  yellow backgrounds inside the content area.
- **Accent semantics** (one job each): pink = active/selected/focus,
  cyan = create (the Generate button), lavender = tag (mechanism chips),
  salmon = zone-card borders, teal = technical tags ("GFS · Open-Meteo").
- **Severity colors**: success `#2DC653` smooth, warning `#FF9F1C` light,
  error `#E63946` moderate/severe. Black text on all chips (verified:
  10.2:1 and 5.0:1 contrast — passes WCAG AA).
- **Motion**: nothing over 200ms, instant 50ms hover color swaps, stamp-press
  active state (`translate(2px,2px)` + shadow removed). No fades, no rises,
  no easing curves.
- **WCAG AA contrast is the only thing that outranks the style guide.**

## 4. Every screen state the UI must handle (the full picture)

**Input states**
1. Default: flight input pre-filled SQ345, Generate button (cyan), hint line
   "Knows: SQ345, SQ346, SQ660 + 1058 observed Changi flights · enter a
   route manually".
2. Known flight typed → a statement (not a form field): **"Next departure:
   Fri 13 Jun, 11:40 from Zurich"** + a "change date" ghost link that
   reveals a date input. One tap to generate is the core flow.
3. Unverified schedule (most of the 1,058 generated flights) → appended
   warning: "— departs 23:45, still right? schedule unverified".
4. Unknown flight → API's human-written 404 renders in a notice card AND
   the manual route form auto-opens (From/To selects over 151 airports,
   local time input, date input).
5. Working state: button disabled, "Working…" (~2s typically).

**Result states**
6. Grade card (white, elevated/brutal shadow): mono flight line
   (`SQ345 · ZRH → SIN · 777-300ER · 10,305 km · 12.7 h · FRI 13 JUN 11:40`),
   30px bold grade headline with the post-dash clause in a solid highlight
   block (success green; warning orange when `grade.warn`), then a chip row:
   confidence (pink), "departs in Xh" (mono), data source (teal, or warning
   when demo), SIGMETs status (mono), "route: baked tracks|great circle"
   (mono), "updates every 6 h" (mono).
7. Flight ribbon (the signature element): green bar with hard-edged
   warning/error zone bands (2px black side borders, uppercase labels —
   labels hidden on bands <10% wide), TAKEOFF/LANDING end labels, region +
   "~Xh in" ticks below, staggered into two rows to avoid collisions.
   Must stay legible at 360px with up to ~7 zones.
8. Zone cards, 2-col grid (1-col <640px): region name + severity chip,
   "about 2½ hours in · ~45 min" mono line, probability rows ("noticeable
   bumps — roughly 1-in-3 (34%)", "moderate or worse — 4%"), mechanism chip
   (lavender: "jet-stream shear" / "thunderstorms"), optional SIGMET row
   (warning chip "ACTIVE IN AREA"), and a 1–2 sentence reassurance
   explanation.
9. Briefing prose: peach `#FFE5CC` agent-bubble, eyebrow "WHAT TO TELL THE
   CABIN", 16px body, 2–5 sentences.
10. Route table: collapsed `<details>` with Slock-button summary; mono 12px
    table (region / time / shear / jet / CAPE / index / severity SQUARE —
    squares, never circles).
11. Feedback row (only when departure time has passed): "HOW WAS IT?" +
    four tap targets (Smooth / Light bumps / Bumpy / Rough) → thank-you
    state. One tap, no account, nothing else collected.

**Failure states (loud on purpose — honesty is a feature)**
12. Demo banner: warning-orange notice "Live weather unavailable — showing
    DEMO DATA…" whenever upstream weather fails.
13. Error notice: error-red card rendering API messages verbatim (they're
    written for humans, e.g. "More than 5 days out — forecasts that far
    ahead aren't worth reading. Check back closer to departure.").
14. Error boundary (`error.tsx`): calm "Something broke — the app, not your
    flight" + Try again button.
15. Footer (always): disclaimer ("Comfort briefing only — not for flight
    planning…") + attribution (Open-Meteo CC BY 4.0, aviationweather.gov).

## 5. Data the UI consumes (shape, not plumbing)

`Briefing` payload: flightNo, from/to + cities, aircraft (may be "" →
fallback "widebody/narrowbody assumed"), distanceKm, durationMin, depUtcMs,
depLocalDate/Time, zones[] (region, cls: smooth|light|moderate|severe, mech:
"jet shear"|"convection", startH/endH, pLight/pMod 0–1, sigmet?), waypoints[]
+ scores[] (route table), grade {label, warn, sub}, confidence {tier:
high|medium|low, hrs}, briefing (string), demo, dataSource, corridorSource,
sigmet {checked, hits}, generatedAt.

## 6. Honesty principles as UX requirements (binding)

- Grades and probability **bands** in prose ("roughly 1-in-3"), never bare
  decimals; percentages may appear only as secondary detail.
- Confidence labels always visible; failures loud and clearly labeled;
  nothing may look more certain than it is.
- The disclaimer must remain visible without interaction.

## 7. Known UX debts — good starting points

1. Ribbon tick labels still crowd with 6–7 zones at 360px despite stagger.
2. Some zone regions render as "open water" (region-name gaps) — design a
   graceful presentation for unnamed stretches.
3. The grade-card flight line gets long and wraps awkwardly on mobile.
4. Manual mode is hidden behind a small ghost link until a 404 reveals it.
5. The "change date" reveal and unverified-schedule warning compete for
   attention in one paragraph.
6. No skeleton/empty state during the ~2s generate (button text only).
7. The route table is unstyled-scrollbar overflow-x on mobile.

## 8. Rules of engagement

- Work **within** Slock. If you believe a change requires breaking a Slock
  rule, stop and surface it as a question to the owner instead of doing it
  — accessibility (AA) is the only sanctioned override.
- Ambiguity → choose the simplest option and leave a `// DECISION:` comment.
- No new dependencies (next/font is already in). No yellow in content. No
  border-radius. Match existing code style; surgical diffs.
- Before declaring done, RUN (not reason about):
  - `npm test` and `npm run build` — green
  - `grep -rn "rounded" src/` → nothing (except a permitted round element)
  - `grep -rnE "blur|gradient|backdrop" src/` → nothing
  - `grep -rnE "font-medium|font-semibold|font-extrabold" src/` → nothing
  - Lighthouse accessibility ≥ 95 on the briefing view
  - 360px and 1280px screenshots compared side-by-side with
    `references/smoothair-slock.html` — same visual language
- Commit small, descriptive; never push; never modify `prompts/` or
  `references/`.
