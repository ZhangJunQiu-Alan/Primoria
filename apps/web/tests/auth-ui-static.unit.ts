#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

async function main() {
  const authForm = read("src/components/auth/auth-form.tsx");
  const forgotForm = read("src/components/auth/forgot-form.tsx");
  const resetPasswordForm = read("src/components/auth/reset-password-form.tsx");
  const signInPage = read("src/app/auth/sign-in/page.tsx");
  const signUpPage = read("src/app/auth/sign-up/page.tsx");
  const styles = read("src/app/globals.css");

  assert(authForm.includes('const SIGN_IN_HREF = "/auth/sign-in"'), "auth switch has stable sign-in route");
  assert(authForm.includes('const SIGN_UP_HREF = "/auth/sign-up"'), "auth switch has stable sign-up route");
  assert(!authForm.includes('isSupabaseActive ? "/signup" : "/auth/sign-in"'), "create-account link no longer loops to sign-in");
  assert(!authForm.includes('isSupabaseActive ? "/login" : "/auth/sign-up"'), "sign-in link no longer loops to sign-up");

  assert(authForm.includes("showPassword"), "password visibility state is available");
  assert(authForm.includes("PasswordVisibilityIcon"), "password visibility uses an icon component");
  assert(!authForm.includes('{showPassword ? "Hide" : "Show"}'), "password visibility control does not render the old text pill");
  assert(authForm.includes("aria-describedby=\"auth-password-hint\""), "password input is described by guidance text");
  assert(authForm.includes("role=\"alert\""), "error message is announced");
  assert(authForm.includes("role=\"status\""), "success message is announced");
  assert(!authForm.includes("auth-mode-note"), "auth mode note copy is removed from the visible form");
  assert(!authForm.includes("course-block-tag"), "form eyebrow copy is removed from login/signup");
  assert(authForm.includes('href="/forgot"'), "sign-in form exposes the password recovery route");
  assert(authForm.includes("forgotPassword"), "sign-in form renders password recovery copy");
  assert(authForm.includes("auth-hero-copy"), "hero content is wrapped in a stable layout block");
  assert(authForm.includes("className=\"auth-fields\""), "auth fields are grouped for sign-in/sign-up size parity");
  assert(authForm.includes("auth-field-spacer"), "sign-in reserves the display-name slot for seamless switching");
  assert(authForm.includes("autoComplete=\"email\""), "email input supports browser autofill");
  assert(authForm.includes("autoComplete={isSignUp ? \"new-password\" : \"current-password\"}"), "password autofill mode matches flow");

  assert(signInPage.includes('className="app-shell auth-shell"'), "sign-in page uses the focused auth shell");
  assert(!signInPage.includes("TutorNavRail"), "sign-in page does not render the disabled nav rail");
  assert(signUpPage.includes('className="app-shell auth-shell"'), "sign-up page uses the focused auth shell");
  assert(!signUpPage.includes("TutorNavRail"), "sign-up page does not render the disabled nav rail");

  for (const [name, source] of [
    ["forgot password", forgotForm],
    ["reset password", resetPasswordForm],
  ] as const) {
    assert(source.includes("<form"), `${name} page renders an active form`);
    assert(source.includes("fetch("), `${name} page calls a reset API`);
    assert(!source.includes("createClient"), `${name} page does not use the removed Supabase client`);
    assert(!source.includes("passwordRecoveryUnavailableTitle"), `${name} page no longer shows an unavailable state`);
    assert(source.includes('href="/login"'), `${name} page offers a working return-to-login action`);
  }
  assert(forgotForm.includes("/api/auth/password-reset/request"), "forgot password page requests a reset email");
  assert(resetPasswordForm.includes("/api/auth/password-reset/confirm"), "reset password page confirms the new password");

  assert(styles.includes(".auth-fields"), "auth field group has dedicated layout styling");
  assert(styles.includes(".app-shell.auth-shell"), "auth pages have a nav-free app shell");
  assert(styles.includes("align-content: center;"), "auth card centers the form group vertically");
  assert(styles.includes(".auth-field-spacer {\n  display: none;"), "sign-in does not reserve an empty display-name row");
  assert(styles.includes("place-items: center"), "auth workspace centers the fixed auth panel");
  assert(styles.includes("height: min(720px, calc(100dvh - 68px))"), "auth panel has a fixed desktop height");
  assert(styles.includes("grid-template-columns: minmax(0, 488px) minmax(0, 552px)"), "auth panel has fixed desktop columns");
  assert(styles.includes(".auth-hero-copy"), "hero content has dedicated stable layout styling");
  assert(styles.includes(".auth-secondary-action"), "secondary provider action has dedicated styling");
  assert(styles.includes(".auth-password-control"), "password control has dedicated styling");
  assert(styles.includes(".auth-password-control button svg"), "password visibility icon has dedicated styling");
  assert(styles.includes(".auth-message.success"), "success state has dedicated styling");
  assert(styles.includes(".auth-message.error"), "error state has dedicated styling");
  assert(styles.includes(":focus-visible"), "auth controls expose visible keyboard focus");
  assert(styles.includes("@media (max-width: 680px)"), "auth layout has mobile behavior");

  process.stdout.write("[auth-ui-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
