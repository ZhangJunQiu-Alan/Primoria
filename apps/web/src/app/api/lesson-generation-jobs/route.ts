import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/guard";
import { listActiveLessonGenerationJobsByOwner } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

// Owner-scoped active lesson jobs (queued/running/failed) for the Library poller
// (engineering doc §13.5). Separate from the legacy course-generation-jobs feed.
export async function GET() {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  return NextResponse.json({ jobs: await listActiveLessonGenerationJobsByOwner(user?.id ?? null) });
}
