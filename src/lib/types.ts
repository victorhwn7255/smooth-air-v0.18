/** Single source of truth for shared types (see prompts/00-context.md). */

export interface Airport {
  code: string;
  lat: number;
  lon: number;
  city: string;
  /** IANA timezone, e.g. "Europe/Zurich" */
  tz: string;
}

export interface FlightEntry {
  from: string;
  to: string;
  /** departure time in origin-airport local time, "HH:MM" */
  depLocal: string;
  durationMin: number;
  aircraft: string;
  widebody: boolean;
  /** ISO weekday numbers 1 (Mon) – 7 (Sun); omitted = daily */
  operatingDays?: number[];
  /** schedule data confirmed by a human */
  verified: boolean;
}

export interface Waypoint {
  lat: number;
  lon: number;
  /** fraction along the route, 0–1 */
  f: number;
  /** hours since departure */
  elapsedH: number;
  /** UTC epoch ms the aircraft is at this point */
  utcMs: number;
  region: string;
}

/** One weather sample matched to a waypoint. All fields nullable (missing data). */
export interface WeatherSample {
  /** wind speed at 250 hPa, knots */
  ws250: number | null;
  /** wind direction at 250 hPa, degrees meteorological */
  wd250: number | null;
  ws300: number | null;
  wd300: number | null;
  ws200: number | null;
  wd200: number | null;
  /** geopotential height at 250 hPa, m */
  gh250: number | null;
  gh300: number | null;
  /** J/kg */
  cape: number | null;
  /** precipitation probability, % */
  pprob: number | null;
}

export interface SegmentScore {
  /** overall severity index 0–1 */
  S: number;
  /** clear-air (jet shear) component */
  Scat: number;
  /** convective component */
  Sconv: number;
  /** vertical wind shear, s^-1 */
  vws: number;
  /** 250 hPa wind, kt */
  jet: number;
  /** J/kg */
  cape: number;
  missing: boolean;
}

export type SeverityClass = "smooth" | "light" | "moderate" | "severe";

export type Mechanism = "jet shear" | "convection";

export interface Zone {
  /** index of first flagged waypoint */
  i0: number;
  /** index of last flagged waypoint */
  i1: number;
  /** peak severity index in the zone */
  peak: number;
  mech: Mechanism;
  /** majority region name */
  region: string;
  /** elapsed hours at zone start/end */
  startH: number;
  endH: number;
  cls: SeverityClass;
  /** probability of light-or-worse bumps */
  pLight: number;
  /** probability of moderate-or-worse */
  pMod: number;
  /** an official SIGMET overlaps this zone */
  sigmet?: boolean;
}

export interface ConfidenceTier {
  tier: "high" | "medium" | "low";
  /** hours until departure at generation time */
  hrs: number;
}

export interface Grade {
  label: string;
  warn: boolean;
  sub: string;
}

export interface SigmetStatus {
  checked: boolean;
  hits: number;
}

/** Full API payload returned by /api/briefing. */
export interface Briefing {
  flightNo: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  aircraft: string | null;
  widebody: boolean;
  distanceKm: number;
  durationMin: number;
  /** departure, UTC epoch ms */
  depUtcMs: number;
  /** departure date in origin-local time, yyyy-mm-dd */
  depLocalDate: string;
  /** departure time in origin-local time, HH:MM */
  depLocalTime: string;
  zones: Zone[];
  /** waypoints + per-waypoint scores for the route table */
  waypoints: Waypoint[];
  scores: SegmentScore[];
  grade: Grade;
  confidence: ConfidenceTier;
  /** plain-language briefing paragraph */
  briefing: string;
  /** true when demo data was used instead of live weather */
  demo: boolean;
  sigmet: SigmetStatus;
  /** UTC epoch ms when this briefing was generated */
  generatedAt: number;
}
