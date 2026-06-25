#!/usr/bin/env tsx

import { runnableLanguage } from "../src/lib/code-runner/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function main() {
  // Python aliases normalize to "python".
  for (const tag of ["python", "Python", "PY", " py ", "python3"]) {
    assert(runnableLanguage(tag) === "python", `${tag} -> python`);
  }
  // JS aliases normalize to "javascript".
  for (const tag of ["javascript", "JavaScript", "js", "node", "nodejs"]) {
    assert(runnableLanguage(tag) === "javascript", `${tag} -> javascript`);
  }
  // Non-runnable languages return null (no Run button).
  for (const tag of ["c", "cpp", "sql", "pseudocode", "java", "rust", "", undefined, null]) {
    assert(runnableLanguage(tag as string) === null, `${String(tag)} -> null`);
  }

  console.log("code-block-runner.unit: OK");
}

main();
