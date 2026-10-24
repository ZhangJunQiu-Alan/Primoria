import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { FolderCourseError, syncFolderCourse } from "@/lib/materials/folder-course";

export const runtime = "nodejs";

const ERROR_STATUS = { folder_not_found: 404, no_graph: 409, no_course: 404 } as const;

// Insert planned lessons for concepts that lectures added after the course
// was built (docs/product/subject-folders.md §4.4).
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    return NextResponse.json(await syncFolderCourse(user.id, id));
  } catch (error) {
    if (error instanceof FolderCourseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: ERROR_STATUS[error.code] });
    }
    console.error("[folders] course sync failed", error);
    return NextResponse.json({ error: "Sync failed. Please retry." }, { status: 503 });
  }
}
