import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmPasswordReset } from "@/lib/auth/password-reset";
import { authRateLimitHeaders, checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { isAuthEnabled } from "@/lib/auth/session";
import { withAuthTimeout } from "@/lib/auth/timeouts";

const RequestSchema = z.object({
  token: z.string().min(24),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Database auth is not configured. Set DATABASE_URL first." }, { status: 503 });
  }

  try {
    const body = RequestSchema.parse(await request.json());
    const rateLimit = await withAuthTimeout(
      checkAuthRateLimit({ headers: request.headers, email: body.token, scope: "password-reset-confirm" }),
      "Password reset rate limit",
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Try again later." },
        { status: 429, headers: authRateLimitHeaders(rateLimit) },
      );
    }

    await withAuthTimeout(confirmPasswordReset(body), "Password reset confirmation");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset failed";
    const status = /timed out|database/i.test(message) ? 503 : /invalid|expired|password/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
