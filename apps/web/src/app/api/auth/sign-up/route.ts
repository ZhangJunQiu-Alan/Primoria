import { NextResponse } from "next/server";
import { z } from "zod";
import { signUpWithEmail } from "@/lib/auth/accounts";
import { AUTH_UNAVAILABLE_ERROR, toSafeAuthError } from "@/lib/auth/errors";
import { authRateLimitHeaders, checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { isAuthEnabled } from "@/lib/auth/session";

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
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
        { error: "Too many sign-up attempts. Try again later." },
        { status: 429, headers: authRateLimitHeaders(rateLimit) },
      );
    }

    const user = await signUpWithEmail(body);
    return NextResponse.json({ user });
  } catch (error) {
    const response = toSafeAuthError(error, "sign-up", "Sign up failed. Please try again.");
    return NextResponse.json(response.body, { status: response.status });
  }
}
