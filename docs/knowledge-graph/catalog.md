# Knowledge Graph Catalog

Status: current runtime and governance inventory, October 2026.

This document separates three facts that must not be collapsed into one status:

1. whether a source graph exists;
2. whether its derived topic graph is registered for runtime use;
3. whether its source and related curriculum evidence have human-approved
   governance status.

## Current snapshot

The generated runtime registry
`apps/web/src/lib/knowledge-graph/data/topic-graphs.generated.ts` currently
contains **31 graphs, 583 topics, 1,460 graph-local concepts, and 1,387
prerequisite edges**, plus 234 approved cross-graph prerequisite edges.

- All 31 graphs have source-level `review_status: approved`: the original 21
  since 2026-07-18 and the 10 China/Singapore graphs since 2026-10-25.
- The global concept registry currently contains 1,398 canonical concepts,
  1,460 graph aliases, and 51 redirects.
- Runtime registration is still not evidence of human approval. Build and import
  paths would register a `needs_review` source graph; what governance state
  controls is *routability*, via the default-on `PRIMORIA_REQUIRE_APPROVED_KG`
  gate described under "Registration is not routability" below.

The learning-goal routing fixture (1,726 cases; permanent floor 1,718) is a
separate regression asset. It covers all 31 runtime graphs, including bilingual
labels and manual boundary coverage for the 10 China/Singapore graphs. It does
not change source approval state. See
[`learning-goal-routing.md`](learning-goal-routing.md#permanent-regression-corpus).

## Runtime graph groups

### Approved source graphs (21)

- Cambridge International A-Level: `a_level_biology`,
  `a_level_chemistry`, `a_level_mathematics`, `a_level_physics`.
- Computing and AI: `artificial_intelligence`, `computer_architecture`,
  `computer_network`, `computer_systems`,
  `data_structures_and_algorithms`, `deep_learning`,
  `introduction_to_computer_science`, `machine_learning`,
  `python_fundamentals`, `sicp_cs61a`, `software_construction`,
  `web_applications`.
- Mathematics and information: `discrete_math_and_probability`,
  `information_theory`, `linear_algebra`, `mit_calculus`,
  `numerical_analysis`.

The dated approval record for this original set is
`data/knowledge-graphs/review/approved/all-graphs/final-governance.zh-CN.md`.
It is not an approval record for the 10 graphs below.

### Approved China/Singapore graphs (10)

| Jurisdiction and level | Graph ID | Subject | Topics | Concepts | Edges |
| --- | --- | --- | ---: | ---: | ---: |
| China senior secondary | `senior_secondary_biology` | Biology | 26 | 75 | 36 |
| China senior secondary | `senior_secondary_chemistry` | Chemistry | 17 | 49 | 19 |
| China senior secondary | `senior_secondary_mathematics` | Mathematics | 27 | 71 | 54 |
| China senior secondary | `senior_secondary_physics` | Physics | 28 | 73 | 26 |
| Singapore H2 | `singapore_h2_biology` | Biology | 16 | 42 | 18 |
| Singapore H2 | `singapore_h2_chemistry` | Chemistry | 7 | 18 | 4 |
| Singapore H2 | `singapore_h2_mathematics` | Mathematics | 14 | 33 | 15 |
| Singapore H2 | `singapore_h2_physics` | Physics | 3 | 8 | 3 |
| Singapore lower secondary | `singapore_lower_secondary_science` | Science | 15 | 32 | 16 |
| Singapore secondary G2/G3 | `singapore_secondary_mathematics` | Mathematics | 20 | 56 | 39 |

Together these 10 graphs add 173 topics, 457 graph-local concepts, and 230
prerequisite edges to the runtime registry.

The project owner approved them on 2026-10-25 after an internet-verified,
item-by-item review (AI-assisted, owner-approved; 6,123 human decision records).
The China graphs now cite the 2025 daily revision of the senior-high curriculum
standards (《普通高中课程标准（2017年版2025年修订）》); the 2020 sources are
marked superseded. The review also removed a fabricated H2 Physics requirement
18(h), corrected Singapore page locators, regrouped H2 Biology into 16 topics,
and added four same-level concepts that replace mappings to H2/university
concepts. Record, pack, and removed-edge archive:
`data/knowledge-graphs/review/approved/cn-sg-2026-10/`.

They are **coverage overlays, not standalone curricula**: each was authored by
gap analysis against its official syllabus, so most of their curriculum
requirements are satisfied by approved graphs. `singapore_h2_physics` is the
clearest case — 186 of its 201 covered SEAB requirements resolve into
`a_level_physics`, and only 12 into its own 8 concepts. Measured against
*applicable* requirements (excluding outcomes deliberately routed to the
pedagogy layer), all 10 reach full coverage.

`scripts/derive-overlay-prereq-edges.mjs` derives prerequisite edges for this
batch from official syllabus outcome order, using the concept coverage already
recorded in `curricula/mappings/pending/`. It emitted 170 intra-graph edges and
337 cross-graph edges as `needs_review`. The 2026-10 review judged each one:
outcome-order adjacency alone is not a learning dependency, so 130 intra-graph
and 153 cross-graph edges were rejected and removed; the remaining 184
cross-graph edges are approved and now reach the runtime artifact
(`build-topic-graph.mjs` emits only `review_status === "approved"` cross-subject
edges). The script now refuses `--apply` against approved graphs.

## Governance corpus

- `data/knowledge-graphs/governance/` owns source provenance, licensing,
  stable canonical IDs, redirects, review policy, and decision records.
- `data/knowledge-graphs/curricula/frameworks/` contains 11 official curriculum
  representations for the China/Singapore batch.
- `data/knowledge-graphs/curricula/{mappings,gaps,resolutions}/pending/`
  contains the alignment, gap, and resolution data. Per-record `review_status`
  is authoritative, not the directory name: every record in these directories
  is `approved` since 2026-10-25. Publication of a topic-graph artifact never
  promotes them.
- `data/knowledge-graphs/pedagogy/` contains 10 curriculum-practice sets and one
  48-profile core pedagogy set, all `approved` since 2026-10-25. Approval does
  not upgrade a `diagnostic_hypothesis` into a prevalence claim; only the five
  `empirically_documented` misconceptions carry scoped study evidence.
- `data/knowledge-graphs/review/pending/` contains generated Chinese review
  packs. These are evidence views, not approval decisions; approval records live
  in `data/knowledge-graphs/review/approved/`.
- The pre-approval migration scripts (`apply-*-resolutions.mjs`,
  `upgrade-*-outcomes.mjs`, `build-cn-sg-core-pedagogy.mjs`,
  `derive-overlay-prereq-edges.mjs`) rebuild their outputs as `needs_review`, so
  `scripts/kg-approval-guard.mjs` makes them refuse to overwrite owner-approved
  files. Change approved content through a new review record.

## Remaining content-quality warnings

`pnpm --filter @primoria/web validate:kg` passes all 31 graphs and the complete
governance corpus. It still reports root-concept warnings on 9 of the 10
China/Singapore graphs (`singapore_h2_physics` does not warn). Rejecting the
adjacency-only edges raised them again: counting intra-graph edges, 56.0% of the
457 concepts are roots and 30.4% have no prerequisite in either direction;
counting the approved cross-graph edges as well, 38.5% are roots and 18.6% are
unconnected. Most of these graphs are coverage overlays whose prerequisites live
in the approved A-Level graphs, so many entry points are genuine.

The remaining warnings are content-quality signals rather than hard validation
failures. Add a prerequisite only when the dependency is real; outcome order
alone does not justify one.

`pnpm test:learning-goal-routing` verifies and validates 1,726 cases across all
31 graphs. Curriculum-specific labels prevent identically named school subjects
from collapsing into one route; a separate curriculum gate uses explicit goal
context or explicit learner facts and otherwise asks for clarification.

## Update and verification

After adding, removing, or changing a source graph:

```bash
pnpm --filter @primoria/web validate:kg
pnpm --filter @primoria/web build:topic-graph all
pnpm generate:learning-goal-routing
pnpm test:learning-goal-routing
```

`derive-overlay-prereq-edges.mjs` is kept for its dry-run/`--sample` report
only; `--apply` refuses to run against the approved graphs because it would
re-add the rejected edges as `needs_review`.

## Registration is not routability

Each runtime topic-graph artifact carries `reviewStatus` from its source
`review_status`. `listRoutableTopicGraphIds()` filters cold-start learning-goal
routing to approved graphs unless `PRIMORIA_REQUIRE_APPROVED_KG=0`.

The gate defaults **on** since 2026-10-25, when every runtime graph became
approved, so it currently excludes nothing; it protects routing from a future
`needs_review` graph. Gated-out graphs stay registered and directly resolvable, so an existing course
on one of them keeps working; only new cold-start anchoring is withheld. Guarded
by `apps/web/tests/kg-review-status-gate.spec.ts` (real registry) and
`kg-review-status-gate-fixture.spec.ts` (synthetic mixed registry).

Update this snapshot, the root `README.md`, agent guidance, current product
documents, and the dated approval record's scope note in the same change.
