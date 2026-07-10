import { NextResponse } from "next/server";

import { toSafeAuthError } from "@/lib/auth/errors";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

export async function GET() {
  try {
    return NextResponse.json({ authEnabled: isAuthEnabled(), user: await getCurrentUser() });
  } catch (error) {
    const safe = toSafeAuthError(error, "me");
    return NextResponse.json(safe.body, { status: safe.status });
  }
}
