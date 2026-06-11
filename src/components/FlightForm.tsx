"use client";

import { useState } from "react";
import airportsJson from "@/lib/data/airports.json";
import flightsJson from "@/lib/data/flights.json";
import { nextDeparture } from "@/lib/pipeline/timing";
import type { Airport, FlightEntry } from "@/lib/types";

const FLIGHTS = flightsJson as Record<string, FlightEntry>;
const AIRPORTS = airportsJson as Record<string, Airport>;

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
  "cursor-pointer text-sm font-bold underline hover:bg-pink transition-colors duration-50";

export default function FlightForm({
  busy,
  manual,
  onToggleManual,
  onGenerate,
}: {
  busy: boolean;
  manual: boolean;
  onToggleManual: () => void;
  onGenerate: (p: GenerateParams) => void;
}) {
  const [raw, setRaw] = useState("SQ345");
  const [showDate, setShowDate] = useState(false);
  const [dateOverride, setDateOverride] = useState("");
  const [mFrom, setMFrom] = useState("SIN");
  const [mTo, setMTo] = useState("ZRH");
  const [mTime, setMTime] = useState("11:40");
  const [mDate, setMDate] = useState("");

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

  return (
    <form onSubmit={submit} className="border-2 border-black bg-white p-4">
      <div className="grid grid-cols-[1fr_auto] items-end gap-3 max-[560px]:grid-cols-1">
        <label className={labelCls}>
          Flight number
          <input
            className={inputCls}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setDateOverride("");
              setShowDate(false);
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
          className="cursor-pointer border-2 border-black bg-cyan px-4 py-1.5 text-xl font-bold shadow-brutal transition-colors duration-50 hover:bg-pink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-wait disabled:bg-disabled disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-brutal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
        >
          {busy ? "Working…" : "Generate briefing"}
        </button>
      </div>

      {!manual && flight && nextDep && (
        <p className="mt-3 text-sm">
          <b>
            Next departure: {fmtDate(date)}, {flight.depLocal} from{" "}
            {AIRPORTS[flight.from].city}
          </b>
          {flight.verified === false && (
            <span className="text-text-secondary">
              {" "}
              — departs {flight.depLocal}, still right? schedule unverified
            </span>
          )}{" "}
          {!showDate && (
            <button
              type="button"
              className={ghostCls}
              onClick={() => {
                setDateOverride(nextDep);
                setShowDate(true);
              }}
            >
              change date
            </button>
          )}
        </p>
      )}

      {!manual && showDate && (
        <label className={`${labelCls} mt-3 max-w-56`}>
          Departure date
          <input
            type="date"
            className={inputCls}
            value={dateOverride}
            onChange={(e) => setDateOverride(e.target.value)}
          />
        </label>
      )}

      <div className="mt-2.5 font-mono text-xs text-text-secondary">
        Knows: {Object.keys(FLIGHTS).join(", ")} &nbsp;·&nbsp;{" "}
        <button type="button" className={ghostCls} onClick={onToggleManual}>
          enter a route manually
        </button>
      </div>

      {manual && (
        <div className="mt-3.5 grid grid-cols-2 gap-3 border-t-2 border-black pt-3.5 sm:grid-cols-4">
          <label className={labelCls}>
            From
            <select
              className={inputCls}
              value={mFrom}
              onChange={(e) => setMFrom(e.target.value)}
            >
              {Object.entries(AIRPORTS).map(([c, a]) => (
                <option key={c} value={c}>
                  {c} — {a.city}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            To
            <select
              className={inputCls}
              value={mTo}
              onChange={(e) => setMTo(e.target.value)}
            >
              {Object.entries(AIRPORTS).map(([c, a]) => (
                <option key={c} value={c}>
                  {c} — {a.city}
                </option>
              ))}
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
