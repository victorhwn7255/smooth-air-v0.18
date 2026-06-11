# Release checklist — v0.1.0 MVP

Executed 2026-06-11 by the build agent; unchecked items are NEEDS-HUMAN.

- [x] All tests green (40/40 across 8 files); `npm run build` clean
- [ ] **NEEDS-HUMAN** — SQ345 + SQ346 schedules verified against Singapore
      Airlines within the last week. SQ346 currently carries
      `"verified": false` (the form shows "departs 23:45, still right?").
      After checking, flip the flag in `src/lib/data/flights.json`.
- [ ] **NEEDS-HUMAN** — Live briefing sanity-checked against turbli.com for
      2 flights on deploy day (the site 403s automated clients; transcription
      table waiting in `references/calibration-log.md`).
- [ ] **NEEDS-HUMAN** — Demo fallback verified in production: open the
      deployed URL, block network to api.open-meteo.com in devtools, generate
      → loud orange DEMO DATA banner. (Verified locally on 2026-06-11 via
      mocked fetch + UI test; production needs the deploy first.)
- [ ] **NEEDS-HUMAN** — Mobile pass on a real phone: 360 px layout, tap
      targets, ribbon legibility. (Verified at 360 px in headless Chrome —
      no horizontal overflow, staggered ticks; real-device feel needs hands.)
- [x] Disclaimer + attribution visible in footer (asserted in UI tests)
- [x] Calibration log up to date (4 runs, 2 retunes); feedback loop tested
      end-to-end 2026-06-11 (UI tap → POST → file store → export)

## Deploy steps (NEEDS-HUMAN — requires Vercel login)

```bash
npm i -g vercel          # CLI not installed on this machine
vercel login
vercel deploy --prod     # project name: smooth-air
```

Then:
1. (Optional, for feedback on Vercel) create a free Upstash Redis database
   and set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel
   project settings; also set `FEEDBACK_EXPORT_KEY` to any private string.
   Without Upstash, feedback shows a friendly "not set up" notice — no 500s.
2. Confirm production fetch-cache: request the same briefing twice within a
   minute — the second must return noticeably faster (~50–100 ms vs ~2 s).
3. Paste the production URL into README.md ("Production URL" line) and
   tick the remaining boxes above.
