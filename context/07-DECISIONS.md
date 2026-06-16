# 07 — Locked product decisions (don't relitigate)

**Snapshot: 2026-06-15.** These were decided during the web build. Carry them
into iOS unless the owner changes them. They explain *why* the app behaves as
it does.

## Flight input & schedule

- **Next-departure default.** Entering a flight number with no date targets the
  next valid departure automatically — origin-local, today if the time hasn't
  passed, else the next operating day. One-tap is the core flow.
- **Schedule honesty.** The flight database is ~1,061 flights (3 hand-curated +
  ~1,058 built from the observed Changi schedule, both directions). Most are
  `verified: false` → the UI shows a **"SCHEDULE UNVERIFIED — still right?"**
  line with a single "confirm or change date" affordance. Keep this safety cue.
- **Manual route mode.** For routes with no flight number: From / To / local
  time / date over the ~151 known airports. The unknown-flight **404
  auto-opens** manual mode as the fallback.
- **Coverage is a Changi snapshot**, not global — honest framing only ("flights
  in and out of Singapore Changi"); never imply global coverage or search
  tracking (the app keeps **no search logs**).

## Landing

- **Headline:** "Will my flight be bumpy?"
- **Generate button:** **"Smooth or Bumpy?"** (busy state: "Checking…").
- **Featured flights** (hand-picked, labeled "POPULAR FLIGHTS:", not
  schedule-ranked): **SQ22 SIN→EWR** (world's-longest), **SQ874 SIN→HKG**,
  **SQ345 ZRH→SIN** (the family flagship — note it *arrives* at Changi, which is
  why the label isn't "from Changi"). Tapping a chip fills the input + generates.

## Sharing & links

- **Shareable deep links.** A generated briefing writes `?flight=…&date=…` (or
  `?from=&to=&time=&date=`) to the URL; opening such a link auto-generates. On
  iOS this becomes **universal links / deep links** + the **native share sheet**
  (web used `navigator.share` on touch, copy-to-clipboard on desktop). The share
  payload carries the verdict in the title so it reads in the chat bubble.

## Brand & chrome

- **Passport-stamp badge** logo (yellow square, "SMOOTH / AIR", plane icon,
  mono "01°N 104°E"). Tapping the logo resets to the landing screen.
- **Stacked tagline:** "TURBULENCE / BRIEFING" (no "family edition").
- **Changi outlook strip** — a 24-cell colored bar of the next-24h forecast over
  Changi, with a plain-language one-liner ("light chop much of the day"). On
  web it's in the header and **hidden below 640px — so it has NO mobile home
  yet.** On iOS: give it a place, and **strongly consider a home-screen
  widget** — it's a near-perfect fit. (Flagged in the iOS design brief.)

## Footer (always reachable)

The comfort-only disclaimer + attribution (Open-Meteo CC BY 4.0 — linked;
aviationweather.gov — linked), centered. No version/credits line.

## Out of scope (decided "later", don't build unprompted)

Push notifications (the "re-check before departure" reminder is the prime
future feature), accounts, a geographic map view (collides with the
no-new-dependencies / flat-aesthetic rules), GEFS/ECMWF model upgrades.
