# Lessons

Protocol: after a correction or non-obvious root cause, add an entry —
Mistake → Root cause → Fix → Rule. The Rule is what matters.

## 2026-06-12 — `npm run build` corrupts a running dev server

- **Mistake:** ran `npm run build` while `next dev` was serving — twice.
  Symptoms differ each time (blank responses, "global-error.js not in React
  Client Manifest", hung selectors), which disguises the common cause.
- **Root cause:** build and dev share `.next/`; the production build clobbers
  the dev server's compilation workspace under it.
- **Fix:** kill the dev server (and `rm -rf .next/dev` if already corrupted)
  before building, restart dev after.
- **Rule:** never run `next build` and `next dev` against the same `.next/`
  concurrently. In verification scripts: build first, then start dev.

## 2026-06-12 — reading URL state in useState initializers breaks hydration

- **Mistake:** `useState(paramsFromUrl)` where the initializer reads
  `window.location` — SSR renders one tree, the client another → hydration
  mismatch (React recovers, but logs errors and re-renders everything).
- **Root cause:** anything render-time that differs between server and first
  client render violates hydration; query params are the classic case.
- **Fix:** read the params in a post-mount `useEffect`, store in state, and
  `key`-remount the child whose `useState` initializers need them.
- **Rule:** in App Router client components, `window`/URL reads belong in
  effects, never in render or state initializers.

## 2026-06-12 — headless Chrome's navigator.share never settles

- **Mistake:** assumed a rejected promise; the share() promise just hangs in
  headless, so catch-based fallbacks silently never run in tests.
- **Fix:** app code treats only `AbortError` as "user dismissed" and falls
  back to clipboard for real failures; tests delete
  `Navigator.prototype.share` to exercise the fallback path.
- **Rule:** test Web Share via the fallback path; never await share() bare in
  headless verification.
