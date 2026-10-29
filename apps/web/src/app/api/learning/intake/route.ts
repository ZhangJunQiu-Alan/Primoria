import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/auth/guard";
import { IntakeAnswersSchema } from "@/lib/courses/course-intake";
import { prepareCourseIntake, submitCourseIntake } from "@/lib/courses/course-intake-store";

export const runtime = "nodejs";
const PrepareSchema = z.object({ query: z.string().trim().min(1).max(1000), graphId: z.string().max(120).optional() });
const SubmitSchema = z.object({ id: z.string().max(100), answers: IntakeAnswersSchema });

export async function POST(request: Request) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = PrepareSchema.parse(await request.json());
    return NextResponse.json(await prepareCourseIntake(user.id, input.query, input.graphId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Invalid learning goal." : "Course preparation is unavailable. Please retry." }, { status: error instanceof z.ZodError ? 400 : 503 });
  }
}

export async function PATCH(request: Request) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = SubmitSchema.parse(await request.json());
    const intake = await submitCourseIntake(user.id, input.id, input.answers);
    return intake ? NextResponse.json(intake) : NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not save your answers. Please retry." }, { status: 400 });
  }
}
