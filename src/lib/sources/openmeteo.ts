import type { Waypoint, WeatherSample } from "@/lib/types";
import { nearestHourIndex } from "@/lib/pipeline/timing";

/** Thrown on any HTTP/network failure — the route decides fallback policy. */
export class WeatherUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherUnavailableError";
  }
}

const OM_VARS = [
  "wind_speed_250hPa",
  "wind_direction_250hPa",
  "wind_speed_300hPa",
  "wind_direction_300hPa",
  "wind_speed_200hPa",
  "wind_direction_200hPa",
  "geopotential_height_250hPa",
  "geopotential_height_300hPa",
  "cape",
  "precipitation_probability",
].join(",");

const CHUNK = 25; // Open-Meteo allows ≤25 comma-separated coordinates/request

interface OmLocation {
  hourly: Record<string, (number | null)[]> & { time: number[] };
}

/**
 * Fetch GFS samples from Open-Meteo for every waypoint, matched to the
 * nearest hourly timestamp. Sequential ≤25-coordinate batches; responses are
 * cached by Next's data cache for one 6h GFS cycle.
 */
export async function fetchWeather(
  wps: Waypoint[],
  depUtcMs: number,
  arrUtcMs: number,
): Promise<WeatherSample[]> {
  const d0 = new Date(depUtcMs - 36e5).toISOString().slice(0, 10);
  const d1 = new Date(arrUtcMs + 72e5).toISOString().slice(0, 10);
  const out = new Array<WeatherSample>(wps.length);
  for (let i = 0; i < wps.length; i += CHUNK) {
    const part = wps.slice(i, i + CHUNK);
    const url =
      "https://api.open-meteo.com/v1/gfs" +
      "?latitude=" +
      part.map((w) => w.lat).join(",") +
      "&longitude=" +
      part.map((w) => w.lon).join(",") +
      "&hourly=" +
      OM_VARS +
      "&wind_speed_unit=kn&timeformat=unixtime&timezone=GMT" +
      `&start_date=${d0}&end_date=${d1}`;
    let json: unknown;
    try {
      const r = await fetch(url, { next: { revalidate: 21600 } });
      if (!r.ok) throw new Error("Open-Meteo HTTP " + r.status);
      json = await r.json();
    } catch (e) {
      throw new WeatherUnavailableError(
        e instanceof Error ? e.message : String(e),
      );
    }
    const locs = (Array.isArray(json) ? json : [json]) as OmLocation[];
    locs.forEach((loc, k) => {
      const w = wps[i + k];
      const bi = nearestHourIndex(loc.hourly.time, w.utcMs / 1000);
      const g = (v: string): number | null => {
        const arr = loc.hourly[v];
        const x = arr ? arr[bi] : null;
        return x == null ? null : x;
      };
      out[i + k] = {
        ws250: g("wind_speed_250hPa"),
        wd250: g("wind_direction_250hPa"),
        ws300: g("wind_speed_300hPa"),
        wd300: g("wind_direction_300hPa"),
        ws200: g("wind_speed_200hPa"),
        wd200: g("wind_direction_200hPa"),
        gh250: g("geopotential_height_250hPa"),
        gh300: g("geopotential_height_300hPa"),
        cape: g("cape"),
        pprob: g("precipitation_probability"),
      };
    });
  }
  return out;
}
