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
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
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
    if (error.status >= 500) {
      logServerAuthError(context, error.code, error.status, error.cause);
    }
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
    logServerAuthError(context, "auth_unavailable", AUTH_UNAVAILABLE_ERROR.status, error);
    return AUTH_UNAVAILABLE_ERROR;
  }

  logServerAuthError(context, "internal_error", 500, error);
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
  const code = typeof record.code === "string" ? record.code.toUpperCase() : "";
  if (AUTH_UNAVAILABLE_ERROR_CODES.has(code)) return true;
  if (/^08[A-Z0-9]{3}$/.test(code)) return true;
  const message = typeof record.message === "string" ? record.message : "";
  if (AUTH_UNAVAILABLE_MESSAGE_CODES.some((c) => message.includes(c))) return true;
  if (Array.isArray(record.errors) && record.errors.some((item) => isAuthUnavailableError(item, depth + 1))) {
    return true;
  }
  return isAuthUnavailableError(record.cause, depth + 1);
}

function findErrorCode(error: unknown, depth = 0): string | null {
  if (!error || typeof error !== "object" || depth > 4) return null;
  const record = error as Record<string, unknown>;
  if (typeof record.code === "string" && record.code) return record.code;
  if (Array.isArray(record.errors)) {
    for (const item of record.errors) {
      const code = findErrorCode(item, depth + 1);
      if (code) return code;
    }
  }
  return findErrorCode(record.cause, depth + 1);
}

function findErrorName(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const name = (error as Record<string, unknown>).name;
  return typeof name === "string" && name ? name : null;
}

function logServerAuthError(
  context: string,
  code: AuthErrorCode,
  status: number,
  cause: unknown,
) {
  console.error(`[auth/${context}] request failed`, {
    code,
    status,
    causeCode: findErrorCode(cause),
    causeName: findErrorName(cause),
  });
}
