import { NextResponse } from "next/server";
import { listCourses } from "@/lib/courses/store";
import { requireAuth } from "@/lib/auth/guard";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  return NextResponse.json({ courses: await listCourses() });
}
