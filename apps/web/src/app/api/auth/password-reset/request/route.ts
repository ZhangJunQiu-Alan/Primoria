import { NextResponse } from "next/server";
import { z } from "zod";
import { PASSWORD_RESET_GENERIC_MESSAGE, requestPasswordReset } from "@/lib/auth/password-reset";
import { authRateLimitHeaders, checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { isAuthEnabled } from "@/lib/auth/session";
import { isPasswordResetEmailConfigured } from "@/lib/email/password-reset";

const RequestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Database auth is not configured. Set DATABASE_URL first." }, { status: 503 });
  }
  if (!isPasswordResetEmailConfigured()) {
    return NextResponse.json({ error: "Password reset email is not configured." }, { status: 503 });
  }

  try {
    const body = RequestSchema.parse(await request.json());
    const rateLimit = await checkAuthRateLimit({
      headers: request.headers,
      email: body.email,
      scope: "password-reset-request",
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Try again later." },
        { status: 429, headers: authRateLimitHeaders(rateLimit) },
      );
    }

    try {
      await requestPasswordReset(body.email);
    } catch (error) {
      console.error("[auth/password-reset] failed to send reset email", error);
    }

    return NextResponse.json({ ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset request failed";
    const status = /timed out|database/i.test(message) ? 503 : /email|invalid/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
