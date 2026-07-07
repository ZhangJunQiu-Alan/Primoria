import { NextResponse } from "next/server";
import { z } from "zod";
import { signInWithEmail } from "@/lib/auth/accounts";
import { authRateLimitHeaders, checkAuthRateLimit } from "@/lib/auth/rate-limit";
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
    const rateLimit = await withAuthTimeout(
      checkAuthRateLimit({ headers: request.headers, email: body.email }),
      "Auth rate limit",
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Try again later." },
        { status: 429, headers: authRateLimitHeaders(rateLimit) },
      );
    }

    const user = await withAuthTimeout(signInWithEmail(body), "Sign in");
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed";
    const status = /timed out|database/i.test(message) ? 503 : /invalid|password|email/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
