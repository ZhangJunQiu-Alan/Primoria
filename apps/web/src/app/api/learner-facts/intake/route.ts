import { NextResponse } from "next/server";
import { z } from "zod";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import {
  enqueueProfileFactIntakeJob,
  getProfileFactIntakeJob,
  ProfileFactIntakeBusyError,
} from "@/lib/learner-facts/intake-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({ text: z.string().trim().min(2).max(2_000) }).strict();

export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("learner-facts-intake");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = RequestSchema.parse(await request.json());
    const intake = await enqueueProfileFactIntakeJob({
      ownerId: user.id,
      sourceKind: "settings",
      sourceText: body.text,
    });
    return NextResponse.json({ jobId: intake.job.id, status: intake.job.status }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Write 2–2000 characters to extract facts." }, { status: 400 });
    }
    if (error instanceof ProfileFactIntakeBusyError) {
      return NextResponse.json({ error: error.message, code: "profile_fact_intake_busy" }, { status: 409 });
    }
    console.error("[learner-facts/intake]", error instanceof Error ? error.name : "unknown_error");
    return NextResponse.json({ error: "Could not start fact extraction." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("learner-facts-intake");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jobId = new URL(request.url).searchParams.get("jobId") ?? "";
  if (!jobId) return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  const job = await getProfileFactIntakeJob(user.id, jobId);
  if (!job) return NextResponse.json({ error: "Fact extraction job not found." }, { status: 404 });
  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    result: job.result,
    error: job.status === "failed" ? "Fact extraction could not be completed." : null,
  });
}
