import type { Briefing } from "@/lib/types";

const chip =
  "inline-block whitespace-nowrap border-2 border-black px-2.5 py-0.5 text-xs font-bold";

export default function GradeCard({ b }: { b: Briefing }) {
  const dash = b.grade.label.indexOf("—");
  const accentBg = b.grade.warn ? "bg-warning" : "bg-success";
  const hrs = (b.depUtcMs - b.generatedAt) / 36e5;
  const depDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(b.depLocalDate + "T12:00:00Z"));

  // stacked flight line (UX debt #3): bold route row + wrapping meta row
  const meta = [
    b.aircraft || (b.widebody ? "widebody assumed" : "narrowbody assumed"),
    `${b.distanceKm.toLocaleString()} km`,
    `${(b.durationMin / 60).toFixed(1)} h`,
    `${depDate} ${b.depLocalTime}`,
  ];

  return (
    <section
      aria-live="polite"
      className="border-2 border-black bg-white p-4 shadow-brutal"
    >
      <div className="mb-3 flex flex-col gap-0.5">
        <span className="font-mono text-lg font-bold">
          {b.flightNo || "Route"} {b.from} → {b.to}
        </span>
        <span className="flex flex-wrap gap-x-3.5 gap-y-0.5 font-mono text-xs uppercase text-text-tertiary">
          {meta.map((m) => (
            <span key={m} className="whitespace-nowrap">
              {m}
            </span>
          ))}
        </span>
      </div>
      <h2 className="text-3xl font-bold leading-tight max-[640px]:text-2xl">
        {dash >= 0 ? (
          <>
            {b.grade.label.slice(0, dash + 1)}{" "}
            <span className={`${accentBg} box-decoration-clone px-1.5`}>
              {b.grade.label.slice(dash + 1).trim()}
            </span>
          </>
        ) : (
          <span className={`${accentBg} box-decoration-clone px-1.5`}>
            {b.grade.label}
          </span>
        )}
      </h2>
      <div className="mt-1.5 text-sm text-text-secondary">{b.grade.sub}</div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <span className={`${chip} bg-pink`}>
          confidence: {b.confidence.tier}
        </span>
        <span className={`${chip} bg-white font-mono font-normal`}>
          {hrs < 0 ? "departed" : `departs in ${Math.round(hrs)} h`}
        </span>
        <span className={`${chip} ${b.demo ? "bg-warning" : "bg-teal"}`}>
          {b.demo ? "DEMO DATA" : "GFS · Open-Meteo"}
        </span>
        <span className={`${chip} bg-white font-mono font-normal`}>
          SIGMETs:{" "}
          {b.demo
            ? "—"
            : b.sigmet.checked
              ? b.sigmet.hits
                ? b.sigmet.hits + " on route"
                : "none"
              : "unavailable"}
        </span>
        <span className={`${chip} bg-white font-mono font-normal`}>
          route:{" "}
          {b.corridorSource === "baked" ? "baked tracks" : "great circle"}
        </span>
        <span className={`${chip} bg-white font-mono font-normal`}>
          updates every 6 h
        </span>
      </div>
    </section>
  );
}
