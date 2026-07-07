import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function PATCH(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { displayName?: unknown } | null;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  if (displayName.length > 80) return NextResponse.json({ error: "Display name is too long." }, { status: 400 });

  const [updated] = await getDb()
    .update(users)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning({ id: users.id, displayName: users.displayName });

  return NextResponse.json({ user: updated });
}
