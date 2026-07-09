import { NextResponse } from "next/server";
import { z } from "zod";
import { PASSWORD_RESET_GENERIC_MESSAGE, requestPasswordReset } from "@/lib/auth/password-reset";
import { AUTH_UNAVAILABLE_ERROR, PASSWORD_RESET_EMAIL_UNAVAILABLE_ERROR, toSafeAuthError } from "@/lib/auth/errors";
import { authRateLimitHeaders, checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { isAuthEnabled } from "@/lib/auth/session";
import { isPasswordResetEmailConfigured } from "@/lib/email/password-reset";

const RequestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json(AUTH_UNAVAILABLE_ERROR.body, { status: AUTH_UNAVAILABLE_ERROR.status });
  }
  if (!isPasswordResetEmailConfigured()) {
    return NextResponse.json(PASSWORD_RESET_EMAIL_UNAVAILABLE_ERROR.body, {
      status: PASSWORD_RESET_EMAIL_UNAVAILABLE_ERROR.status,
    });
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
    const response = toSafeAuthError(error, "password-reset-request", "Password reset request failed. Please try again.");
    return NextResponse.json(response.body, { status: response.status });
  }
}
