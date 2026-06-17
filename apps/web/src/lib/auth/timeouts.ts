const DEFAULT_AUTH_TIMEOUT_MS = 25_000;

export function getAuthTimeoutMs() {
  const configured = Number(process.env.AUTH_REQUEST_TIMEOUT_MS ?? "");
  if (Number.isFinite(configured) && configured > 0) return Math.min(Math.floor(configured), 30_000);
  return DEFAULT_AUTH_TIMEOUT_MS;
}

export function withAuthTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out while connecting to the database.`)), getAuthTimeoutMs());
    }),
  ]);
}
