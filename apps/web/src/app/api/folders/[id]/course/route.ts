import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { createFolderCourse, FolderCourseError, loadFolderCourseState } from "@/lib/materials/folder-course";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_STATUS = { folder_not_found: 404, no_graph: 409, no_course: 404 } as const;

type Context = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, label: string, fallback: string) {
  if (error instanceof FolderCourseError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: ERROR_STATUS[error.code] });
  }
  console.error(`[folders] ${label}`, error);
  return NextResponse.json({ error: fallback }, { status: 503 });
}

// The folder's course (one per folder graph) and how many new concepts a
// sync would add.
export async function GET(_request: Request, context: Context) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    return NextResponse.json({ course: await loadFolderCourseState(user.id, id) });
  } catch (error) {
    return errorResponse(error, "course read failed", "Failed to load the course.");
  }
}

// Build the course from the folder KG (or return the existing one).
export async function POST(_request: Request, context: Context) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const { courseId, created } = await createFolderCourse(user.id, id);
    return NextResponse.json({ courseId, created }, { status: created ? 202 : 200 });
  } catch (error) {
    return errorResponse(error, "course creation failed", "Course creation failed. Please retry.");
  }
}
