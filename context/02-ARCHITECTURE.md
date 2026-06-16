# 02 — Architecture: the build contract

**Snapshot: 2026-06-15.**

## The shape of the iOS app

- **React Native via Expo** (managed workflow). UI built with native components
  (`View`/`Text`/`Pressable`), not HTML/CSS.
- **Styling: NativeWind** (Tailwind-for-RN) so the Slock design tokens carry
  over close to 1:1 from the web app.
- **The backend is the already-deployed web app.** The iOS app makes HTTPS
  calls to the existing API (`/api/briefing`, `/api/feedback`). There is **no
  server, no pipeline, and no data to rebuild on the device.** (CORS is not a
  concern — it's a browser rule; native apps aren't bound by it.)
- **Only the UI is rebuilt.** All the brains — turbulence scoring, zones,
  grades, the flight database, narrative text — already run server-side and
  arrive in the API response.

## What you reuse vs. rebuild

| Reuse (do NOT rebuild) | Rebuild (native UI) |
|---|---|
| The deployed API (briefing + feedback) | Every screen/component in RN primitives |
| The `Briefing` data shape (copy `types.ts`) | Navigation, safe areas, touch states |
| All copy, grades, zones, confidence logic | The flight ribbon (→ `react-native-svg`) |
| The Slock design language & tokens | The route table (no `<details>` — use a disclosure) |
| Product decisions (see `07-DECISIONS.md`) | Share (→ native share sheet), deep links |

## Folder layout (two separate projects)

```
~/Downloads/Code/
├── smooth-air/        ← the web app + this context pack (source of truth)
└── smooth-air-ios/    ← the Expo app you are building
```
They share only: the copied `Briefing` types, the API URL, and this pack
(copied in, or referenced from `../smooth-air/context/`).

## Data flow (the whole app, essentially)

1. User enters a flight number (or taps a featured flight, or opens a deep link).
2. App calls `GET {BASE_URL}/api/briefing?flight=SQ345` (optionally `&date=…`).
3. API returns a `Briefing` JSON (see `03-API-CONTRACT.md`).
4. App renders the screens from that single object.
5. After a flown flight, app `POST`s one-tap feedback to `/api/feedback`.

That's it. The app is a **native, honest renderer over an existing API** — a
thin, beautiful client. Keep it that way; resist re-implementing pipeline logic
on the device.

## First milestone suggestion

Landing screen (headline + flight input + featured-flight chips) →
`fetch(/api/briefing)` → a minimal grade card. Prove the round-trip to the live
API in Expo Go on a real phone before building the richer components.
