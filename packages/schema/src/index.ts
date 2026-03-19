// ─── @primoria/schema ─────────────────────────────────────────────────────────
// Single source of truth for the Primoria course JSON contract.
//
// Exports:
//   - Zod schemas + inferred TypeScript types (Course, Lesson, Page, Block, …)
//   - BLOCK_TYPES constant array + BlockType union
//   - SCHEMA_VERSION, SCHEMA_URL, SUPPORTED_VERSIONS
//   - migrateCourseJson(), parseCourse() — normalise legacy course JSON
//   - Test fixtures (FIXTURE_*)

export * from './course/index';
export * from './migrations/index';
export * from './fixtures/index';
