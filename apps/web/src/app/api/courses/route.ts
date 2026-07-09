import { NextResponse } from "next/server";
import { listCourses } from "@/lib/courses/store";
import { requireAuthUser } from "@/lib/auth/guard";
export async function GET() {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  return NextResponse.json({ courses: await listCourses(user?.id ?? null) });
}
