# Teaching-Method Experiment

How Primoria measures which delivery form actually helps a learner, and why the
measurement is built as a randomized assignment rather than an analysis of the
planner's own choices.

## The problem this solves

`decideNextStep` decides *which concept* a learner meets next. Nothing decides
*which teaching form* they meet it in, because nothing measures which form works.
`docs/long-horizon-learning-principles.md` names this gap three times, and the P0
acceptance target in `docs/issue-taxonomy-and-roadmap.md` closes on it: *later
evidence proves whether the intervention helped*.

The tempting shortcut is to aggregate what the planner already does — count how
concepts taught with an analogy score against concepts taught without one. That
answer is wrong in a specific and costly way. The planner picks a form *from the
concept*: it reaches for an analogy exactly when a concept is hard or
misconception-prone. Aggregating its choices measures concept difficulty and
labels the result "analogy". More data makes the wrong conclusion more
confident, never more correct.

Randomizing the form inside a slot the planner already judged eligible removes
that link. Both arms then draw from the same pool of concepts and learners, so a
difference between them is attributable to the form.

## What is randomized

Assignment **swaps a form in place**. It never adds or drops a block, because the
compiler bounds block count (`expectedBlockRange`), media density (30–45%), and
per-concept explanation/example coverage — dropping blocks violates all three.
Swapping within a media class holds every one of those invariants by
construction.

| Factor | Arms | Eligible roles |
| --- | --- | --- |
| `explanation_form` | `text` ↔ `analogy` | explanation, example, deepening, misconception |
| `media_form` | `image` ↔ `visual` | example, deepening |

Both forms in a factor sit in the same media class, so density is unchanged.
`hook`, `roadmap`, `transfer`, and `summary` carry structural duties the compiler
checks by role and are never randomized.

The mandatory teaching skeleton is untouched: every concept still gets an
explanation, an example, and its own quiz. **No learner receives a degraded
lesson** — at most they meet an idea as prose where another learner met it as an
analogy, and the planner had already judged both acceptable.

### Guards

- A swap into `image` is refused when the block is the last non-image
  explanation/example for one of its concepts, because image blocks never
  satisfy `validateConceptCoverage`.
- A swap that would push the writer brief past `WRITER_INSTRUCTION_MAX` is
  skipped rather than truncated.
- Blocks with no concept binding are never randomized.
- The rewritten plan is re-validated against the full compiler suite. **If
  anything fails, the planner's original plan is used and no assignment is
  recorded.** Structural integrity always outranks the experiment.

A swapped block also carries an appended form directive, because the planner
wrote its brief for the form it chose; without it the writer would produce
content against a mismatched instruction.

## Determinism

The seed is the lesson id. Lesson generation recompiles from the stored raw IR on
retry and checkpoint recovery (`loadOrCreatePlan`), so a fresh draw at that point
would split one learner across both arms of the same slot and corrupt the cell.
Assignment is a pure function of `(seed, factor, blockOrder)`.

## Enabling it

Off by default. The arm changes what a learner is taught, so it never switches on
implicitly.

```env
PRIMORIA_METHOD_ARMS=1
```

Unset or any other value leaves the planner's own choices untouched and records
no assignments.

## Evidence

One `plan.method_arm` learning event per (block, concept), written when the plan
is compiled — before the learner sees anything, so an arm can never be attributed
after its outcome is known. Event ids are deterministic, so repeated compiles
insert exactly once.

Payload carries `factor`, `role`, `block_order`, `planned`, and `delivered`.
Rows where `planned === delivered` are the control arm and **must stay in the
analysis**; without them a reader cannot separate "assigned control" from "never
eligible".

The row grain is `ownerId + lessonId + conceptId`, which is exactly the grain
`quiz.submit` already uses, so the join needs no schema change.

## Reading the result

`summarizeMethodOutcomes` (`apps/web/src/lib/analysis/method-outcomes.ts`) is
pure and takes rows, so it runs over a live query or a fixture. It counts only
cells carrying both an assignment and an outcome, and reports learners, cells,
questions, and accuracy per arm.

Two rules are enforced in the output rather than left to the reader:

- **The sample is learners, not questions.** One learner contributes several
  questions, so a question count flatters the sample.
- **A gap below `MIN_LEARNERS_PER_ARM` learners per arm is marked
  insufficient.** A large gap from a handful of learners is noise, and reporting
  it as a finding is how a team talks itself into a teaching change the data
  never supported.

The module reports counts and gaps. It does not run statistical inference, and a
gap it prints is not a significance claim.

## Limits

- **Immediate recall only.** The outcome is the end-of-lesson quiz, so this
  measures immediate performance, not retention or transfer. Spaced repetition
  remains future work; until a delayed probe exists, do not describe these
  results as learning gains.
- **Narrow factors.** The compiler's mandatory skeleton means the measurable
  question is "which optional form works better in this slot", not "explanation
  versus Socratic questioning". The skeleton would have to change to ask the
  broader question.
- **Per-block attribution is not available.** A concept is taught by several
  blocks; the outcome attaches to the concept, not to one block.

## Related

- `docs/long-horizon-learning-principles.md` — why method choice is the main line.
- `docs/issue-taxonomy-and-roadmap.md` — P0: Close the Adaptive Decision Loop.
- `docs/tutor-benchmark.md` — answer quality for the prompt-and-model layer, a
  separate concern from which teaching form helps.
