import type { Zone } from "@/lib/types";
import { fmtDur, fmtH, pctBand } from "@/lib/pipeline/narrative";

const chip =
  "inline-block whitespace-nowrap border-2 border-black px-2.5 py-0.5 text-xs font-bold";

/** 22px numbered square linking ribbon ↔ zone cards. */
export const numSq =
  "inline-flex h-[22px] w-[22px] flex-none items-center justify-center border-2 border-black bg-white font-mono text-xs font-bold";

export default function ZoneCard({
  z,
  n,
  locator,
}: {
  z: Zone;
  n: number;
  locator?: string;
}) {
  const open = z.region === "open water";
  return (
    <div className="border-2 border-l-[5px] border-black border-l-salmon bg-white p-4 transition-transform duration-50 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={numSq}>{n}</span>
          <h3 className="text-xl font-bold">{open ? "Open water" : z.region}</h3>
        </span>
        <span
          className={`${chip} uppercase ${
            z.cls === "light" ? "bg-warning" : "bg-error"
          }`}
        >
          {z.cls}
        </span>
      </div>
      <div className="mb-3 font-mono text-xs text-text-secondary">
        {fmtH(z.startH)} · {fmtDur(Math.max(0.2, z.endH - z.startH))}
        {open && locator ? ` · ${locator}` : ""}
      </div>
      <div className="flex items-center justify-between gap-2 border-t-2 border-black py-2 text-sm">
        <span>noticeable bumps</span>
        <b className="whitespace-nowrap text-right">
          {pctBand(z.pLight)} ({Math.round(z.pLight * 100)}%)
        </b>
      </div>
      <div className="flex items-center justify-between gap-2 border-t-2 border-black py-2 text-sm">
        <span>moderate or worse</span>
        <b className="whitespace-nowrap text-right">{Math.round(z.pMod * 100)}%</b>
      </div>
      <div className="flex items-center justify-between gap-2 border-t-2 border-black py-2 text-sm">
        <span>cause</span>
        <span className={`${chip} bg-lavender`}>
          {z.mech === "convection" ? "thunderstorms" : "jet-stream shear"}
        </span>
      </div>
      {z.sigmet && (
        <div className="flex items-center justify-between gap-2 border-t-2 border-black py-2 text-sm">
          <span>official SIGMET</span>
          <span className={`${chip} bg-warning`}>ACTIVE IN AREA</span>
        </div>
      )}
      <div className="mt-3 text-sm text-text-secondary">
        {open
          ? "No landmass to point at here — just open ocean below. The forecast covers this stretch all the same."
          : z.mech === "convection"
            ? "Storm cells show on the crew's radar long before you reach them — expect a few course tweaks rather than a straight line through."
            : "Wind layers sliding over each other near the jet. Firm but familiar — the kind of bumps that rattle cups, not nerves."}
      </div>
    </div>
  );
}
