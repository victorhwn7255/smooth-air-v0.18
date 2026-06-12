"use client";

import { useState } from "react";
import {
  AIRPORTS,
  CURATED_FLIGHT_NOS,
  FLIGHTS,
  GENERATED_FLIGHT_COUNT,
} from "@/lib/data/flightDb";
import { nextDeparture } from "@/lib/pipeline/timing";
import type { FlightEntry } from "@/lib/types";

export interface GenerateParams {
  flight?: string;
  from?: string;
  to?: string;
  time?: string;
  date: string;
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso + "T12:00:00Z"));

const labelCls =
  "flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.08em]";
const inputCls =
  "w-full border-2 border-black bg-white px-2.5 py-2 text-sm font-normal focus:border-pink focus:outline-none focus-visible:outline-2 focus-visible:outline-pink";
const ghostCls =
  "cursor-pointer whitespace-nowrap px-0.5 font-bold underline transition-colors duration-50 hover:bg-pink";

export default function FlightForm({
  busy,
  manual,
  initial,
  onToggleManual,
  onGenerate,
}: {
  busy: boolean;
  manual: boolean;
  /** shared-link params — prefill the form so it mirrors the briefing */
  initial?: GenerateParams | null;
  onToggleManual: () => void;
  onGenerate: (p: GenerateParams) => void;
}) {
  const [raw, setRaw] = useState(initial?.flight ?? "SQ345");
  const [dateOpen, setDateOpen] = useState(false);
  const [dateOverride, setDateOverride] = useState(
    initial?.flight ? (initial.date ?? "") : "",
  );
  const [mFrom, setMFrom] = useState(initial?.from ?? "SIN");
  const [mTo, setMTo] = useState(initial?.to ?? "ZRH");
  const [mTime, setMTime] = useState(initial?.time ?? "11:40");
  const [mDate, setMDate] = useState(initial?.from ? (initial.date ?? "") : "");

  const fno = raw.replace(/\s+/g, "").toUpperCase();
  const flight = FLIGHTS[fno];
  const nextDep = flight
    ? nextDeparture(flight, AIRPORTS[flight.from].tz, Date.now())
    : null;
  const date = dateOverride || nextDep || "";

  // DECISION: the manual date input defaults to the next plausible departure
  // for the chosen local time (treated as a daily flight), same rule as flights.
  const mPseudo: FlightEntry = {
    from: mFrom,
    to: mTo,
    depLocal: mTime,
    durationMin: 0,
    aircraft: "",
    widebody: true,
    verified: false,
  };
  const mDefaultDate = nextDeparture(mPseudo, AIRPORTS[mFrom].tz, Date.now());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (manual)
      onGenerate({
        from: mFrom,
        to: mTo,
        time: mTime,
        date: mDate || mDefaultDate,
      });
    else onGenerate({ flight: fno, date });
  };

  const airportOpts = Object.entries(AIRPORTS)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([c, a]) => (
      <option key={c} value={c}>
        {c} — {a.city}
      </option>
    ));

  return (
    <form
      onSubmit={submit}
      aria-label="Flight input"
      className="border-2 border-black bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className={`${labelCls} min-w-[150px] flex-1`}>
          Flight number
          <input
            className={inputCls}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setDateOverride("");
              setDateOpen(false);
            }}
            placeholder="SQ345"
            autoCapitalize="characters"
            autoComplete="off"
            disabled={manual}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer border-2 border-black bg-cyan px-4 py-1.5 text-xl font-bold shadow-brutal transition-colors duration-50 hover:bg-pink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-wait disabled:bg-disabled disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-brutal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink max-[640px]:basis-full"
        >
          {busy ? "Working…" : "Generate briefing"}
        </button>
      </div>

      <div className="mt-2.5 font-mono text-xs text-text-secondary">
        Knows: {CURATED_FLIGHT_NOS.join(", ")}
        {GENERATED_FLIGHT_COUNT > 0 &&
          ` + ${GENERATED_FLIGHT_COUNT.toLocaleString()} observed Changi flights`}{" "}
        ·{" "}
        <button type="button" className={ghostCls} onClick={onToggleManual}>
          enter a route manually
        </button>
      </div>

      {!manual && flight && nextDep && (
        <div>
          {/* next-departure statement — separate line, ONE affordance */}
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-black pt-3 text-lg">
            <span>
              Next departure: <b className="whitespace-nowrap">{fmtDate(date)}, {flight.depLocal} from {AIRPORTS[flight.from].city}</b>
            </span>
            {flight.verified !== false && !dateOpen && (
              <button
                type="button"
                className={ghostCls}
                onClick={() => setDateOpen(true)}
              >
                change date
              </button>
            )}
          </div>
          {flight.verified === false && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-block whitespace-nowrap border-2 border-black bg-warning px-2.5 py-0.5 text-xs font-bold">
                SCHEDULE UNVERIFIED
              </span>
              <span>departs {flight.depLocal} — still right?</span>
              {/* DECISION: one affordance serves both confirm and change */}
              {!dateOpen && (
                <button
                  type="button"
                  className={ghostCls}
                  onClick={() => setDateOpen(true)}
                >
                  confirm or change date
                </button>
              )}
            </div>
          )}
          {dateOpen && (
            <label className={`${labelCls} mt-2.5 max-w-[220px]`}>
              Departure date
              <input
                type="date"
                className={inputCls}
                value={dateOverride || nextDep}
                onChange={(e) => setDateOverride(e.target.value)}
              />
            </label>
          )}
        </div>
      )}

      {manual && (
        <div className="mt-3.5 grid grid-cols-4 gap-3 border-t-2 border-black pt-3.5 max-[640px]:grid-cols-2">
          <label className={labelCls}>
            From
            <select
              className={inputCls}
              value={mFrom}
              onChange={(e) => setMFrom(e.target.value)}
            >
              {airportOpts}
            </select>
          </label>
          <label className={labelCls}>
            To
            <select
              className={inputCls}
              value={mTo}
              onChange={(e) => setMTo(e.target.value)}
            >
              {airportOpts}
            </select>
          </label>
          <label className={labelCls}>
            Departure (local)
            <input
              type="time"
              className={inputCls}
              value={mTime}
              onChange={(e) => setMTime(e.target.value)}
            />
          </label>
          <label className={labelCls}>
            Date
            <input
              type="date"
              className={inputCls}
              value={mDate || mDefaultDate}
              onChange={(e) => setMDate(e.target.value)}
            />
          </label>
        </div>
      )}
    </form>
  );
}
