import { NextResponse } from "next/server";
import { z } from "zod";
import { signInWithEmail } from "@/lib/auth/accounts";
import { isAuthEnabled } from "@/lib/auth/session";
import { withAuthTimeout } from "@/lib/auth/timeouts";

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Database auth is not configured. Set DATABASE_URL first." }, { status: 503 });
  }
  try {
    const body = RequestSchema.parse(await request.json());
    const user = await withAuthTimeout(signInWithEmail(body), "Sign in");
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed";
    const status = /timed out|database/i.test(message) ? 503 : /invalid|password|email/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
