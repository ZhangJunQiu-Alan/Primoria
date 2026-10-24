# Visualization build records · 2026-10

Dated records of the two-Agent visualization build (instructions, handoffs,
platform validation, human acceptance). They are history, not runtime contracts;
the current contract is [`交互组件规范.md`](../../交互组件规范.md) and the open
work is tracked in [`visualization-full-coverage-execution.md`](../../visualization-full-coverage-execution.md).

## Status addendum · 2026-10-24

The original evidence below is kept as written. Since then:

- Batches 009/010/011 (`math.parabola-intersections`, `physics.wire-resistance`,
  `physics.closed-circuit`, `chinese.poetry-imagery`) are registered in
  production; the catalog has 49 implemented components.
- Logs these records cite under `/tmp` were local to the build machine and are
  not retained. Treat them as unreproducible; re-run the named commands instead.
- `artifacts/` (replay bundles, screenshots, review evidence) is no longer
  tracked in Git. The reference-site inventory and its raw observation evidence
  moved to the gitignored `.private/visualization-reference/`.
- The fixed 20-prompt result (16 passed / 4 failed on the 38-item catalog) and
  the unverified full-reference coverage (0 verified mappings) are unchanged.
