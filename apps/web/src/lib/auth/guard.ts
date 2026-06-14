import { NextResponse } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

// Returns a 401 response when the request is unauthenticated, otherwise null.
// No-op (allows the request) until Supabase env is configured — see env.ts.
// Usage:
//   const denied = await requireAuth();
//   if (denied) return denied;
export async function requireAuth(): Promise<NextResponse | null> {
  if (!supabaseEnv()) return null;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
