---
name: decision-gate
description: Use when a task has meaningful ambiguity, multiple valid implementation paths, or high-impact tradeoffs that should be surfaced as explicit options before proceeding.
---

# Decision Gate

Use this skill when the request is underspecified or when different implementation paths would materially change architecture, migration safety, maintenance cost, UX, delivery speed, or rollback risk.

Do not use this skill for low-risk details such as minor wording, simple styling, routine refactors, or other reversible changes where a reasonable default is enough.

## Trigger Conditions

Open a decision gate before acting when any of the following is true:

- There are 2 or more reasonable implementation paths.
- A choice affects data models, APIs, persistence, routing, build tooling, or test strategy.
- A change could break backward compatibility or require migration.
- The user asked for "best", "production-grade", "enterprise", or similar outcomes without locking the tradeoff priorities.
- You notice that your confidence is limited and a wrong assumption would be expensive to unwind.

## Decision Protocol

1. Separate facts from inference.
   - List what is confirmed from code, docs, or the user's request.
   - List what is inferred, assumed, or still unknown.
2. Decide whether the ambiguity is worth surfacing.
   - If the choice is low-risk and reversible, proceed with a reasonable default and mention the assumption briefly.
   - If the choice is high-impact, stop and present options before implementation.
3. Present 2 to 4 concrete options.
   - Keep options mutually distinct.
   - Avoid fake options where one is obviously broken.
4. Recommend one option.
   - State why it is the recommended path.
   - State what would make another option preferable.

## Required Output Format

When a decision gate is needed, use this structure:

### Confirmed Facts

- Facts grounded in the repository, screenshots, logs, or explicit user instructions.

### Uncertain Points

- Missing requirements, hidden assumptions, or places where confidence is limited.

### Options

For each option, include:

- What changes
- Pros
- Cons
- Implementation cost
- Migration or regression risk
- Long-term maintenance impact

### Recommendation

- Recommended option
- Why it is the best default
- Confidence level

### User Decision Needed

- Ask for a decision only if the tradeoff is material.
- If no decision is needed, say which option you chose and continue.

## Default Heuristics

- Prefer compatibility-preserving and migration-safe paths unless the user explicitly wants a clean break.
- Prefer simpler architecture over theoretical flexibility when both satisfy the requirement.
- Prefer options that improve UX, accessibility, performance, and observability without adding disproportionate complexity.
- If the user values "big-company quality", explicitly include testing, rollback, monitoring, and product polish in the tradeoff analysis.
- If you are more than mildly uncertain, say so plainly instead of masking it with confident language.

## Example Triggers

- "Migrate this Flutter app to React without losing functionality."
- "Redesign this editor to feel more premium."
- "Unify these two block types and remove legacy behavior."
- "Make this production-ready."
