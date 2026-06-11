import {
  FeedbackUnavailableError,
  listFeedback,
} from "@/lib/sources/feedbackStore";

/**
 * Raw feedback array — feeds future recalibration. Family-scale: a static
 * ?key= check (FEEDBACK_EXPORT_KEY) keeps crawlers out when set.
 */
export async function GET(req: Request) {
  const key = process.env.FEEDBACK_EXPORT_KEY;
  if (key && new URL(req.url).searchParams.get("key") !== key)
    return Response.json({ error: "Wrong or missing ?key=." }, { status: 401 });
  try {
    return Response.json(await listFeedback());
  } catch (e) {
    if (e instanceof FeedbackUnavailableError)
      return Response.json(
        { error: "Feedback isn't set up on this deployment yet." },
        { status: 503 },
      );
    throw e;
  }
}
