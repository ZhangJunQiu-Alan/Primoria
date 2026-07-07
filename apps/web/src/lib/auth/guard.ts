import { NextResponse } from "next/server";

import { isAuthBypassAllowed, supabaseEnv } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

// Returns a 401/503 response when the request must be denied, otherwise null.
// Without Supabase env the guard passes through in dev/staging only; in
// production a missing auth config fails closed — see env.ts.
// Usage:
//   const denied = await requireAuth();
//   if (denied) return denied;
export async function requireAuth(): Promise<NextResponse | null> {
  if (!supabaseEnv()) {
    if (isAuthBypassAllowed()) return null;
    return NextResponse.json({ error: "Auth is not configured" }, { status: 503 });
  }
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
