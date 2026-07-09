import { NextResponse } from "next/server";
import { z } from "zod";
import { signInWithEmail } from "@/lib/auth/accounts";
import { AUTH_UNAVAILABLE_ERROR, toSafeAuthError } from "@/lib/auth/errors";
import { authRateLimitHeaders, checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { isAuthEnabled } from "@/lib/auth/session";

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json(AUTH_UNAVAILABLE_ERROR.body, { status: AUTH_UNAVAILABLE_ERROR.status });
  }
  try {
    const body = RequestSchema.parse(await request.json());
    const rateLimit = await checkAuthRateLimit({ headers: request.headers, email: body.email });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Try again later." },
        { status: 429, headers: authRateLimitHeaders(rateLimit) },
      );
    }

    const user = await signInWithEmail(body);
    return NextResponse.json({ user });
  } catch (error) {
    const response = toSafeAuthError(error, "sign-in", "Sign in failed. Please try again.");
    return NextResponse.json(response.body, { status: response.status });
  }
}
