Run quality checks on the unified React app:
1. pnpm --filter @primoria/viewer-react typecheck
2. pnpm --filter @primoria/viewer-react test
3. If schema code changed, also run: pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts
Report any errors or new warnings.
