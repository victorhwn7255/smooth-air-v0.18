import type { Briefing } from "@/lib/types";
import { fmtH } from "@/lib/pipeline/narrative";

export default function FlightRibbon({ b }: { b: Briefing }) {
  const total = b.waypoints[b.waypoints.length - 1].elapsedH;

  return (
    <section
      aria-label="Flight timeline"
      className="border-2 border-black bg-white p-4"
    >
      <div className="mb-2 flex justify-between font-mono text-xs font-bold">
        <span>{b.from} ↑</span>
        <span>FLIGHT TIMELINE</span>
        <span>↓ {b.to}</span>
      </div>
      <div className="relative h-14 overflow-hidden border-2 border-black bg-success">
        {b.zones.map((z, i) => {
          const widthPct = Math.max(3, ((z.endH - z.startH) / total) * 100);
          return (
            <div
              key={i}
              className={`absolute inset-y-0 border-x-2 border-black ${
                z.cls === "moderate" || z.cls === "severe"
                  ? "bg-error"
                  : "bg-warning"
              }`}
              style={{
                left: (z.startH / total) * 100 + "%",
                width: widthPct + "%",
              }}
            >
              {/* DECISION: label only bands wide enough to hold it — narrow
                  bands overlapped illegibly; the ticks below still name them */}
              {widthPct >= 10 && (
                <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap text-xs font-bold uppercase">
                  {z.cls}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="relative mt-1.5 h-14 font-mono text-xs">
        <span className="absolute left-0 top-0 text-text-secondary">
          TAKEOFF
        </span>
        <span className="absolute right-0 top-0 text-text-secondary">
          LANDING
        </span>
        {b.zones.map((z, i) => {
          const mid = (z.startH + z.endH) / 2;
          return (
            <span
              key={i}
              className="absolute -translate-x-1/2 whitespace-nowrap text-center font-bold"
              // stagger alternate ticks so labels stay legible at 360px
              style={{
                left: Math.min(92, Math.max(8, (mid / total) * 100)) + "%",
                top: i % 2 ? "26px" : "0",
              }}
            >
              {z.region}
              <small className="block text-xs font-normal text-text-secondary">
                {fmtH(mid).replace("about ", "~")}
              </small>
            </span>
          );
        })}
      </div>
    </section>
  );
}
