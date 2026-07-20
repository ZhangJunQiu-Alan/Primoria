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
| Covered school subject shared by multiple curriculum systems | Curriculum gate | Explicit goal system, then explicit learner fact, otherwise clarification |
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

## Curriculum-system gate

China senior high school, Singapore H2, Singapore lower secondary/G2/G3, and
Cambridge International A-Level are different curricula even when the subject
name is the same. The route priority is:

1. an explicit curriculum in the current goal or an explicit subject chip;
2. a learner-confirmed structured onboarding curriculum;
3. an active `profile_context` or `prior_knowledge` fact that explicitly names
   the curriculum or study jurisdiction;
4. clarification before recall, Stage 2, or course creation.

UI language, timezone, IP location, and semantic similarity are not curriculum
evidence. Region may only narrow uncommitted onboarding candidates; a single
candidate can be displayed, but Continue is still the confirmation boundary.
A Mainland China confirmed profile can therefore constrain generic
`高中数学` to `senior_secondary_mathematics`; a generic Singapore fact still
requires a choice between H2 and G2/G3 mathematics when the stage is unknown.
Conflicting explicit curriculum facts do not produce an automatic choice.

The positioning API reads confirmed structured fields first and derives a
bounded curriculum enum on the server. It never passes raw profile facts into
KG routing. During first-time onboarding, if the initial goal is waiting on
curriculum clarification, the shared readiness gate re-positions it using the
confirmed selection and persists the anchor only while the same goal is current.
Explicit curricula without a matching library graph route out of library rather
than borrowing a different school system's graph.

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

The current fixture contains 1,718 cases: 859 English and 859 Chinese, covering
all 31 runtime graphs, 579 topics, and 1,456 graph-local concepts. The generator
requires at least one English and one Chinese manual boundary case for each of
the 10 China/Singapore graphs.

Generation fails if the corpus shrinks below 1,718 cases, if a runtime graph
loses bilingual labels or required boundary coverage, or if either reported
regression changes its required policy. CI runs the validation on every pull
request. `pnpm test:learning-goal-routing` currently verifies and validates all
1,718 cases without calling a model.

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
