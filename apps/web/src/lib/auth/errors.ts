import { ZodError } from "zod";

export type AuthErrorCode =
  | "account_exists"
  | "auth_unavailable"
  | "email_not_configured"
  | "internal_error"
  | "invalid_credentials"
  | "invalid_email"
  | "invalid_request"
  | "invalid_reset_token"
  | "weak_password";

export type SafeAuthError = {
  status: number;
  body: {
    error: string;
    code: AuthErrorCode;
  };
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly publicMessage: string;
  readonly status: number;
  readonly cause?: unknown;

  constructor(code: AuthErrorCode, publicMessage: string, status: number, cause?: unknown) {
    super(publicMessage);
    this.name = "AuthError";
    this.code = code;
    this.publicMessage = publicMessage;
    this.status = status;
    this.cause = cause;
  }
}

const AUTH_UNAVAILABLE_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "CONNECT_TIMEOUT",
  "57P01",
  "57P02",
  "57P03",
  "53300",
]);

// Network-shaped codes worth matching inside message text as a fallback for
// drivers that embed the code in the message instead of a structured field.
const AUTH_UNAVAILABLE_MESSAGE_CODES = [
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "CONNECT_TIMEOUT",
];

export const AUTH_UNAVAILABLE_ERROR: SafeAuthError = {
  status: 503,
  body: { error: "Authentication is temporarily unavailable.", code: "auth_unavailable" },
};

export const PASSWORD_RESET_EMAIL_UNAVAILABLE_ERROR: SafeAuthError = {
  status: 503,
  body: { error: "Password reset is temporarily unavailable.", code: "email_not_configured" },
};

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function toSafeAuthError(
  error: unknown,
  context: string,
  fallbackMessage = "Authentication failed. Please try again.",
): SafeAuthError {
  if (isAuthError(error)) {
    return {
      status: error.status,
      body: { error: error.publicMessage, code: error.code },
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: { error: "Invalid request.", code: "invalid_request" },
    };
  }

  if (isAuthUnavailableError(error)) {
    console.error(`[auth/${context}] authentication dependency unavailable`, error);
    return AUTH_UNAVAILABLE_ERROR;
  }

  console.error(`[auth/${context}] unexpected error`, error);
  return {
    status: 500,
    body: { error: fallbackMessage, code: "internal_error" },
  };
}

// True when the error chain looks like "the database/network is unreachable",
// as opposed to a bad request or an application bug.
export function isAuthUnavailableError(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 4) return false;
  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : "";
  if (AUTH_UNAVAILABLE_ERROR_CODES.has(code)) return true;
  const message = typeof record.message === "string" ? record.message : "";
  if (AUTH_UNAVAILABLE_MESSAGE_CODES.some((c) => message.includes(c))) return true;
  if (Array.isArray(record.errors) && record.errors.some((item) => isAuthUnavailableError(item, depth + 1))) {
    return true;
  }
  return isAuthUnavailableError(record.cause, depth + 1);
}
