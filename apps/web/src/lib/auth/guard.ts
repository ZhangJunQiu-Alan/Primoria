import { NextResponse } from "next/server";

import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

// Returns a 401/503 response when the request must be denied, otherwise null.
// Local development can run without DATABASE_URL; production must fail closed.
// Usage:
//   const denied = await requireAuth();
//   if (denied) return denied;
export async function requireAuth(): Promise<NextResponse | null> {
  if (!isAuthEnabled()) {
    if (process.env.NODE_ENV !== "production") return null;
    return NextResponse.json({ error: "Auth is not configured" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
