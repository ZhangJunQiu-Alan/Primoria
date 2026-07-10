// Issue 4: onboarding waits were reported at 45–90s but the code paths cannot
// explain them. Instrument first, optimize only from measured numbers.
export type ServerTiming = {
  time<T>(name: string, fn: () => Promise<T>): Promise<T>;
  header(): string;
  log(route: string): void;
};

export function createServerTiming(): ServerTiming {
  const started = performance.now();
  const entries: Array<{ name: string; ms: number }> = [];
  return {
    async time(name, fn) {
      const t0 = performance.now();
      try {
        return await fn();
      } finally {
        entries.push({ name, ms: performance.now() - t0 });
      }
    },
    header() {
      const total = { name: "total", ms: performance.now() - started };
      return [...entries, total].map((entry) => `${entry.name};dur=${entry.ms.toFixed(1)}`).join(", ");
    },
    log(route) {
      const total = (performance.now() - started).toFixed(1);
      const parts = entries.map((entry) => `${entry.name}=${entry.ms.toFixed(1)}ms`).join(" ");
      console.log(`[timing] ${route} total=${total}ms ${parts}`);
    },
  };
}
