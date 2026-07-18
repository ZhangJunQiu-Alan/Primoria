# Learning-goal routing and course scope

Status: current production contract, July 2026.

This document defines when Primoria should reuse a curated knowledge graph,
when it should teach only a goal-specific subgraph, and when it should create a
generated or hybrid course. Runtime code and regression fixtures remain the
highest-precedence source of truth.

## Routing policy

| Learner goal | Route | Course scope |
| --- | --- | --- |
| Broad request for one covered subject | `canonical_kg` | Full authored graph |
| Covered topic or concept | `canonical_kg` | Topic closure or hard-prerequisite concept closure |
| Covered primary subject constrained by a purpose or application context | `composed_kg` / `goal_scoped` | Minimal terminal concepts plus their hard prerequisites |
| Multiple named outcomes that one curated graph cannot cover | `hybrid_graph` | Generated goal graph; never silently relabel one library graph as full coverage |
| Healthy KG with no suitable library coverage | `generated_graph` | Governed generated graph |
| Ambiguous subject | `clarify` | No course until the subject is resolved |
| Invalid or too-vague input | `fallback` | Ask for a usable learning goal |
| KG infrastructure failure | Safe API error | Never masquerade as a coverage miss |

Application context is not permission to teach the whole source curriculum.
For example, `面向深度学习的线性代数` is anchored in the curated linear-algebra
graph but selects only the useful terminal concepts. Approved cross-subject
prerequisite edges seed deterministic targets; one-hop soft relations may add a
closely related target, and the concept-frontier builder adds only hard
prerequisites. LU decomposition, Cramer's rule, and differential equations are
therefore excluded unless the requested goal actually needs them.

`大模型架构和在AI应用中的使用` names outcomes beyond the current Deep Learning
graph. It must route to hybrid/generated course creation rather than return a
canonical course titled Deep Learning.

When no approved deterministic mapping exists, the goal-scope selector may
choose terminal concepts from one graph. `partial` coverage or an invalid model
answer fails closed into out-of-library creation; it never expands to the full
graph merely because one keyword matched.

## Persisted contract

Goal-scoped anchors carry:

- `graphId` and `startTopicId`;
- `targetConceptIds`, containing one or more terminal concepts;
- `scope` (`canonical`, `topic`, `concept`, or `goal`);
- the original `learningGoal` when `scope=goal`.

Onboarding persists the goal targets and scope in
`learner_profiles.goal_target_concept_ids` and `learner_profiles.goal_scope`.
Courses persist `courses.scope_key`. Active course reuse is unique by
`owner_id + scope_key`, not by `owner_id + graph_id`, so a canonical Linear
Algebra course and a Linear-Algebra-for-Deep-Learning course can coexist.
Migration `apps/web/drizzle/0049_quick_malcolm_colcord.sql` installs and
backfills this contract.

## Permanent regression corpus

The corpus is a permanent product contract:

- source seeds: `apps/web/tests/fixtures/learning-goal-routing.manual-seeds.v2.json`;
- generated fixture: `apps/web/tests/fixtures/learning-goal-routing.v2.json`;
- generator/invariant checks: `apps/web/scripts/generate-learning-goal-routing-dataset.ts`;
- evaluator: `apps/web/scripts/eval-learning-goal-routing.ts`.

The current fixture contains 1,252 bilingual cases across 21 graphs. Generation
fails if the corpus shrinks below 1,250 cases or if either reported regression
changes its required policy. CI runs the validation on every pull request.

```bash
# Regenerate after adding reviewed seeds or KG content.
pnpm generate:learning-goal-routing

# Free structural, policy, and deterministic course-scope gate.
pnpm test:learning-goal-routing

# Paid/configured-model evaluation; filter or limit during development.
pnpm eval:learning-goal-routing --case=<case-id>
pnpm eval:learning-goal-routing --limit=50
```

Never delete the corpus, reduce its coverage/count, weaken its gold policy, or
remove its generator/evaluator/CI gate without an explicit product decision.
