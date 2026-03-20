---
name: production-readiness
description: Use when a feature, flow, migration, or product area needs to be brought to production-grade quality with strong coverage for reliability, operability, safety, and release readiness, not just functional completeness.
---

# Production Readiness

Use this skill when the user wants a project, feature, or migration to be launch-ready, enterprise-grade, or safe to ship in a real environment.

Do not confuse production readiness with "it works on my machine." Treat readiness as the combination of correctness, reliability, observability, rollback safety, data protection, performance, and maintainability.

## Trigger Conditions

Use this skill when any of the following is true:

- The user asks for production-ready, enterprise-grade, launch-ready, or big-company quality.
- A major feature or migration is nearing completion and needs hardening.
- The task affects critical workflows, persistence, auth, billing, content integrity, or user trust.
- A change introduces operational risk, rollout risk, or backward-compatibility concerns.
- You are about to claim that a change is "done" for real users.

## Readiness Dimensions

Review the work across these dimensions:

1. Functional integrity
   - Core behavior works as intended.
   - Edge cases and failure paths are covered.
2. Testing depth
   - Unit, integration, end-to-end, and regression coverage where appropriate.
   - Avoid relying on manual testing alone for critical behavior.
3. Observability
   - Logs, metrics, tracing, error reporting, and enough context to debug real failures.
4. Rollout safety
   - Safe migrations, compatibility checks, feature flags, staged rollout, or rollback path when relevant.
5. Data safety
   - Schema changes, persistence behavior, idempotency, autosave integrity, and recovery from partial failure.
6. Performance
   - Real and perceived performance, especially on critical paths.
   - Avoid regressions hidden behind correct behavior.
7. Security baseline
   - Secrets handling, authorization boundaries, input validation, and risky defaults.
8. Operational clarity
   - Build, deploy, CI, health checks, and ownership signals are understandable.
9. Maintainability
   - The implementation is structured clearly enough to survive future changes without becoming fragile.

## Working Rules

- Preserve user-visible functionality while hardening the system.
- Prefer shipping safety over cleverness.
- Explicitly identify what is proven versus what is assumed.
- If a missing safeguard is material, call it out instead of silently accepting the risk.
- If full hardening is too large for one pass, separate must-have release blockers from follow-up improvements.

## Required Output Format

When using this skill, structure the response like this:

### Readiness Assessment

- Briefly describe what is being prepared for release.
- State the highest-risk gaps.

### Release Blockers

- List issues that should be fixed before calling the work production-ready.
- Explain why each item is blocking.

### Hardening Priorities

- List the next most valuable improvements after blockers.
- Rank by impact, cost, and urgency.

### Verification Plan

- Functional checks
- Test coverage checks
- Observability checks
- Rollout or rollback checks
- Performance and failure-mode checks

### Ship Decision

- Ready to ship, conditionally ready, or not ready
- Confidence level
- Key assumptions still in play

## Default Heuristics

- Critical flows should be testable, observable, and reversible where feasible.
- Migrations should be safe to run more than once or clearly guarded.
- Error paths deserve as much design attention as happy paths.
- If recovery is impossible, prevention quality must be higher.
- If a claim cannot be verified, do not present it as proven.
- Production readiness is a system property, not a visual polish pass.

## Example Triggers

- "Take this feature to production-ready quality."
- "Before we launch this React migration, harden it."
- "Make sure this editor is safe to ship."
- "What is missing before this can be considered enterprise-grade?"
