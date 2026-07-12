import { NextResponse } from "next/server";
import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { importSharedCourse } from "@/lib/courses/share-store";

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("share-import");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = await context.params;
  const result = await importSharedCourse(token, user.id);
  if (!result.ok) {
    if (result.reason === "duplicate_subject") {
      return NextResponse.json({ error: "duplicate_subject" }, { status: 409 });
    }
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }
  return NextResponse.json({ courseId: result.courseId, alreadyImported: result.alreadyImported });
}
