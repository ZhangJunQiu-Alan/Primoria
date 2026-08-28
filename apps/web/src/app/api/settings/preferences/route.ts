import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalAuthUser } from "@/lib/auth/guard";
import { isAuthEnabled } from "@/lib/auth/session";
import { CONTENT_LANGUAGES, getUserPreferences, isValidTimeZone, saveUserPreferences } from "@/lib/settings/user-settings";
import { resolveUiLanguage } from "@/lib/i18n/server";
import { UI_LANGUAGES, UI_LANGUAGE_COOKIE } from "@/lib/i18n/languages";

const PreferencesSchema = z.object({
  contentLanguage: z.enum(CONTENT_LANGUAGES).optional(),
  uiLanguage: z.enum(UI_LANGUAGES).optional(),
  timeZone: z.string().refine(isValidTimeZone).optional(),
});

export async function GET() {
  const authEnabled = isAuthEnabled();
  const { denied, user } = await getOptionalAuthUser("settings-preferences");
  if (denied) return denied;
  if (!user) {
    const preferences = await getUserPreferences(null);
    return NextResponse.json({ authEnabled, preferences: { ...preferences, uiLanguage: await resolveUiLanguage(null) } });
  }
  const preferences = await getUserPreferences(user.id);
  return NextResponse.json({ authEnabled, preferences: { ...preferences, uiLanguage: await resolveUiLanguage(user.id) } });
}

export async function PUT(request: Request) {
  const patch = PreferencesSchema.parse(await request.json());

  const authEnabled = isAuthEnabled();
  if (!authEnabled) {
    const preferences = { ...(await getUserPreferences(null)), uiLanguage: patch.uiLanguage ?? await resolveUiLanguage(null) };
    const response = NextResponse.json({ ok: true, authEnabled: false, preferences });
    if (patch.uiLanguage) {
      response.cookies.set(UI_LANGUAGE_COOKIE, patch.uiLanguage, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  }

  const { denied, user } = await getOptionalAuthUser("settings-preferences");
  if (denied) return denied;
  if (!user) {
    if (patch.contentLanguage || patch.timeZone) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const preferences = { ...(await getUserPreferences(null)), uiLanguage: patch.uiLanguage ?? await resolveUiLanguage(null) };
    const response = NextResponse.json({ ok: true, authEnabled: true, preferences });
    if (patch.uiLanguage) {
      response.cookies.set(UI_LANGUAGE_COOKIE, patch.uiLanguage, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  }

  const preferences = await saveUserPreferences(user.id, patch);
  const response = NextResponse.json({ ok: true, authEnabled: true, preferences });
  if (patch.uiLanguage) {
    response.cookies.set(UI_LANGUAGE_COOKIE, patch.uiLanguage, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
