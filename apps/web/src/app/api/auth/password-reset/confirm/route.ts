import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmPasswordReset } from "@/lib/auth/password-reset";
import { AUTH_UNAVAILABLE_ERROR, toSafeAuthError } from "@/lib/auth/errors";
import { authRateLimitHeaders, checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { isAuthEnabled } from "@/lib/auth/session";

const RequestSchema = z.object({
  token: z.string().min(24),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json(AUTH_UNAVAILABLE_ERROR.body, { status: AUTH_UNAVAILABLE_ERROR.status });
  }

  try {
    const body = RequestSchema.parse(await request.json());
    const rateLimit = await checkAuthRateLimit({
      headers: request.headers,
      email: body.token,
      scope: "password-reset-confirm",
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Try again later." },
        { status: 429, headers: authRateLimitHeaders(rateLimit) },
      );
    }

    await confirmPasswordReset(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = toSafeAuthError(error, "password-reset-confirm", "Password reset failed. Please try again.");
    return NextResponse.json(response.body, { status: response.status });
  }
}
