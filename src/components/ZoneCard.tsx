import type { Zone } from "@/lib/types";
import { fmtDur, fmtH, pctBand } from "@/lib/pipeline/narrative";

const chip = "inline-block border-2 border-black px-2.5 py-0.5 text-xs font-bold";

export default function ZoneCard({ z }: { z: Zone }) {
  return (
    <div className="border-2 border-l-[5px] border-black border-l-salmon bg-white p-4 transition-transform duration-50 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold">{z.region}</h3>
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
      </div>
      <div className="flex items-center justify-between gap-2 border-t-2 border-black py-2 text-sm">
        <span>noticeable bumps</span>
        <b className="text-right">
          {pctBand(z.pLight)} ({Math.round(z.pLight * 100)}%)
        </b>
      </div>
      <div className="flex items-center justify-between gap-2 border-t-2 border-black py-2 text-sm">
        <span>moderate or worse</span>
        <b className="text-right">{Math.round(z.pMod * 100)}%</b>
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
        {z.mech === "convection"
          ? "Storm cells are visible on the crew's radar long before you reach them — expect a few course tweaks rather than a straight line through."
          : "Wind layers sliding over each other near the jet. Firm but familiar — the kind of bumps that rattle cups, not nerves."}
      </div>
    </div>
  );
}
