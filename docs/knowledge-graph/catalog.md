# Knowledge Graph Catalog

Status: current runtime and governance inventory, July 2026.

This document separates three facts that must not be collapsed into one status:

1. whether a source graph exists;
2. whether its derived topic graph is registered for runtime use;
3. whether its source and related curriculum evidence have human-approved
   governance status.

## Current snapshot

The generated runtime registry
`apps/web/src/lib/knowledge-graph/data/topic-graphs.generated.ts` currently
contains **31 graphs, 579 topics, 1,456 graph-local concepts, and 1,506
prerequisite edges**.

- 21 graphs have source-level `review_status: approved`.
- 10 China/Singapore graphs have runtime artifacts and registry entries, but
  their source-level `review_status` remains `needs_review`.
- The global concept registry currently contains 1,394 canonical concepts,
  1,456 graph aliases, and 51 redirects.
- Runtime registration is not evidence of human approval. Build and import paths
  still register a `needs_review` source graph; what governance state now
  controls is *routability*, via the opt-in `PRIMORIA_REQUIRE_APPROVED_KG` gate
  described under "Registration is not routability" below.

The 1,718-case learning-goal routing fixture is a separate regression asset. It
covers all 31 runtime graphs, including bilingual labels and manual boundary
coverage for the 10 China/Singapore graphs. This does not change their source
approval state. See
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

### Runtime-registered China/Singapore graphs still needing review (10)

| Jurisdiction and level | Graph ID | Subject | Topics | Concepts | Edges |
| --- | --- | --- | ---: | ---: | ---: |
| China senior secondary | `senior_secondary_biology` | Biology | 26 | 75 | 50 |
| China senior secondary | `senior_secondary_chemistry` | Chemistry | 17 | 49 | 34 |
| China senior secondary | `senior_secondary_mathematics` | Mathematics | 27 | 70 | 79 |
| China senior secondary | `senior_secondary_physics` | Physics | 28 | 73 | 48 |
| Singapore H2 | `singapore_h2_biology` | Biology | 14 | 42 | 31 |
| Singapore H2 | `singapore_h2_chemistry` | Chemistry | 7 | 18 | 6 |
| Singapore H2 | `singapore_h2_mathematics` | Mathematics | 14 | 33 | 20 |
| Singapore H2 | `singapore_h2_physics` | Physics | 3 | 8 | 4 |
| Singapore lower secondary | `singapore_lower_secondary_science` | Science | 15 | 32 | 19 |
| Singapore secondary G2/G3 | `singapore_secondary_mathematics` | Mathematics | 18 | 53 | 58 |

Together these 10 graphs add 169 topics, 453 graph-local concepts, and 349
prerequisite edges to the runtime registry.

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
337 cross-graph edges, all `needs_review`. The cross-graph edges are inert until
approved because `build-topic-graph.mjs` filters cross-subject edges to
`review_status === "approved"`. Edges are only emitted when they agree with the
graph's authored teaching order; a backward dependency needs a human author.

## Governance corpus

- `data/knowledge-graphs/governance/` owns source provenance, licensing,
  stable canonical IDs, redirects, review policy, and decision records.
- `data/knowledge-graphs/curricula/frameworks/` contains 11 official curriculum
  representations for the China/Singapore batch.
- `data/knowledge-graphs/curricula/{mappings,gaps,resolutions}/pending/`
  contains the reviewable alignment, gap, and resolution data. Directory and
  per-record status remain authoritative; publication of a topic-graph artifact
  does not promote them.
- `data/knowledge-graphs/pedagogy/` contains 10 curriculum-practice sets and one
  48-profile core pedagogy set. The core set remains `needs_review`; its
  diagnostic hypotheses must not be presented as prevalence claims.
- `data/knowledge-graphs/review/pending/` contains generated Chinese review
  packs. These are evidence views, not approval decisions.

## Remaining content-quality warnings

`pnpm --filter @primoria/web validate:kg` passes all 31 graphs and the complete
governance corpus. It still reports root-concept warnings on the overlay batch,
but the syllabus-derived edges cut them substantially: across the 10 graphs root
concepts fell from 64.9% to 42.8% and concepts with no prerequisite in either
direction from 39.9% to 17.2%, while the longest prerequisite chain grew from 3.4
to 7.9 (the 21 approved graphs sit at 8.6%, 0.6% and 10.1). `singapore_h2_physics`
no longer warns at all.

Those figures count intra-graph edges only. The 337 cross-graph edges are
`needs_review` and therefore excluded from the runtime artifact; once approved,
concepts with no prerequisite in either direction drop to about 2.2%.

The remaining warnings are content-quality signals rather than hard validation
failures; subject review should either add justified prerequisite coverage or
explicitly accept the entry points.

`pnpm test:learning-goal-routing` verifies and validates 1,718 cases across all
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

To re-derive overlay prerequisite edges from official syllabus outcome order
(dry run first; the script is idempotent and never re-adds an existing edge):

```bash
node apps/web/scripts/derive-overlay-prereq-edges.mjs --sample
node apps/web/scripts/derive-overlay-prereq-edges.mjs --apply
```

## Registration is not routability

Each runtime topic-graph artifact carries `reviewStatus` from its source
`review_status`. `listRoutableTopicGraphIds()` filters cold-start learning-goal
routing to approved graphs when `PRIMORIA_REQUIRE_APPROVED_KG=1`.

The gate defaults **off**. These 10 graphs are currently the only source of
China/Singapore coverage, so enabling it today would remove that coverage rather
than improve it. Enable it once the cross-graph edges are approved. Gated-out
graphs stay registered and directly resolvable, so an existing course on one of
them keeps working; only new cold-start anchoring is withheld. Guarded by
`apps/web/tests/kg-review-status-gate.spec.ts`.

Update this snapshot, the root `README.md`, agent guidance, current product
documents, and the dated approval record's scope note in the same change.
