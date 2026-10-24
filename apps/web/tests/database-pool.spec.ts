import { afterEach, describe, expect, it, vi } from "vitest";
import { getDatabasePoolMax, isSupabaseSessionPooler } from "../src/lib/db/client";

const session = "postgresql://role.ref:pw@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=verify-full";
const transaction = "postgresql://role.ref:pw@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=verify-full";

afterEach(() => vi.unstubAllEnvs());

describe("Web database pool sizing", () => {
  it("keeps one connection on the Supabase session pooler and a normal pool elsewhere", () => {
    vi.stubEnv("DATABASE_POOL_MAX", "");
    expect(isSupabaseSessionPooler(session)).toBe(true);
    expect(isSupabaseSessionPooler(transaction)).toBe(false);
    expect(getDatabasePoolMax(session)).toBe(1);
    expect(getDatabasePoolMax(transaction)).toBe(5);
    expect(getDatabasePoolMax("postgresql://app:pw@127.0.0.1:5432/primoria")).toBe(5);
  });

  it("lets an explicit limit win, bounded to 20", () => {
    vi.stubEnv("DATABASE_POOL_MAX", "3");
    expect(getDatabasePoolMax(session)).toBe(3);
    vi.stubEnv("DATABASE_POOL_MAX", "500");
    expect(getDatabasePoolMax(transaction)).toBe(20);
  });
});
