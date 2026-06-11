import type { FlightEntry } from "@/lib/types";

/**
 * Local wall-clock time + IANA tz → UTC epoch ms (handles DST via Intl,
 * iterative technique from v1).
 */
export function utcFromLocal(
  dateStr: string,
  timeStr: string,
  tz: string,
): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 3; i++) {
    const g = wallClockParts(guess, tz);
    const asLocal = Date.UTC(g.y, g.m - 1, g.d, g.hh, g.mm);
    const want = Date.UTC(y, m - 1, d, hh, mm);
    if (asLocal === want) break;
    guess += want - asLocal;
  }
  return guess;
}

/** Index of the hourly timestamp (unix seconds) nearest to targetSec. */
export function nearestHourIndex(times: number[], targetSec: number): number {
  let bi = 0,
    bd = Infinity;
  for (let q = 0; q < times.length; q++) {
    const dd = Math.abs(times[q] - targetSec);
    if (dd < bd) {
      bd = dd;
      bi = q;
    }
  }
  return bi;
}

/** Wall-clock fields of a UTC instant in a given IANA timezone. */
function wallClockParts(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const g: Record<string, string> = {};
  parts.forEach((x) => (g[x.type] = x.value));
  return { y: +g.year, m: +g.month, d: +g.day, hh: +g.hour % 24, mm: +g.minute };
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a calendar date. */
function isoWeekday(y: number, m: number, d: number): number {
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

function addDays(y: number, m: number, d: number, days: number) {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * ISO date (yyyy-mm-dd, origin-local) of the flight's next valid departure:
 * today at the origin if the departure time hasn't passed in origin-local
 * time, otherwise the next day whose ISO weekday is in operatingDays.
 * Pure — `nowMs` is a parameter.
 */
export function nextDeparture(
  flight: FlightEntry,
  originTz: string,
  nowMs: number,
): string {
  const days = flight.operatingDays ?? [1, 2, 3, 4, 5, 6, 7];
  const now = wallClockParts(nowMs, originTz);
  const [dh, dm] = flight.depLocal.split(":").map(Number);
  // DECISION: at exactly the departure minute the flight is treated as departed
  // (can't realistically still board), so we roll to the next operating day.
  const passedToday = now.hh * 60 + now.mm >= dh * 60 + dm;
  const start = passedToday ? 1 : 0;
  for (let i = start; i <= start + 7; i++) {
    const c = addDays(now.y, now.m, now.d, i);
    if (days.includes(isoWeekday(c.y, c.m, c.d)))
      return `${c.y}-${pad(c.m)}-${pad(c.d)}`;
  }
  // unreachable when operatingDays contains at least one valid weekday;
  // fall back to the first candidate day
  const c = addDays(now.y, now.m, now.d, start);
  return `${c.y}-${pad(c.m)}-${pad(c.d)}`;
}
