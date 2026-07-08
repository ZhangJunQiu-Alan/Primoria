import { NextResponse } from "next/server";
import { z } from "zod";
import { signUpWithEmail } from "@/lib/auth/accounts";
import { authRateLimitHeaders, checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { isAuthEnabled } from "@/lib/auth/session";

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Database auth is not configured. Set DATABASE_URL first." }, { status: 503 });
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
    const message = error instanceof Error ? error.message : "Sign up failed";
    const status = /timed out|database/i.test(message) ? 503 : /already exists|invalid|password|email/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
