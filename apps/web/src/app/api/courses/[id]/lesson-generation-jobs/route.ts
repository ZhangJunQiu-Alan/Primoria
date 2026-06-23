import { NextResponse } from "next/server";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { listLessonGenerationJobsByCourse } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

// Owner-scoped lesson jobs for one course (engineering doc §12.3). Used by the
// course-detail outline and Library to poll first/lazy lesson generation.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (isAuthEnabled() && !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const jobs = await listLessonGenerationJobsByCourse(id, user?.id ?? null);
  return NextResponse.json({ jobs });
}
