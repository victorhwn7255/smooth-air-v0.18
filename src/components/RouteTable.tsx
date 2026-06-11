import type { Briefing } from "@/lib/types";
import { classify } from "@/lib/pipeline/scoring";

const sq: Record<string, string> = {
  smooth: "bg-success",
  light: "bg-warning",
  moderate: "bg-error",
  severe: "bg-error",
};

export default function RouteTable({ b }: { b: Briefing }) {
  return (
    <details>
      <summary className="inline-block cursor-pointer border-2 border-black bg-white px-3 py-1 text-sm font-bold shadow-brutal transition-colors duration-50 hover:bg-pink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pink">
        Route detail — every segment
      </summary>
      <div className="mt-3 overflow-x-auto border-2 border-black bg-white px-3 py-2">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr>
              {["Over", "Time in", "Shear s⁻¹", "Jet kt", "CAPE", "Index", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="border-b-2 border-black p-2 text-left font-bold uppercase tracking-[0.08em]"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {b.waypoints.map((w, i) => {
              if (i % 2) return null; // thin the table, as v1
              const s = b.scores[i];
              const cls = classify(s.S, b.widebody);
              return (
                <tr key={i}>
                  <td className="border-b border-black/15 p-1.5 font-bold text-black">
                    {w.region}
                  </td>
                  <td className="border-b border-black/15 p-1.5 text-text-secondary">
                    {w.elapsedH.toFixed(1)} h
                  </td>
                  <td className="border-b border-black/15 p-1.5 text-text-secondary">
                    {s.vws ? s.vws.toFixed(4) : "—"}
                  </td>
                  <td className="border-b border-black/15 p-1.5 text-text-secondary">
                    {s.jet ? Math.round(s.jet) : "—"}
                  </td>
                  <td className="border-b border-black/15 p-1.5 text-text-secondary">
                    {Math.round(s.cape)}
                  </td>
                  <td className="border-b border-black/15 p-1.5 text-text-secondary">
                    {s.S.toFixed(2)}
                  </td>
                  <td className="border-b border-black/15 p-1.5">
                    {/* severity squares — the online dot is the only permitted circle */}
                    <span
                      className={`inline-block size-3 border-2 border-black align-middle ${sq[cls]}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
