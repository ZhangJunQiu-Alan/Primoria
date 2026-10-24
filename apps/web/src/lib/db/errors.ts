// PostgreSQL error inspection. drizzle-orm (0.44+) wraps driver failures in a
// DrizzleQueryError whose `cause` is the postgres-js error, so the SQLSTATE
// code and constraint name are not on the thrown error itself.

type PostgresError = { code?: unknown; constraint_name?: unknown; constraint?: unknown };

export function postgresErrorOf(error: unknown): PostgresError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const candidate = current as PostgresError & { cause?: unknown };
    if (typeof candidate.code === "string") return candidate;
    current = candidate.cause;
  }
  return null;
}

/** True for a unique violation (23505), optionally of one named constraint. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const pg = postgresErrorOf(error);
  if (pg?.code !== "23505") return false;
  if (!constraint) return true;
  return pg.constraint_name === constraint || pg.constraint === constraint;
}
