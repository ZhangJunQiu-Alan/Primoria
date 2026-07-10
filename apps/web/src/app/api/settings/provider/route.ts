import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalAuthUser, requireConfiguredAuthUser } from "@/lib/auth/guard";
import { isAuthEnabled } from "@/lib/auth/session";
import { getProviderSettings, saveProviderSettings } from "@/lib/settings/user-settings";

const SettingsSchema = z.object({
  provider: z.enum(["openai-compatible", "anthropic-compatible"]).optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export async function GET() {
  const authEnabled = isAuthEnabled();
  const { denied, user } = await getOptionalAuthUser("settings-provider");
  if (denied) return denied;
  if (!user) return NextResponse.json({ authEnabled, settings: {} });
  return NextResponse.json({ authEnabled, settings: await getProviderSettings(user.id) });
}

export async function PUT(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("settings-provider");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = SettingsSchema.parse(await request.json());
  return NextResponse.json({ ok: true, settings: await saveProviderSettings(user.id, settings) });
}
