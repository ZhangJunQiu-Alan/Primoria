# Primoria Long-Horizon Learning Principles

Primoria is not a one-shot course generator.
Its main line is a long-horizon learning system that observes progress over time, adapts teaching methods dynamically, and uses evidence to decide what to do next.

## Core Thesis

Learning is a long-run process.
A single session can help, but the product should optimize for repeated improvement across many sessions, not only for a polished one-time answer.

That means Primoria should:

- track what the learner is trying to achieve
- observe evidence of progress, confusion, recall, transfer, and fatigue
- choose a teaching method that fits the current state
- switch methods when the current one stops working
- keep a history so future decisions are better than the last one

## What "Dynamic Adjustment" Means

Dynamic adjustment is the system changing its teaching behavior based on evidence.

Examples:

- start with explanation when the concept is new
- switch to guided questions when the learner can reason but is unsure
- switch to practice when the learner needs retrieval and repetition
- switch to project work when the learner needs transfer
- switch to review when the learner is likely to forget

The important part is not the method itself.
The important part is choosing the right method at the right time.

## Teaching Methods As First-Class Strategy

Primoria should treat teaching methods as a real design object, not as presentation flavor.

Examples of methods:

- direct explanation
- Socratic questioning
- worked examples
- drill and retrieval practice
- assessment and diagnosis
- project-based application
- review and spaced repetition
- reflection and recap

Each method should have:

- when to use it
- what evidence triggers it
- what output it produces
- how to tell whether it worked

## Product Implications

This main line changes how the product should be built.

### 1. Track learner state over time

The system should remember more than the last prompt.
It should keep evidence about:

- goals
- weak concepts
- successful methods
- failed methods
- memory signals
- progress over sessions

### 2. Make method choice visible

The product should be able to answer:

- why this method now
- why not another method
- what changed since the last session

### 3. Keep external artifacts central

Primoria should coordinate through artifacts such as:

- plans
- tasks
- quizzes
- memory entries
- review notes
- session summaries

These artifacts are the evidence trail for long-horizon adaptation.

### 4. Support multiple surfaces

Different surfaces should serve the same learning loop:

- course views for structured progress
- future classroom/collaboration views for shared learning
- tutor views for teaching behavior and capability boundaries
- memory views for durable evidence
- review views for diagnosis and correction

## Canonical Loop

The core loop is:

1. set a goal
2. diagnose the current state
3. choose a teaching method
4. run a small learning step
5. collect evidence
6. update memory, plan, or next action
7. repeat

## Current Implementation Mapping (July 2026)

| Principle | Current implementation | Remaining gap |
| --- | --- | --- |
| Goal and cold start | Onboarding captures prior learning, desired learning, teaching preferences, tutor choice, and background | Make later goal changes and conflicts reviewable |
| Structured progress | Courses, lessons, blocks, generation decisions, and progress state are persisted | Improve recovery/resume and intervention explanations |
| Evidence | Quiz attempts, learning events, course edits, and Tutor conversations provide raw evidence | Normalize success criteria across teaching methods |
| Learner state | Concept mastery, learner profiles/facts, mastery jobs, and extractor jobs | Add learner-facing provenance, correction, and deletion controls |
| Method choice | Course blocks, quizzes, catalog interactions, structured artifacts, and sandbox widgets provide multiple teaching forms | Measure which method helped and route from that evidence |
| Repetition | Cross-session state is durable | Explicit spaced-repetition scheduling remains future work |

This mapping is the boundary between implemented infrastructure and product
direction. A principle is not considered complete merely because its table or
worker exists; the decision must improve the next learning step and leave
evidence that can be evaluated.

## Design Rules

- Prefer evidence over intuition.
- Prefer adaptive methods over fixed sequences.
- Prefer reusable learning state over one-off output.
- Prefer history that can be reviewed over invisible internal state.
- Prefer small corrective loops over large monolithic lessons.

## Non-Goals

Primoria is not only:

- a course builder
- a chat UI
- a quiz engine
- a static agent marketplace

Those are useful pieces, but they are subordinate to the long-horizon learning loop.

## How To Use This Document

When deciding what to build, ask:

- does this improve long-horizon learning?
- does this help the system adapt methods dynamically?
- does this preserve evidence for future decisions?
- does this make the learner better over time?

If the answer is no, the work is probably secondary.
