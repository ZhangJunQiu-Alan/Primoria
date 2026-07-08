const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type OriginValidationInput = {
  method: string;
  pathname: string;
  url: string;
  headers: Headers;
};

export type OriginValidationOptions = {
  appBaseUrl?: string;
  publicAppUrl?: string;
};

export type OriginValidationResult =
  | { ok: true }
  | { ok: false; status: 403; message: string };

export function isStateChangingMethod(method: string) {
  return STATE_CHANGING_METHODS.has(method.toUpperCase());
}

export function isOriginProtectedPath(pathname: string) {
  return pathname.startsWith("/api/") || pathname === "/auth/signout" || pathname.startsWith("/auth/signout/");
}

export function validateRequestOrigin(
  input: OriginValidationInput,
  options: OriginValidationOptions = {},
): OriginValidationResult {
  if (!isStateChangingMethod(input.method) || !isOriginProtectedPath(input.pathname)) {
    return { ok: true };
  }

  const origin = parseOrigin(input.headers.get("origin"));
  if (!origin) {
    return { ok: false, status: 403, message: "Missing Origin header." };
  }

  const allowedOrigins = getAllowedOrigins(input, options);
  if (allowedOrigins.has(origin)) return { ok: true };

  return { ok: false, status: 403, message: "Cross-origin requests are not allowed." };
}

function getAllowedOrigins(input: OriginValidationInput, options: OriginValidationOptions) {
  const origins = new Set<string>();
  addOrigin(origins, input.url);
  addOrigin(origins, buildForwardedOrigin(input));
  addOrigin(origins, options.appBaseUrl);
  addOrigin(origins, options.publicAppUrl);
  return origins;
}

function buildForwardedOrigin(input: OriginValidationInput) {
  const forwardedHost = firstHeaderValue(input.headers.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(input.headers.get("host"));
  if (!host) return null;

  const forwardedProto = firstHeaderValue(input.headers.get("x-forwarded-proto"));
  const requestProto = safeUrl(input.url)?.protocol.replace(/:$/, "");
  const proto = forwardedProto || requestProto;
  if (!proto) return null;

  return `${proto}://${host}`;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function addOrigin(origins: Set<string>, value: string | null | undefined) {
  const origin = parseOrigin(value);
  if (origin) origins.add(origin);
}

function parseOrigin(value: string | null | undefined) {
  if (!value || value === "null") return null;
  return safeUrl(value)?.origin ?? null;
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
