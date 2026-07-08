import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  db: null as any,
  cookieSet: vi.fn(),
}));

vi.mock("../src/lib/db/client", () => ({
  getDb: () => mockState.db,
  hasDatabaseUrl: () => true,
}));

vi.mock("../src/lib/auth/password", () => ({
  hashPassword: vi.fn(() => "hashed-password"),
  verifyPassword: vi.fn(() => true),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: mockState.cookieSet,
  }),
}));

function selectRows(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({
        limit: async () => rows,
      }),
    }),
  };
}

describe("email registration", () => {
  beforeEach(() => {
    mockState.db = null;
    mockState.cookieSet.mockReset();
  });

  it("creates user, identity, and session rows inside one transaction before setting the cookie", async () => {
    const { signUpWithEmail } = await import("../src/lib/auth/accounts");
    const writes: Array<Record<string, unknown>> = [];
    let transactionCommitted = false;
    const tx = {
      select: vi.fn(() => selectRows([])),
      insert: vi.fn(() => ({
        values: vi.fn(async (values: Record<string, unknown>) => {
          writes.push(values);
        }),
      })),
    };
    mockState.db = {
      transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => {
        const result = await callback(tx);
        transactionCommitted = true;
        return result;
      }),
    };
    mockState.cookieSet.mockImplementation(() => {
      expect(transactionCommitted).toBe(true);
    });

    const user = await signUpWithEmail({ email: "User@Example.com", password: "password123", displayName: " Ada " });

    expect(user.email).toBe("user@example.com");
    expect(user.displayName).toBe("Ada");
    expect(mockState.db.transaction).toHaveBeenCalledTimes(1);
    expect(tx.insert).toHaveBeenCalledTimes(3);
    expect(writes[0]?.id).toMatch(/^usr_/);
    expect(writes[1]?.provider).toBe("email_password");
    expect(writes[1]?.providerUserId).toBe("user@example.com");
    expect(writes[2]?.id).toMatch(/^ses_/);
    expect(writes[2]?.userId).toBe(writes[0]?.id);
    expect(mockState.cookieSet).toHaveBeenCalledTimes(1);
  });

  it("maps a concurrent duplicate email insert to the existing-account error without setting a cookie", async () => {
    const { signUpWithEmail } = await import("../src/lib/auth/accounts");
    const duplicate = Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
      constraint: "identities_provider_user_uidx",
    });
    const tx = {
      select: vi.fn(() => selectRows([])),
      insert: vi.fn(() => ({
        values: vi.fn(async (values: Record<string, unknown>) => {
          if (values.provider === "email_password") throw duplicate;
        }),
      })),
    };
    mockState.db = {
      transaction: vi.fn(async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    await expect(signUpWithEmail({ email: "user@example.com", password: "password123" })).rejects.toThrow(
      "An account with this email already exists.",
    );
    expect(mockState.db.transaction).toHaveBeenCalledTimes(1);
    expect(mockState.cookieSet).not.toHaveBeenCalled();
  });
});
