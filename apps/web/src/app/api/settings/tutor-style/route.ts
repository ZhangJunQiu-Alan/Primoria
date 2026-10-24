import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/guard";
import { updateTutorStyle } from "@/lib/learner-profile/store";
import { TUTOR_STYLES } from "@/lib/learner-profile/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({ tutorStyle: z.enum(TUTOR_STYLES) }).strict();

export async function PUT(request: Request) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    const profile = await updateTutorStyle(user.id, body.tutorStyle);
    return NextResponse.json({ ok: true, tutorStyle: profile.tutorStyle });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid tutor style." }, { status: 400 });
    }
    console.error("[settings/tutor-style]", error);
    return NextResponse.json({ error: "Could not save your tutor style right now. Please retry." }, { status: 503 });
  }
}
