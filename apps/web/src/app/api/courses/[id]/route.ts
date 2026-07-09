import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveCourse, deleteCourse, getCourse, unarchiveCourse } from "@/lib/courses/store";
import { requireAuthUser } from "@/lib/auth/guard";

const PatchSchema = z.object({
  archived: z.boolean(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  const { id } = await context.params;
  const course = await getCourse(id, user?.id ?? null);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  return NextResponse.json({ course });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  const { id } = await context.params;
  const body = PatchSchema.parse(await request.json());
  const course = body.archived ? await archiveCourse(id, user?.id ?? null) : await unarchiveCourse(id, user?.id ?? null);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  return NextResponse.json({ course });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  const { id } = await context.params;
  const deleted = await deleteCourse(id, user?.id ?? null);
  if (!deleted) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
