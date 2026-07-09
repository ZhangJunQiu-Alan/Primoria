import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/guard";
import { listPendingDecisionsByCourse } from "@/lib/courses/learning-progress-jobs";

export const dynamic = "force-dynamic";

// Owner-scoped pending learning-progress recommendations for one course. Polled
// by the course view to surface the next-step popup after a lesson is completed.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  const { id } = await context.params;
  const recommendations = await listPendingDecisionsByCourse(id, user?.id ?? null);
  return NextResponse.json({ recommendations });
}
