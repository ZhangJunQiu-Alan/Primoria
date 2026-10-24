import { describe, expect, it } from "vitest";

import { isUniqueViolation, postgresErrorOf } from "../src/lib/db/errors";

describe("postgres error inspection", () => {
  const driverError = Object.assign(new Error("duplicate key"), { code: "23505", constraint_name: "material_folders_owner_name_uidx" });
  // drizzle-orm 0.44+ shape: the driver error is the cause.
  const wrapped = Object.assign(new Error("Failed query: insert ..."), { cause: driverError });

  it("finds the driver error directly or behind a Drizzle wrapper", () => {
    expect(postgresErrorOf(driverError)).toBe(driverError);
    expect(postgresErrorOf(wrapped)).toBe(driverError);
    expect(postgresErrorOf(new Error("plain"))).toBeNull();
    expect(postgresErrorOf(null)).toBeNull();
  });

  it("matches unique violations, optionally by constraint", () => {
    expect(isUniqueViolation(wrapped)).toBe(true);
    expect(isUniqueViolation(wrapped, "material_folders_owner_name_uidx")).toBe(true);
    expect(isUniqueViolation(wrapped, "courses_owner_scope_uidx")).toBe(false);
    expect(isUniqueViolation(Object.assign(new Error("fk"), { cause: { code: "23503" } }))).toBe(false);
    // Hand-built errors in older tests name the constraint as `constraint`.
    expect(isUniqueViolation({ code: "23505", constraint: "identities_provider_user_uidx" }, "identities_provider_user_uidx")).toBe(true);
  });
});
