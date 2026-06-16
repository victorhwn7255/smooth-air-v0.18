# 03 — API contract (build the fetch layer from this)

**Snapshot: 2026-06-15.** This doc is self-contained on purpose — you should be
able to write the entire data layer from it alone. If a field ever disagrees
with the live response, the live API wins; report the drift.

## Base URL

```
{{DEPLOYED_BASE_URL}}        ← replace with the deployed Vercel URL, e.g. https://smooth-air-xxxx.vercel.app
```
All endpoints below are relative to this. Native apps are not subject to CORS.

---

## GET /api/briefing — the core call

Returns a full `Briefing` for a flight on a date.

**Query params (two modes):**

*Known-flight mode:*
- `flight` (required) — e.g. `SQ345`. Case/space-insensitive ("sq 345" works).
- `date` (optional) — `YYYY-MM-DD`. **Omit it** to target the next valid
  departure automatically (the normal case).

*Manual-route mode* (for routes with no flight number):
- `from`, `to` (required) — IATA codes, e.g. `ZRH`, `SIN`.
- `time` (required) — origin-local `HH:MM`, e.g. `11:40`.
- `date` (optional) — as above.

Examples:
```
GET /api/briefing?flight=SQ345
GET /api/briefing?flight=BA11&date=2026-06-20
GET /api/briefing?from=ZRH&to=SIN&time=11:40
```

**200 response — the `Briefing` object:**

```ts
interface Briefing {
  flightNo: string;          // "" in manual mode
  from: string; to: string;  // IATA codes
  fromCity: string; toCity: string;
  aircraft: string | null;   // null/"" → UI shows "widebody assumed"
  widebody: boolean;
  distanceKm: number;
  durationMin: number;
  depUtcMs: number;          // departure, UTC epoch ms
  depLocalDate: string;      // "YYYY-MM-DD", origin-local
  depLocalTime: string;      // "HH:MM", origin-local
  zones: Zone[];             // turbulence zones along the route (0..n)
  waypoints: Waypoint[];     // for the route table
  scores: SegmentScore[];    // parallel to waypoints
  grade: { label: string; warn: boolean; sub: string };
  confidence: { tier: "high" | "medium" | "low"; hrs: number };
  briefing: string;          // the plain-language paragraph
  demo: boolean;             // true → live weather unavailable, demo data shown
  dataSource: "gfs-openmeteo" | "demo";
  corridorSource: "baked" | "great-circle";
  sigmet: { checked: boolean; hits: number };
  generatedAt: number;       // UTC epoch ms
}

interface Zone {
  i0: number; i1: number;    // waypoint index span
  peak: number;              // peak severity 0–1
  mech: "jet shear" | "convection";
  region: string;            // e.g. "the Black Sea"; may be "open water"
  startH: number; endH: number;   // elapsed hours from departure
  cls: "smooth" | "light" | "moderate" | "severe";
  pLight: number;            // P(light-or-worse), 0–1
  pMod: number;              // P(moderate-or-worse), 0–1
  sigmet?: boolean;          // official advisory overlaps this zone
}

interface Waypoint {
  lat: number; lon: number;
  f: number;                 // fraction along route 0–1
  elapsedH: number; utcMs: number;
  region: string;
  altFt?: number;            // only on baked corridors
}

interface SegmentScore {
  S: number; Scat: number; Sconv: number;  // severity + components, 0–1
  vws: number;               // vertical wind shear, s^-1
  jet: number;               // 250 hPa wind, kt
  cape: number;              // J/kg
  missing: boolean;          // weather sample missing
}
```

**Notes for rendering:**
- `zones` may be empty (a smooth flight) — handle the zero case.
- Number the zones 1..n at render; the same numbers tie the ribbon to the zone
  cards (web convention).
- A `region` of `"open water"` gets special copy (see `07-DECISIONS.md`).
- Probabilities are 0–1 — present as bands in prose, % only as secondary (see
  `04-DOMAIN.md`).

**Error responses** (JSON `{ "error": string }`, messages are human-written —
show them verbatim):
- **404** — unknown flight: *"Don't know XX999 yet … or enter the route
  manually."* → open manual-route entry as the fallback.
- **400** — bad input: unknown airport code · origin == destination · manual
  mode missing a time · malformed date · no params at all.
- **422** — too far out: *"More than 5 days out — forecasts that far ahead
  aren't worth reading. Check back closer to departure."*
- **429** — rate limit: *"Easy there — more than 30 briefings in an hour…"*
  (per-IP, 30/hour).

---

## POST /api/feedback — one-tap post-flight feedback

Body (JSON):
```ts
{ flight: string; date: string;            // "YYYY-MM-DD"
  briefingGrade: string;                   // the grade label that was shown
  actual: "smooth" | "light" | "bumpy" | "rough";
  comment?: string }                       // optional, ≤280 chars
```
- **200** `{ ok: true }`.
- **400** on validation failure (bad `actual`, bad date, long comment).
- **503** *"Feedback isn't set up on this deployment yet."* — when the server
  has no storage configured. Handle gracefully; never treat as a crash.

Only show the feedback prompt **after the departure time has passed**.

## GET /api/health
Returns `{ name, version, uptimeSec }`. Handy for a connectivity check.
