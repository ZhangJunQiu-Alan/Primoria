import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../src/lib/auth/password";

describe("password hashing", () => {
  it("derives and verifies PBKDF2 hashes asynchronously", async () => {
    const stored = await hashPassword("correct horse battery staple");

    expect(stored).toMatch(/^pbkdf2:sha256:210000:/);
    await expect(verifyPassword("correct horse battery staple", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", stored)).resolves.toBe(false);
  });

  it("rejects malformed stored hashes", async () => {
    await expect(verifyPassword("password", "pbkdf2:unknown:210000:salt:hash")).resolves.toBe(false);
  });
});
