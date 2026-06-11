import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as exportGET } from "@/app/api/feedback/export/route";
import { POST } from "@/app/api/feedback/route";

const BASE = "http://localhost:3000/api/feedback";

const post = (body: unknown) =>
  POST(
    new Request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const valid = {
  flight: "SQ345",
  date: "2026-06-10",
  briefingGrade: "Smooth with light chop in places",
  actual: "light",
};

describe("feedback API (file driver)", () => {
  beforeEach(() => {
    process.env.FEEDBACK_FILE = join(mkdtempSync(join(tmpdir(), "sa-fb-")), "feedback.json");
    delete process.env.FEEDBACK_EXPORT_KEY;
  });
  afterEach(() => {
    delete process.env.FEEDBACK_FILE;
    delete process.env.FEEDBACK_EXPORT_KEY;
  });

  it("valid POST appends; export returns it", async () => {
    const r = await post(valid);
    expect(r.status).toBe(200);
    const r2 = await post({ ...valid, actual: "rough", comment: "over the Alps" });
    expect(r2.status).toBe(200);
    const ex = await exportGET(new Request(BASE + "/export"));
    expect(ex.status).toBe(200);
    const arr = await ex.json();
    expect(arr).toHaveLength(2);
    expect(arr[0].flight).toBe("SQ345");
    expect(arr[1].comment).toBe("over the Alps");
    expect(typeof arr[0].receivedAt).toBe("number");
  });

  it("rejects bad actual, bad date, long comment", async () => {
    expect((await post({ ...valid, actual: "terrible" })).status).toBe(400);
    expect((await post({ ...valid, date: "junk" })).status).toBe(400);
    expect((await post({ ...valid, comment: "x".repeat(281) })).status).toBe(400);
  });

  it("export key check when FEEDBACK_EXPORT_KEY is set", async () => {
    process.env.FEEDBACK_EXPORT_KEY = "family-secret";
    expect((await exportGET(new Request(BASE + "/export"))).status).toBe(401);
    expect(
      (await exportGET(new Request(BASE + "/export?key=family-secret"))).status,
    ).toBe(200);
  });
});
