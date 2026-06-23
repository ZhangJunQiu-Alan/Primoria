import { NextResponse } from "next/server";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getLessonGenerationJob } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

// Owner-scoped lesson job status (engineering doc §12.3). The summary never
// exposes ownerId/lease internals/model secrets.
export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const user = await getCurrentUser();
  if (isAuthEnabled() && !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await context.params;
  const job = await getLessonGenerationJob(jobId, user?.id ?? null);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}
