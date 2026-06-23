import { NextResponse } from "next/server";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { listPendingDecisionsByCourse } from "@/lib/courses/learning-progress-jobs";

export const dynamic = "force-dynamic";

// Owner-scoped pending learning-progress recommendations for one course. Polled
// by the course view to surface the next-step popup after a lesson is completed.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (isAuthEnabled() && !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const recommendations = await listPendingDecisionsByCourse(id, user?.id ?? null);
  return NextResponse.json({ recommendations });
}
