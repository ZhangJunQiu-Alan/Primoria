import type { AuthUser } from "@/lib/auth/types";

export function canViewInternalAnalytics(
  user: AuthUser,
  environment: {
    nodeEnv?: string;
    enabled?: string;
    allowedEmails?: string;
  } = {
    nodeEnv: process.env.NODE_ENV,
    enabled: process.env.PRIMORIA_ENABLE_INTERNAL_ANALYTICS,
    allowedEmails: process.env.PRIMORIA_INTERNAL_EMAILS,
  },
) {
  if (environment.nodeEnv !== "production") return true;
  if (environment.enabled !== "1" || !user.email) return false;
  const allowed = new Set(
    (environment.allowedEmails ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  return allowed.has(user.email.toLowerCase());
}
