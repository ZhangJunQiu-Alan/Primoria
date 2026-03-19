/** Canonical schema version written to every exported course JSON. */
export const SCHEMA_VERSION = '1.0.0' as const;

export const SCHEMA_URL = 'https://primoria.com/course-schema/v1.json' as const;

/** All schema versions this package can read/migrate. */
export const SUPPORTED_VERSIONS = ['1.0.0'] as const satisfies readonly string[];

export type SchemaVersion = (typeof SUPPORTED_VERSIONS)[number];
