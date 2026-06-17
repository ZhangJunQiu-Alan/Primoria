import { NextResponse } from "next/server";
import { listCourseEditEvents } from "@/lib/memory/course-edit-events";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json({ events: await listCourseEditEvents(id) });
}
