import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("base64url");
  return `pbkdf2:${DIGEST}:${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [scheme, digest, iterationsRaw, salt, hash] = stored.split(":");
  if (scheme !== "pbkdf2" || !digest || !iterationsRaw || !salt || !hash) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations < 100_000) return false;
  const candidate = pbkdf2Sync(password, salt, iterations, Buffer.from(hash, "base64url").length, digest).toString("base64url");
  const a = Buffer.from(candidate);
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
