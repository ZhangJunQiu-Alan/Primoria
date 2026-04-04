const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Tiny crypto-random ID generator — no external dependency needed. */
export function nanoid(size = 21): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join('');
}
