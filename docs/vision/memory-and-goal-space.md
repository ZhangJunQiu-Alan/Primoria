# Memory And Goal Space Vision

Status: unapproved future product direction, July 2026. Current learner-state
contracts remain defined by `docs/product-architecture.md` and
`docs/product/facts-intake.md`.

## Current baseline

Primoria currently has:

- onboarding goals and KG anchors;
- course and lesson state;
- rule-based concept mastery;
- six-category learner facts with evidence and learner correction;
- private progression projections;
- durable Tutor runs and checkpoints.

It does not have a hierarchical Goal object, Goal Memory, user-owned Agent
Memory, or cross-user System Memory.

## Future Goal Space

A Goal could become the smallest explicit scope container above courses:

```text
Goal: Become a full-stack engineer
├─ Sub-goal: Frontend foundations
│  ├─ Course: JavaScript
│  └─ Course: React
├─ Sub-goal: Backend foundations
│  ├─ Course: Node.js
│  └─ Course: Database design
└─ Project: Ship one full-stack application
```

The Goal would define scope, not a fixed sequence. Any implementation must define
cross-course mastery aggregation, sharing, ownership, deletion, and whether one
course may belong to multiple Goals.

## Future memory layers

| Layer | Question | Current status |
| --- | --- | --- |
| User Memory | Who is this learner across domains? | Partially represented by profile/facts/mastery |
| Goal Memory | How does this learner operate in one goal domain? | Not implemented |
| Course Memory | What should this course teach next? | Partially represented by course/KG/progress state |
| Agent Memory | When is a user-owned Agent effective? | Not implemented |
| System Memory | What works across users? | Not implemented |

Inactive Goal Memory should not enter active Tutor context. Any future memory
layer needs provenance, retention, correction, deletion, permission, and
evaluation contracts before persistence is added.

## Decision-space framing

Future planning can evaluate eight bounded spaces without turning them into new
services by default:

1. Knowledge: the prerequisite graph.
2. Goal: the active scope.
3. Learner state: mastery and durable context.
4. Method: the teaching strategy.
5. Agent: who or what executes the strategy.
6. Timing: when intervention is warranted.
7. Content: which reviewed artifact or constrained generation path is used.
8. Feedback: how observed behavior updates later decisions.

These are reasoning boundaries, not deployment boundaries. Primoria remains a
modular monolith plus unless measured team, scale, security, or deployment needs
justify extraction.
