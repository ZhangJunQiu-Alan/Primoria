import { NextResponse } from "next/server";
import { listCourses } from "@/lib/courses/store";

export async function GET() {
  return NextResponse.json({ courses: listCourses() });
}
