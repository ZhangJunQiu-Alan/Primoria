import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";
const deriveKey = promisify(pbkdf2);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = (await deriveKey(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)).toString("base64url");
  return `pbkdf2:${DIGEST}:${ITERATIONS}:${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [scheme, digest, iterationsRaw, salt, hash] = stored.split(":");
  if (scheme !== "pbkdf2" || !digest || !iterationsRaw || !salt || !hash) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations < 100_000) return false;
  const expected = Buffer.from(hash, "base64url");
  if (expected.length === 0) return false;
  try {
    const candidate = await deriveKey(password, salt, iterations, expected.length, digest);
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}
