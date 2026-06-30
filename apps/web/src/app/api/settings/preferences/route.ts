import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { CONTENT_LANGUAGES, getUserPreferences, saveUserPreferences } from "@/lib/settings/user-settings";

const PreferencesSchema = z.object({
  contentLanguage: z.enum(CONTENT_LANGUAGES).optional(),
});

export async function GET() {
  if (!isAuthEnabled()) return NextResponse.json({ authEnabled: false, preferences: await getUserPreferences(null) });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authEnabled: true, preferences: await getUserPreferences(null) });
  return NextResponse.json({ authEnabled: true, preferences: await getUserPreferences(user.id) });
}

export async function PUT(request: Request) {
  if (!isAuthEnabled()) return NextResponse.json({ ok: false, error: "Auth is not configured" }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const patch = PreferencesSchema.parse(await request.json());
  return NextResponse.json({ ok: true, preferences: await saveUserPreferences(user.id, patch) });
}
