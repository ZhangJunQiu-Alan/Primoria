import { NextResponse } from "next/server";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { listCourseGenerationJobs } from "@/lib/courses/generation-jobs";

export async function GET() {
  const user = await getCurrentUser();
  if (isAuthEnabled() && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ jobs: await listCourseGenerationJobs(user?.id ?? null) });
}
