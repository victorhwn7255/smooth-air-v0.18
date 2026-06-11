import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FeedbackEntry } from "@/lib/types";

/**
 * Append-only feedback storage with two drivers, chosen by env presence:
 * - Upstash Redis via REST when UPSTASH_REDIS_REST_URL + _TOKEN exist
 *   (required on Vercel — serverless has no persistent disk). This is the
 *   project's single permitted credential; see .env.example.
 * - Local JSON file otherwise (dev / any persistent Node host).
 */
export class FeedbackUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackUnavailableError";
  }
}

const REDIS_KEY = "smoothair:feedback";

const filePath = () =>
  process.env.FEEDBACK_FILE ||
  join(process.cwd(), "src/lib/data/feedback.json");

const upstash = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

export async function appendFeedback(entry: FeedbackEntry): Promise<void> {
  const redis = upstash();
  try {
    if (redis) {
      const r = await fetch(`${redis.url}/rpush/${REDIS_KEY}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${redis.token}` },
        body: JSON.stringify(entry),
      });
      if (!r.ok) throw new Error("Upstash HTTP " + r.status);
      return;
    }
    const all = await listFromFile();
    all.push(entry);
    await writeFile(filePath(), JSON.stringify(all, null, 1));
  } catch (e) {
    throw new FeedbackUnavailableError(
      e instanceof Error ? e.message : String(e),
    );
  }
}

export async function listFeedback(): Promise<FeedbackEntry[]> {
  const redis = upstash();
  try {
    if (redis) {
      const r = await fetch(`${redis.url}/lrange/${REDIS_KEY}/0/-1`, {
        headers: { Authorization: `Bearer ${redis.token}` },
      });
      if (!r.ok) throw new Error("Upstash HTTP " + r.status);
      const j = (await r.json()) as { result: string[] };
      return j.result.map((s) => JSON.parse(s) as FeedbackEntry);
    }
    return await listFromFile();
  } catch (e) {
    throw new FeedbackUnavailableError(
      e instanceof Error ? e.message : String(e),
    );
  }
}

async function listFromFile(): Promise<FeedbackEntry[]> {
  try {
    return JSON.parse(await readFile(filePath(), "utf8")) as FeedbackEntry[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
