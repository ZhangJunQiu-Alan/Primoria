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
contains **31 graphs, 579 topics, 1,456 graph-local concepts, and 1,336
prerequisite edges**.

- 21 graphs have source-level `review_status: approved`.
- 10 China/Singapore graphs have runtime artifacts and registry entries, but
  their source-level `review_status` remains `needs_review`.
- The global concept registry currently contains 1,394 canonical concepts,
  1,456 graph aliases, and 51 redirects.
- Runtime registration is not evidence of human approval. The current build and
  import paths do not automatically exclude a source graph because it is
  `needs_review`.

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
| China senior secondary | `senior_secondary_biology` | Biology | 26 | 75 | 29 |
| China senior secondary | `senior_secondary_chemistry` | Chemistry | 17 | 49 | 16 |
| China senior secondary | `senior_secondary_mathematics` | Mathematics | 27 | 70 | 46 |
| China senior secondary | `senior_secondary_physics` | Physics | 28 | 73 | 18 |
| Singapore H2 | `singapore_h2_biology` | Biology | 14 | 42 | 18 |
| Singapore H2 | `singapore_h2_chemistry` | Chemistry | 7 | 18 | 5 |
| Singapore H2 | `singapore_h2_mathematics` | Mathematics | 14 | 33 | 12 |
| Singapore H2 | `singapore_h2_physics` | Physics | 3 | 8 | 2 |
| Singapore lower secondary | `singapore_lower_secondary_science` | Science | 15 | 32 | 15 |
| Singapore secondary G2/G3 | `singapore_secondary_mathematics` | Mathematics | 18 | 53 | 18 |

Together these 10 graphs add 169 topics, 453 graph-local concepts, and 179
prerequisite edges to the runtime registry.

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
governance corpus. It also reports high root-concept counts for every new graph,
ranging from 6/8 roots in `singapore_h2_physics` to 56/73 in
`senior_secondary_physics`. These are content-quality warnings rather than hard
validation failures; subject review should either add justified prerequisite
coverage or explicitly accept the entry points.

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

Update this snapshot, the root `README.md`, agent guidance, current product
documents, and the dated approval record's scope note in the same change.
