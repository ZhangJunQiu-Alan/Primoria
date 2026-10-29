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
  const authLayout = read("src/components/auth/auth-layout.tsx");
  const authPlate = read("src/components/auth/auth-plate.tsx");
  const forgotForm = read("src/components/auth/forgot-form.tsx");
  const resetPasswordForm = read("src/components/auth/reset-password-form.tsx");
  const signInPage = read("src/app/auth/sign-in/page.tsx");
  const signUpPage = read("src/app/auth/sign-up/page.tsx");
  const loginPage = read("src/app/login/page.tsx");
  const signupPage = read("src/app/signup/page.tsx");
  const styles = read("src/app/globals.css");

  assert(authForm.includes('const SIGN_IN_HREF = "/auth/sign-in"'), "auth switch has stable sign-in route");
  assert(authForm.includes('const SIGN_UP_HREF = "/auth/sign-up"'), "auth switch has stable sign-up route");
  assert(authForm.includes("new URLSearchParams({ next })"), "auth mode switching preserves the intended destination");
  assert(!authForm.includes('isSupabaseActive ? "/signup" : "/auth/sign-in"'), "create-account link no longer loops to sign-in");
  assert(!authForm.includes('isSupabaseActive ? "/login" : "/auth/sign-up"'), "sign-in link no longer loops to sign-up");

  assert(authForm.includes("<PasswordInput"), "auth form uses the shared password input");
  assert(authLayout.includes("t.auth.showPassword") && authLayout.includes("aria-pressed={visible}"), "password visibility toggle is labelled and exposes its state");
  assert(authForm.includes('describedBy={isSignUp ? "auth-password-hint" : undefined}'), "sign-up password input is described by the length hint");
  assert(authLayout.includes("aria-describedby={describedBy}"), "password input forwards its description");
  assert(authLayout.includes('role="alert"'), "error message is announced");
  assert(authForm.includes('role="status"'), "success message is announced");
  assert(authForm.includes("accountCreatedRedirecting"), "successful registration announces destination navigation");
  assert(authForm.includes("signedInRedirecting"), "successful sign-in announces destination navigation");
  assert(authForm.includes("router.refresh()"), "successful auth refreshes RSC state after setting the session cookie");
  assert(!authForm.includes("finally {\n      setPending(false)"), "successful auth keeps the form pending until navigation commits");
  assert(!authForm.includes("auth-mode-note"), "auth mode note copy is removed from the visible form");
  assert(!authForm.includes("course-block-tag"), "form eyebrow copy is removed from login/signup");
  assert(!authForm.includes("auth-mode-switch"), "the duplicate sign-in/create-account segmented switch is gone");
  assert(authForm.includes('href="/forgot"'), "sign-in form exposes the password recovery route");
  assert(authForm.includes("forgotPassword"), "sign-in form renders password recovery copy");
  assert(authForm.includes('autoComplete="email"'), "email input supports browser autofill");
  assert(authForm.includes('autoComplete={isSignUp ? "new-password" : "current-password"}'), "password autofill mode matches flow");
  assert(authForm.includes("<AuthLayout plate={normalizedMode}>"), "sign-in and sign-up pick their own plate");
  for (const source of [authForm, authLayout]) {
    assert(!source.includes("LanguageToggle") && !source.includes("LanguageSwitcher"), "auth pages leave language switching to the landing page");
  }
  assert(authPlate.includes('aria-hidden="true"'), "the illustrative plate is hidden from assistive technology");
  assert(authPlate.includes("usePrefersReducedMotion"), "the sign-up preview stops autoplay under reduced motion");

  assert(signInPage.includes('className="app-shell auth-shell"'), "sign-in page uses the focused auth shell");
  assert(!signInPage.includes("TutorNavRail"), "sign-in page does not render the disabled nav rail");
  assert(signUpPage.includes('className="app-shell auth-shell"'), "sign-up page uses the focused auth shell");
  assert(!signUpPage.includes("TutorNavRail"), "sign-up page does not render the disabled nav rail");
  assert(loginPage.includes('className="app-shell auth-shell"'), "login alias uses the same auth shell");
  assert(signupPage.includes('className="app-shell auth-shell"'), "signup alias uses the same auth shell");

  for (const [name, source] of [
    ["forgot password", forgotForm],
    ["reset password", resetPasswordForm],
  ] as const) {
    assert(source.includes("<form"), `${name} page renders an active form`);
    assert(source.includes("fetch("), `${name} page calls a reset API`);
    assert(!source.includes("createClient"), `${name} page does not use the removed Supabase client`);
    assert(!source.includes("passwordRecoveryUnavailableTitle"), `${name} page no longer shows an unavailable state`);
    assert(source.includes("<AuthBackLink />"), `${name} page offers a return-to-login action`);
  }
  assert(authLayout.includes('href="/login"'), "the return-to-login action points at the login route");
  assert(forgotForm.includes("/api/auth/password-reset/request"), "forgot password page requests a reset email");
  assert(resetPasswordForm.includes("/api/auth/password-reset/confirm"), "reset password page confirms the new password");

  assert(styles.includes(".app-shell.auth-shell"), "auth pages have a nav-free app shell");
  assert(styles.includes(".auth-page {\n  min-height: 100%;"), "auth page fills the scroll container");
  assert(styles.includes("grid-template-columns: minmax(440px, 520px) minmax(0, 1fr);"), "desktop splits a form column from the plate");
  assert(styles.includes(".auth-password button"), "password visibility toggle has dedicated styling");
  assert(styles.includes(".auth-alert {"), "error state has dedicated styling");
  assert(styles.includes(".auth-status {"), "success state has dedicated styling");
  assert(styles.includes(".auth-workspace :is(a, button, input):focus-visible"), "auth controls expose visible keyboard focus");
  assert(styles.includes("@media (max-width: 1180px) {\n  .auth-page {"), "narrow screens drop the plate and keep the form");

  process.stdout.write("[auth-ui-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
