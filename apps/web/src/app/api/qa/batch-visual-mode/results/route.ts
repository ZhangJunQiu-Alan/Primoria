import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_QA_RESULTS_BODY_BYTES = 2 * 1024 * 1024;

const QaResultSchema = z.object({
  id: z.string().min(1),
  prompt: z.string(),
  expectedMode: z.string(),
  actualType: z.string(),
  title: z.string(),
  codeKind: z.string(),
  codeFile: z.string(),
  artifact: z.unknown(),
  status: z.enum(["passed", "failed"]),
  error: z.string().optional(),
});

const RequestSchema = z.object({
  runId: z.string().min(1).max(100).optional(),
  generatedAt: z.string().optional(),
  results: z.array(QaResultSchema).min(1).max(50),
});

function safeRunId(input?: string) {
  const fallback = `batch-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const cleaned = (input || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return cleaned || fallback;
}

function isQaResultsWriteAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.PRIMORIA_ENABLE_QA_ROUTES === "1";
}

export async function POST(request: Request) {
  try {
    if (!isQaResultsWriteAllowed()) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_QA_RESULTS_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "QA result payload is too large" }, { status: 413 });
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_QA_RESULTS_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "QA result payload is too large" }, { status: 413 });
    }

    const body = RequestSchema.parse(JSON.parse(rawBody));
    const runId = safeRunId(body.runId);
    const generatedAt = body.generatedAt || new Date().toISOString();
    const payload = {
      runId,
      generatedAt,
      results: body.results,
    };

    const qaRoot = path.join(process.cwd(), "public", "qa-results");
    const runDir = path.join(qaRoot, runId);
    await mkdir(runDir, { recursive: true });
    await writeFile(path.join(runDir, "results.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    const latestDir = path.join(qaRoot, "latest");
    await mkdir(latestDir, { recursive: true });
    await writeFile(path.join(latestDir, "results.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    return NextResponse.json({
      ok: true,
      runId,
      resultsPath: `/qa-results/${runId}/results.json`,
      routePath: `/qa/interactive-visual-results?run=${encodeURIComponent(runId)}`,
    });
  } catch (error) {
    console.error("[qa/batch-visual-mode/results]", error);
    const message = error instanceof Error ? error.message : "Failed to save QA results";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
