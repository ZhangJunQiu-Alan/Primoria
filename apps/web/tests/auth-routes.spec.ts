import { describe, expect, it } from "vitest";

import { APP_HOME_PATH, PUBLIC_LANDING_PATH, isPublicPath, loginPathWithNext } from "../src/lib/auth/routes";

describe("auth route policy", () => {
  it("keeps the app home gated while exposing the welcome landing page", () => {
    expect(APP_HOME_PATH).toBe("/");
    expect(PUBLIC_LANDING_PATH).toBe("/welcome");
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/library")).toBe(false);
    expect(isPublicPath("/welcome")).toBe(true);
    expect(isPublicPath("/welcome/")).toBe(true);
  });

  it("keeps auth entry routes public and builds login next redirects", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/sign-in")).toBe(true);
    expect(isPublicPath("/forgot")).toBe(true);
    expect(loginPathWithNext(APP_HOME_PATH)).toBe("/login?next=%2F");
  });
});
