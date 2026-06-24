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
  const styles = read("src/app/globals.css");

  assert(authForm.includes('const SIGN_IN_HREF = "/auth/sign-in"'), "auth switch has stable sign-in route");
  assert(authForm.includes('const SIGN_UP_HREF = "/auth/sign-up"'), "auth switch has stable sign-up route");
  assert(!authForm.includes('isSupabaseActive ? "/signup" : "/auth/sign-in"'), "create-account link no longer loops to sign-in");
  assert(!authForm.includes('isSupabaseActive ? "/login" : "/auth/sign-up"'), "sign-in link no longer loops to sign-up");

  assert(authForm.includes("showPassword"), "password visibility state is available");
  assert(authForm.includes("aria-describedby=\"auth-password-hint\""), "password input is described by guidance text");
  assert(authForm.includes("role=\"alert\""), "error message is announced");
  assert(authForm.includes("role=\"status\""), "success message is announced");
  assert(!authForm.includes("auth-mode-note"), "auth mode note copy is removed from the visible form");
  assert(!authForm.includes("course-block-tag"), "form eyebrow copy is removed from login/signup");
  assert(authForm.includes("auth-hero-copy"), "hero content is wrapped in a stable layout block");
  assert(authForm.includes("className=\"auth-fields\""), "auth fields are grouped for sign-in/sign-up size parity");
  assert(authForm.includes("auth-field-spacer"), "sign-in reserves the display-name slot for seamless switching");
  assert(authForm.includes("autoComplete=\"email\""), "email input supports browser autofill");
  assert(authForm.includes("autoComplete={isSignUp ? \"new-password\" : \"current-password\"}"), "password autofill mode matches flow");

  assert(styles.includes(".auth-fields"), "auth field group has dedicated layout styling");
  assert(styles.includes("grid-template-rows: repeat(3, minmax(76px, auto))"), "auth field group keeps matching desktop rows");
  assert(styles.includes("place-items: center"), "auth workspace centers the fixed auth panel");
  assert(styles.includes("height: min(720px, calc(100dvh - 68px))"), "auth panel has a fixed desktop height");
  assert(styles.includes("grid-template-columns: minmax(0, 488px) minmax(0, 552px)"), "auth panel has fixed desktop columns");
  assert(styles.includes(".auth-hero-copy"), "hero content has dedicated stable layout styling");
  assert(styles.includes(".auth-secondary-action"), "secondary provider action has dedicated styling");
  assert(styles.includes(".auth-password-control"), "password control has dedicated styling");
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
