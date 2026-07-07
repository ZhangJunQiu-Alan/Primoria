export type DatabaseSslMode = false | "require" | "allow" | "prefer" | "verify-full";

const SSL_DISABLED_VALUES = new Set(["0", "false", "disable", "disabled", "off", "none", "no"]);
const SSL_REQUIRED_VALUES = new Set(["1", "true", "enable", "enabled", "on", "yes", "require", "required"]);
const POSTGRES_JS_SSL_MODES = new Set(["allow", "prefer", "verify-full"]);

export function getDatabaseSsl(): DatabaseSslMode | undefined {
  const configured = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (!configured) return undefined;

  if (SSL_DISABLED_VALUES.has(configured)) return false;
  if (SSL_REQUIRED_VALUES.has(configured)) return "require";
  if (POSTGRES_JS_SSL_MODES.has(configured)) return configured as DatabaseSslMode;

  throw new Error("DATABASE_SSL must be one of: false, true, require, allow, prefer, verify-full.");
}

export function getNodePostgresSsl(): undefined | { rejectUnauthorized: boolean } {
  const ssl = getDatabaseSsl();
  if (!ssl) return undefined;

  // Managed Postgres often requires SSL but does not always provide a CA bundle
  // to the app runtime. Use verify-full only when certificate verification is
  // explicitly requested.
  return { rejectUnauthorized: ssl === "verify-full" };
}
