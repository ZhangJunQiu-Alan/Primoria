import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveCourse, getCourse, unarchiveCourse } from "@/lib/courses/store";

const PatchSchema = z.object({
  archived: z.boolean(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const course = await getCourse(id);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  return NextResponse.json({ course });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = PatchSchema.parse(await request.json());
  const course = body.archived ? await archiveCourse(id) : await unarchiveCourse(id);
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  return NextResponse.json({ course });
}
