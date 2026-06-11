import {
  appendFeedback,
  FeedbackUnavailableError,
} from "@/lib/sources/feedbackStore";
import type { FeedbackEntry } from "@/lib/types";

const ACTUALS = ["smooth", "light", "bumpy", "rough"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const { flight, date, briefingGrade, actual, comment } = body;
  if (typeof flight !== "string" || flight.length > 10)
    return Response.json({ error: "flight must be a short string." }, { status: 400 });
  if (typeof date !== "string" || !DATE_RE.test(date))
    return Response.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
  if (typeof briefingGrade !== "string" || briefingGrade.length > 80)
    return Response.json({ error: "briefingGrade must be a short string." }, { status: 400 });
  if (!ACTUALS.includes(actual as (typeof ACTUALS)[number]))
    return Response.json(
      { error: `actual must be one of: ${ACTUALS.join(", ")}.` },
      { status: 400 },
    );
  if (comment !== undefined && (typeof comment !== "string" || comment.length > 280))
    return Response.json({ error: "comment must be ≤ 280 chars." }, { status: 400 });

  const entry: FeedbackEntry = {
    flight: flight.toUpperCase(),
    date,
    briefingGrade,
    actual: actual as FeedbackEntry["actual"],
    ...(comment ? { comment } : {}),
    receivedAt: Date.now(),
  };
  try {
    await appendFeedback(entry);
  } catch (e) {
    if (e instanceof FeedbackUnavailableError)
      return Response.json(
        { error: "Feedback isn't set up on this deployment yet." },
        { status: 503 },
      );
    throw e;
  }
  return Response.json({ ok: true });
}
