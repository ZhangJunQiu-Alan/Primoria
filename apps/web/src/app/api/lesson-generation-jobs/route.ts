import { NextResponse } from "next/server";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { listActiveLessonGenerationJobsByOwner } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

// Owner-scoped active lesson jobs (queued/running/failed) for the Library poller
// (engineering doc §13.5). Separate from the legacy course-generation-jobs feed.
export async function GET() {
  const user = await getCurrentUser();
  if (isAuthEnabled() && !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ jobs: await listActiveLessonGenerationJobsByOwner(user?.id ?? null) });
}
