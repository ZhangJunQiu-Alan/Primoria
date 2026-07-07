import { afterEach, describe, expect, it } from "vitest";
import { getDatabaseSsl, getNodePostgresSsl } from "../src/lib/db/ssl";

const originalDatabaseSsl = process.env.DATABASE_SSL;

function setDatabaseSsl(value: string | undefined) {
  if (value === undefined) {
    delete process.env.DATABASE_SSL;
  } else {
    process.env.DATABASE_SSL = value;
  }
}

afterEach(() => {
  setDatabaseSsl(originalDatabaseSsl);
});

describe("database SSL settings", () => {
  it("preserves the driver default when DATABASE_SSL is unset", () => {
    setDatabaseSsl(undefined);

    expect(getDatabaseSsl()).toBeUndefined();
    expect(getNodePostgresSsl()).toBeUndefined();
  });

  it("explicitly disables SSL with DATABASE_SSL=false", () => {
    setDatabaseSsl("false");

    expect(getDatabaseSsl()).toBe(false);
    expect(getNodePostgresSsl()).toBeUndefined();
  });

  it("enables required SSL with DATABASE_SSL=require", () => {
    setDatabaseSsl("require");

    expect(getDatabaseSsl()).toBe("require");
    expect(getNodePostgresSsl()).toEqual({ rejectUnauthorized: false });
  });

  it("verifies certificates with DATABASE_SSL=verify-full", () => {
    setDatabaseSsl("verify-full");

    expect(getDatabaseSsl()).toBe("verify-full");
    expect(getNodePostgresSsl()).toEqual({ rejectUnauthorized: true });
  });

  it("rejects invalid SSL modes", () => {
    setDatabaseSsl("invalid");

    expect(() => getDatabaseSsl()).toThrow(/DATABASE_SSL must be one of/);
  });
});
