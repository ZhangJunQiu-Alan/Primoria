import { NextResponse } from "next/server";
import { getCourse } from "@/lib/courses/store";
import { requireAuth } from "@/lib/auth/guard";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id } = await context.params;
  const course = await getCourse(id);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  return NextResponse.json({ course });
}
