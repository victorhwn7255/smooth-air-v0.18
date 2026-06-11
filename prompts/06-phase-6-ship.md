# Phase 6 — Ship: deploy + feedback loop + hardening

Read `prompts/00-context.md`. Requires Phases 1–3 (4–5 strongly recommended first —
don't ship unvalidated numbers to the family).

## Objective
A deployed URL the family can open on their phones, a one-tap post-flight feedback
loop that builds the ground-truth dataset, and final hardening. This completes the MVP.

## Tasks

### 1. Feedback endpoint + UI
- `POST /api/feedback` body: `{flight, date, briefingGrade, actual:
  'smooth'|'light'|'bumpy'|'rough', comment?}` (comment ≤ 280 chars).
- **Storage abstraction** `src/lib/sources/feedbackStore.ts` with two drivers:
  (a) local JSON file `data/feedback.json` (works in dev and on any persistent
  Node host); (b) Upstash Redis via REST if `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN` env vars exist (required on Vercel — serverless has no
  persistent disk). Driver chosen by env presence; both append-only.
  This is the project's single permitted credential; document it in `.env.example`.
- UI: after a briefing whose departure time is in the past, show a quiet
  "How was it?" row with four tap targets; thank-you state after submit; no
  account, no tracking, nothing else collected.
- `GET /api/feedback/export` returns the raw array (this feeds future
  recalibration); no auth needed at family scale but add a static
  `?key=` check using an env var to keep crawlers out.

### 2. Hardening pass
- Input validation on all API params (zod-free — hand-rolled guards are fine).
- Per-IP soft rate limit on /api/briefing (in-memory token bucket, 30/hour —
  protects the Open-Meteo free tier from a leaked URL).
- Timeouts on all upstream fetches (10 s weather, 5 s SIGMET) with AbortController.
- A `/api/health` returning version + uptime.
- Error boundary on the page; the failure state must still look calm and tell the
  user what to do ("try again in a minute" / "open the demo").
- Verify the >120h refusal, the demo banner, and the stale-schedule prompt
  ("departs 11:40 — still right?") all render correctly.

### 3. Deploy
- Target: Vercel free tier (`vercel deploy`), project name smooth-air. Set the two
  Upstash env vars if feedback-on-Vercel is wanted at launch; otherwise feedback
  degrades to a friendly "feedback isn't set up on this deployment yet" notice —
  never a 500.
- Confirm fetch-cache behavior in production (second identical briefing within 6h
  must be fast).
- Add the production URL to README.

### 4. README.md (rewrite for the finished app)
What it is, the honesty principles (one short section), how to run locally, how to
add a flight to flights.json, how to re-bake corridors, how to run the backtest,
deployment notes, attribution (Open-Meteo CC BY 4.0, aviationweather.gov), and the
disclaimer. A non-developer family member should be able to read the first
paragraph and understand what the app does and doesn't promise.

### 5. Release checklist (execute, then commit as `references/release-checklist.md`)
- [ ] All tests green; build clean
- [ ] SQ345 + SQ346 schedules verified against the airline within the last week;
      `verified: true` set accordingly
- [ ] Live briefing sanity-checked against Turbli for 2 flights on deploy day
- [ ] Demo fallback verified in production (block network in devtools)
- [ ] Mobile pass on a real phone: 360 px layout, tap targets, ribbon legibility
- [ ] Disclaimer + attribution visible in footer
- [ ] Calibration log up to date; feedback loop tested end-to-end

## Definition of done
The MVP definition from the project plan: a family member types a flight number on
their phone and gets a calibrated, corridor-accurate (where baked), honestly
confidence-labeled briefing at a stable URL — and after they land, one tap records
whether reality matched.

## Out of scope (v1.1 backlog — do not start)
GEFS ensemble probabilities, ECMWF cross-check, Telegram notifications, iOS app,
Richardson/Ellrod index upgrades.
