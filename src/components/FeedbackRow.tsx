"use client";

import { useState } from "react";

const OPTIONS = [
  ["smooth", "Smooth"],
  ["light", "Light bumps"],
  ["bumpy", "Bumpy"],
  ["rough", "Rough"],
] as const;

/** One-tap post-flight feedback — only shown once the departure has passed. */
export default function FeedbackRow({
  flight,
  date,
  briefingGrade,
}: {
  flight: string;
  date: string;
  briefingGrade: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function submit(actual: string) {
    setState("busy");
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight, date, briefingGrade, actual }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(j.error || "Couldn't record that.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setMessage("Couldn't record that — try again later.");
      setState("error");
    }
  }

  if (state === "done")
    return (
      <div className="border-2 border-black bg-white p-4 text-sm">
        <b>Thanks — recorded.</b> Every answer makes the next briefing more
        honest.
      </div>
    );

  return (
    <div className="border-2 border-black bg-white p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em]">
        How was it?
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={state === "busy"}
            onClick={() => submit(value)}
            className="cursor-pointer border-2 border-black bg-white px-3 py-1.5 text-sm font-bold shadow-brutal transition-colors duration-50 hover:bg-pink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-wait disabled:bg-disabled focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
          >
            {label}
          </button>
        ))}
      </div>
      {state === "error" && (
        <div className="mt-2 font-mono text-xs text-text-secondary">
          {message}
        </div>
      )}
    </div>
  );
}
