import { NextResponse } from "next/server";
import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { CourseShareNotAllowedError, getShareForCourse, revokeShare, upsertShare } from "@/lib/courses/share-store";
import { getCourse } from "@/lib/courses/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("course-share");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const course = await getCourse(id, user.id);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const share = await getShareForCourse(id, user.id);
  return NextResponse.json({ share: share && share.revokedAt === null ? share : null });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("course-share");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const share = await upsertShare(id, user.id);
    if (!share) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json({ share });
  } catch (error) {
    if (error instanceof CourseShareNotAllowedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 403 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("course-share");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const revoked = await revokeShare(id, user.id);
  if (!revoked) return NextResponse.json({ error: "Share not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
