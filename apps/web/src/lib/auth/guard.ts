import { NextResponse } from "next/server";

import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";

// Returns a 401/503 response when the request must be denied, otherwise null.
// Local development can run without DATABASE_URL; production must fail closed.
// Usage:
//   const denied = await requireAuth();
//   if (denied) return denied;
export async function requireAuth(): Promise<NextResponse | null> {
  const { denied } = await requireAuthUser();
  return denied;
}

export async function requireAuthUser(): Promise<{ denied: NextResponse | null; user: AuthUser | null }> {
  if (!isAuthEnabled()) {
    if (process.env.NODE_ENV !== "production") return { denied: null, user: null };
    return {
      denied: NextResponse.json({ error: "Auth is not configured" }, { status: 503 }),
      user: null,
    };
  }
  const user = await getCurrentUser();
  if (!user) {
    return {
      denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }
  return { denied: null, user };
}
