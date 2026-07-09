export const APP_HOME_PATH = "/";
export const PUBLIC_LANDING_PATH = "/welcome";
export const LOGIN_PATH = "/login";

export const PUBLIC_ROUTE_PATTERNS: readonly RegExp[] = [
  new RegExp(`^${PUBLIC_LANDING_PATH}/?$`),
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /^\/auth\/sign-in(\/|$)/,
  /^\/auth\/sign-up(\/|$)/,
  /^\/auth\/callback(\/|$)/,
  /^\/forgot(\/|$)/,
  /^\/reset-password(\/|$)/,
  /^\/dev\/onboarding(\/|$)/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function loginPathWithNext(next: string): string {
  const params = new URLSearchParams({ next });
  return `${LOGIN_PATH}?${params.toString()}`;
}
