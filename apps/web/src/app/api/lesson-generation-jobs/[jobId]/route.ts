import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/guard";
import { getLessonGenerationJob } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

// Owner-scoped lesson job status (engineering doc §12.3). The summary never
// exposes ownerId/lease internals/model secrets.
export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  const { jobId } = await context.params;
  const job = await getLessonGenerationJob(jobId, user?.id ?? null);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}
