# SmoothAir ✈️

**Type a flight number, get an honest answer to "will it be bumpy?"** SmoothAir
is a turbulence briefing for nervous flyers, built for one family. It looks at
the same forecast winds the pros use, finds the stretches of your flight that
might get bumpy, and explains them in plain language — including how confident
it is, and what it can't know. It is **not** a flight-planning tool and it
never pretends to certainty the forecast doesn't have.

> Production URL: _not yet deployed — see Deployment below._

## The honesty principles

- **Grades, not fake-precise scores.** "Mostly smooth — one bumpy stretch", not "73.4".
- **Probability bands, not bare decimals.** "Roughly 1-in-3", not "0.34".
- **Confidence labels everywhere** — driven by forecast lead time, lower for
  thunderstorm-dependent forecasts more than a day out; refuses entirely
  beyond 5 days.
- **Failures are loud.** If live weather is unreachable you get a clearly
  flagged demo, never silently stale data.
- The disclaimer is real: crews see far more than this app and steer around
  the worst of it.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest suite
npm run build      # production build
```

No API keys. Weather comes from Open-Meteo's free GFS endpoint, advisories
from aviationweather.gov.

## Add a flight

Edit `src/lib/data/flights.json`:

```json
"SQ26": {
  "from": "SIN", "to": "FRA",
  "depLocal": "23:55",
  "durationMin": 805,
  "aircraft": "A380-800",
  "widebody": true,
  "operatingDays": [1, 2, 3, 4, 5, 6, 7],
  "verified": false
}
```

`depLocal` is origin-airport local time; `operatingDays` are ISO weekdays
(1 = Monday). Set `verified: true` only after checking the airline's current
schedule. Airports must exist in `airports.json` (code, lat, lon, city, IANA tz).

## Re-bake corridors (optional accuracy upgrade)

Baked corridors replace the great-circle guess with the route actually flown
(including altitude, which selects the right shear layers):

```bash
npx tsx tools/corridor-baker/bake.ts --flight SQ345
```

Anonymous OpenSky data only reaches back ~a day, so each run caches raw
tracks in `tools/corridor-baker/input/` — run it across several days and the
bake medians over everything cached. You can also drop track files there
yourself (OpenSky-style JSON, or CSV `time,lat,lon,altft`).

## Run the backtest

```bash
npx tsx tools/validation/backtest.ts --json
```

Replays the production pipeline against archived forecasts for documented
turbulence incidents and known-smooth control flights. Results and every
constant change live in `references/calibration-log.md` — read it before
touching `src/lib/data/config.ts`.

## Deployment

Target is Vercel free tier:

```bash
vercel deploy --prod   # project name: smooth-air
```

Post-flight feedback needs storage. On Vercel set the two Upstash Redis env
vars from `.env.example` (the project's single permitted credential);
without them feedback degrades to a friendly "not set up on this deployment"
notice. On any persistent Node host it just writes a local JSON file.
`GET /api/feedback/export?key=…` (set `FEEDBACK_EXPORT_KEY`) returns the
collected ground truth for future recalibration.

## Attribution & disclaimer

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0) ·
SIGMETs by [aviationweather.gov](https://aviationweather.gov/) ·
historical tracks via the [OpenSky Network](https://opensky-network.org/).

Comfort briefing only — not for flight planning or operational use. Forecast
skill for turbulence is limited by nature; treat this like a rain forecast,
not a promise.
