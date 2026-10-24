import { NextResponse } from "next/server";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { retryLectureKg } from "@/lib/materials/folders";

export const runtime = "nodejs";

// Re-queue a lecture whose small KG build failed.
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("materials");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const material = await retryLectureKg(user.id, id);
    if (!material) return NextResponse.json({ error: "Only a failed lecture in a subject folder can be retried.", code: "not_retryable" }, { status: 409 });
    return NextResponse.json({ material });
  } catch (error) {
    console.error("[materials] KG retry failed", error);
    return NextResponse.json({ error: "Retry failed. Please retry." }, { status: 503 });
  }
}
